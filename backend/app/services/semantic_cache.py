import os
import struct
import json
import time
import redis.asyncio as redis
from redis.commands.search.field import VectorField, TextField, NumericField
from redis.commands.search.index_definition import IndexDefinition, IndexType
from redis.commands.search.query import Query
from redis.exceptions import ResponseError

from app.services.llm_service import LLMProvider

# Initialize Redis client
redis_host = os.environ.get("REDIS_HOST", "localhost")
redis_port = int(os.environ.get("REDIS_PORT", 6379))
redis_client = redis.Redis(host=redis_host, port=redis_port, db=0, decode_responses=False)

INDEX_NAME = "idx:semantic_cache"
PREFIX = "cache:"
VECTOR_DIM = 1536  # Default dimension for text-embedding-3-small

async def _ensure_index():
    """Ensure that the RediSearch index exists for the semantic cache."""
    try:
        await redis_client.ft(INDEX_NAME).info()
    except ResponseError:
        # Index does not exist, create it
        schema = (
            TextField("prompt"),
            TextField("response"),
            TextField("model_name"),
            NumericField("timestamp"),
            VectorField("embedding", "FLAT", {
                "TYPE": "FLOAT32",
                "DIM": VECTOR_DIM,
                "DISTANCE_METRIC": "COSINE"
            })
        )
        definition = IndexDefinition(prefix=[PREFIX], index_type=IndexType.HASH)
        try:
            await redis_client.ft(INDEX_NAME).create_index(fields=schema, definition=definition)
            print(f"Created Redis index {INDEX_NAME}")
        except Exception as e:
            print(f"Failed to create Redis index: {e}")

def rerank_with_bm25(query: str, docs: list) -> list:
    """Simple BM25 implementation using rank_bm25 library."""
    if not docs:
        return []
        
    try:
        from rank_bm25 import BM25Okapi
    except ImportError:
        print("Please install rank_bm25: pip install rank-bm25")
        return [0.0] * len(docs)
        
    # Tokenize query and docs by splitting on whitespace
    query_tokens = query.lower().split()
    tokenized_docs = [doc.lower().split() for doc in docs]
    
    # Initialize BM25 and get scores
    bm25 = BM25Okapi(tokenized_docs)
    scores = bm25.get_scores(query_tokens)
    
    # Normalize scores between 0 and 1 to mesh with vector similarity
    max_s = max(scores) if len(scores) > 0 else 0
    if max_s > 0:
        return [float(s / max_s) for s in scores]
    return [float(s) for s in scores]

async def check(prompt_text: str, threshold: float = 0.87) -> str | None:
    """
    Check if a semantically similar prompt exists in the cache.
    Uses a 2-stage reranking: Vector Search (top 5) -> BM25 Lexical Scoring.
    Returns the cached response if embedding similarity > threshold AND BM25 score is high enough.
    """
    try:
        await _ensure_index()
        
        # 1. Generate embedding for the prompt
        llm_provider = LLMProvider()
        embedding = await llm_provider.generate_embedding(prompt_text)
        
        # Convert float list to raw bytes for Redis
        embedding_bytes = struct.pack('%sf' % len(embedding), *embedding)
        
        # 2. Query Redis for top 5 similar vectors
        query = (
            Query("(*)=>[KNN 5 @embedding $vec AS score]")
            .sort_by("score")
            .return_fields("score", "response", "prompt")
            .dialect(2)
        )
        
        query_params = {"vec": embedding_bytes}
        
        lookup_start = time.time()
        result = await redis_client.ft(INDEX_NAME).search(query, query_params)
        lookup_ms = (time.time() - lookup_start) * 1000
        
        from app.services.metrics_service import metrics_tracker
        await metrics_tracker.record_redis_lookup_latency(lookup_ms)
        
        best_match_response = None
        best_final_score = 0.0
        
        # 3. Process results and rerank with BM25
        if result.docs:
            bm25_start = time.time()
            
            # Extract prompts for BM25 corpus
            doc_prompts = []
            for doc in result.docs:
                dp = doc.prompt
                if isinstance(dp, bytes): dp = dp.decode('utf-8')
                doc_prompts.append(dp)
                
            bm25_scores = rerank_with_bm25(prompt_text, doc_prompts)
            
            for idx, doc in enumerate(result.docs):
                distance = float(doc.score)
                vector_sim = 1.0 - distance
                bm25_sim = bm25_scores[idx]
                
                final_score = 0.75 * vector_sim + 0.25 * bm25_sim
                
                print(f"Candidate - Vector Sim: {vector_sim:.4f}, BM25 Sim: {bm25_sim:.4f}, Final: {final_score:.4f}")
                
                # Check thresholds (tune as needed: vector > 0.92, BM25 > 0.3)
                if vector_sim >= threshold and bm25_sim >= 0.3:
                    if final_score > best_final_score:
                        best_final_score = final_score
                        
                        response_val = doc.response
                        if isinstance(response_val, bytes):
                            response_val = response_val.decode('utf-8')
                        best_match_response = response_val
            
            bm25_ms = (time.time() - bm25_start) * 1000
            await metrics_tracker.record_bm25_latency(bm25_ms)
                        
        if best_match_response:
            print(f"Semantic cache hit! Final Reranked Score: {best_final_score:.4f}")
            
            from app.services.metrics_service import metrics_tracker
            await metrics_tracker.record_cache_hit()
            
            return best_match_response
            
        print("Semantic cache miss.")
        
        from app.services.metrics_service import metrics_tracker
        await metrics_tracker.record_cache_miss()
        
        return None
        
    except Exception as e:
        print(f"Redis cache check failed (falling back to normal flow): {e}")
        from app.services.metrics_service import metrics_tracker
        await metrics_tracker.record_failure()
        return None

async def store(prompt_text: str, response_text: str, model_name: str):
    """
    Store the prompt, response, and its embedding in the Redis cache.
    """
    try:
        await _ensure_index()
        
        llm_provider = LLMProvider()
        embedding = await llm_provider.generate_embedding(prompt_text)
        
        embedding_bytes = struct.pack('%sf' % len(embedding), *embedding)
        
        # Create a unique key
        key = f"{PREFIX}{time.time_ns()}"
        
        # Store in Redis Hash
        mapping = {
            "prompt": prompt_text.encode('utf-8'),
            "response": response_text.encode('utf-8'),
            "model_name": model_name.encode('utf-8'),
            "timestamp": int(time.time()),
            "embedding": embedding_bytes
        }
        
        store_start = time.time()
        await redis_client.hset(key, mapping=mapping)
        store_ms = (time.time() - store_start) * 1000
        
        from app.services.metrics_service import metrics_tracker
        await metrics_tracker.record_cache_store_latency(store_ms)
        
        print(f"Stored response in semantic cache with key {key}")
        
    except Exception as e:
        print(f"Failed to store in semantic cache: {e}")
        from app.services.metrics_service import metrics_tracker
        await metrics_tracker.record_failure()
