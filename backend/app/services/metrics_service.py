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
        
    async def record_ttft(self, ttft_ms: float):
        await redis_client.lpush("metrics:ttft", ttft_ms)
        await redis_client.ltrim("metrics:ttft", 0, 499)

    async def record_generation_time(self, gen_time_ms: float):
        await redis_client.lpush("metrics:generation_time", gen_time_ms)
        await redis_client.ltrim("metrics:generation_time", 0, 499)

    async def record_redis_lookup_latency(self, latency_ms: float):
        await redis_client.lpush("metrics:redis_lookup", latency_ms)
        await redis_client.ltrim("metrics:redis_lookup", 0, 499)

    async def record_bm25_latency(self, latency_ms: float):
        await redis_client.lpush("metrics:bm25_latency", latency_ms)
        await redis_client.ltrim("metrics:bm25_latency", 0, 499)

    async def record_cache_store_latency(self, latency_ms: float):
        await redis_client.lpush("metrics:cache_store", latency_ms)
        await redis_client.ltrim("metrics:cache_store", 0, 499)

    async def reset_metrics(self):
        keys = await redis_client.keys("metrics:*")
        if keys:
            await redis_client.delete(*keys)

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

        ttft = await redis_client.lrange("metrics:ttft", 0, -1)
        generation_time = await redis_client.lrange("metrics:generation_time", 0, -1)
        redis_lookup = await redis_client.lrange("metrics:redis_lookup", 0, -1)
        bm25_latency = await redis_client.lrange("metrics:bm25_latency", 0, -1)
        cache_store = await redis_client.lrange("metrics:cache_store", 0, -1)

        def avg_l(l):
            return sum(float(x) for x in l) / len(l) if l else 0

        avg_latency_ms = avg_l(latencies)
        avg_latency_s = avg_latency_ms / 1000
        
        avg_ttft_ms = avg_l(ttft)
        avg_generation_time_ms = avg_l(generation_time)
        avg_redis_lookup_ms = avg_l(redis_lookup)
        avg_bm25_latency_ms = avg_l(bm25_latency)
        avg_cache_store_ms = avg_l(cache_store)

        hits = int(cache.get("hits", 0))
        misses = int(cache.get("misses", 0))
        total_cache_requests = hits + misses
        hit_rate = (hits / total_cache_requests) if total_cache_requests > 0 else 0

        input_tokens = int(tokens.get("input", 0))
        output_tokens = int(tokens.get("output", 0))
        total_tokens = input_tokens + output_tokens
        
        model_name = os.environ.get("DEPLOYMENT_NAME", "gpt-4")

        # Pricing based on GPT-4o approx ($5/1M input, $15/1M output)
        estimated_cost = (input_tokens / 1_000_000 * 5) + (output_tokens / 1_000_000 * 15)

        avg_index_time_s = sum(float(t) for t in index_times) / len(index_times) if index_times else 0

        accuracy_val = float(retrieval_accuracy) if retrieval_accuracy else None

        return {
            "average_latency_s": avg_latency_s,
            "cache_hits": hits,
            "cache_misses": misses,
            "cache_hit_rate": hit_rate,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "llm_calls": llm_calls,
            "requests": requests,
            "estimated_cost_usd": estimated_cost,
            "model_name": model_name,
            "average_ttft_ms": avg_ttft_ms,
            "average_generation_time_ms": avg_generation_time_ms,
            "average_redis_lookup_ms": avg_redis_lookup_ms,
            "average_bm25_latency_ms": avg_bm25_latency_ms,
            "average_cache_store_ms": avg_cache_store_ms,
            "average_index_time_s": avg_index_time_s,
            "retrieval_accuracy": accuracy_val,
            "failures": failures
        }

metrics_tracker = MetricsTracker()
