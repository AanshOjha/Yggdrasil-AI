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

async def check(prompt_text: str, threshold: float = 0.85) -> str | None:
    """
    Check if a semantically similar prompt exists in the cache.
    Returns the cached response if similarity > threshold, else None.
    """
    try:
        await _ensure_index()
        
        # 1. Generate embedding for the prompt
        llm_provider = LLMProvider()
        embedding = await llm_provider.generate_embedding(prompt_text)
        
        # Convert float list to raw bytes for Redis
        embedding_bytes = struct.pack('%sf' % len(embedding), *embedding)
        
        # 2. Query Redis for similar vectors
        # Using KNN vector search to find the nearest neighbor
        query = (
            Query("(*)=>[KNN 1 @embedding $vec AS score]")
            .sort_by("score")
            .return_fields("score", "response")
            .dialect(2)
        )
        
        query_params = {"vec": embedding_bytes}
        result = await redis_client.ft(INDEX_NAME).search(query, query_params)
        
        # 3. Process result
        if result.docs:
            doc = result.docs[0]
            # RediSearch returns distances for COSINE, so similarity = 1 - distance
            # Wait, COSINE distance in Redis: 0 means exactly the same, 2 means completely opposite.
            # So a distance of 0.1 means 0.9 similarity.
            distance = float(doc.score)
            similarity = 1.0 - distance
            
            if similarity >= threshold:
                print(f"Semantic cache hit! Similarity: {similarity:.4f}")
                # Ensure the response is decoded from bytes if needed
                response_val = doc.response
                if isinstance(response_val, bytes):
                    response_val = response_val.decode('utf-8')
                return response_val
            
        print("Semantic cache miss.")
        return None
        
    except Exception as e:
        print(f"Redis cache check failed (falling back to normal flow): {e}")
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
        
        await redis_client.hset(key, mapping=mapping)
        print(f"Stored response in semantic cache with key {key}")
        
    except Exception as e:
        print(f"Failed to store in semantic cache: {e}")
