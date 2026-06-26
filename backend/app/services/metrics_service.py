import os
import redis.asyncio as redis

redis_host = os.environ.get("REDIS_HOST", "localhost")
redis_port = int(os.environ.get("REDIS_PORT", 6379))
redis_client = redis.Redis(host=redis_host, port=redis_port, db=0, decode_responses=True)

class MetricsTracker:
    # 1. Latency (store last 500 requests)
    async def record_latency(self, latency_ms: float):
        await redis_client.lpush("metrics:latencies", latency_ms)
        await redis_client.ltrim("metrics:latencies", 0, 499)

    # 2 & 3. Cache hits, misses (implicitly avoids LLM calls)
    async def record_cache_hit(self):
        await redis_client.hincrby("metrics:cache", "hits", 1)

    async def record_cache_miss(self):
        await redis_client.hincrby("metrics:cache", "misses", 1)
        await redis_client.incr("metrics:llm_calls")

    # 4. Token cost (track tokens)
    async def record_tokens(self, input_tokens: int, output_tokens: int):
        if input_tokens > 0:
            await redis_client.hincrby("metrics:tokens", "input", input_tokens)
        if output_tokens > 0:
            await redis_client.hincrby("metrics:tokens", "output", output_tokens)

    # 5. Document indexing time
    async def record_index_time(self, index_time: float):
        await redis_client.lpush("metrics:index_times", index_time)
        await redis_client.ltrim("metrics:index_times", 0, 99)

    # 6. Retrieval accuracy (User script will update this manually via an endpoint)
    async def record_retrieval_accuracy(self, accuracy: float):
        await redis_client.set("metrics:retrieval_accuracy", accuracy)

    # 7. Failure rate
    async def record_failure(self):
        await redis_client.incr("metrics:failures")
        
    async def record_request(self):
        await redis_client.incr("metrics:requests")

    async def get_dashboard_stats(self):
        # Fetch data
        latencies = await redis_client.lrange("metrics:latencies", 0, -1)
        cache = await redis_client.hgetall("metrics:cache")
        llm_calls = int(await redis_client.get("metrics:llm_calls") or 0)
        requests = int(await redis_client.get("metrics:requests") or 0)
        tokens = await redis_client.hgetall("metrics:tokens")
        index_times = await redis_client.lrange("metrics:index_times", 0, -1)
        retrieval_accuracy = await redis_client.get("metrics:retrieval_accuracy")
        failures = int(await redis_client.get("metrics:failures") or 0)

        # Calculate averages and stats
        avg_latency_ms = sum(float(l) for l in latencies) / len(latencies) if latencies else 0
        avg_latency_s = avg_latency_ms / 1000

        hits = int(cache.get("hits", 0))
        misses = int(cache.get("misses", 0))
        total_cache_requests = hits + misses
        hit_rate = (hits / total_cache_requests) if total_cache_requests > 0 else 0

        input_tokens = int(tokens.get("input", 0))
        output_tokens = int(tokens.get("output", 0))
        total_tokens = input_tokens + output_tokens
        avg_tokens = total_tokens // requests if requests > 0 else 0

        # Pricing based on GPT-4o approx ($5/1M input, $15/1M output)
        estimated_cost = (input_tokens / 1_000_000 * 5) + (output_tokens / 1_000_000 * 15)

        avg_index_time_s = sum(float(t) for t in index_times) / len(index_times) if index_times else 0

        accuracy_val = float(retrieval_accuracy) if retrieval_accuracy else None

        return {
            "average_latency_s": avg_latency_s,
            "cache_hit_rate": hit_rate,
            "average_tokens": avg_tokens,
            "llm_calls": llm_calls,
            "requests": requests,
            "estimated_cost_usd": estimated_cost,
            "average_index_time_s": avg_index_time_s,
            "retrieval_accuracy": accuracy_val,
            "failures": failures
        }

metrics_tracker = MetricsTracker()
