import os
import time
# 1 thread is not blocked per user request
from openai import AsyncOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

from dotenv import load_dotenv

openai_call_count = 0

class LLMProvider:
    def __init__(self):
        self.client = None

    def _get_client(self):
        load_dotenv(override=True)
        endpoint = os.environ.get("AZURE_ENDPOINT", "")
        token_provider_url = os.environ.get("AZURE_TOKEN_PROVIDER", "https://ai.azure.com/.default")
        
        if endpoint:
            token_provider = get_bearer_token_provider(DefaultAzureCredential(), token_provider_url)
            return AsyncOpenAI(
                base_url=endpoint,
                api_key=token_provider()
            )
        else:
            # Fallback to standard OpenAI. This will raise an error if OPENAI_API_KEY is not set.
            return AsyncOpenAI()

    async def generate_embedding(self, text: str) -> list[float]:
        """
        Generate an embedding for the given text using the specified embedding model.
        """
        client = self._get_client()
        model = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")
        try:
            response = await client.embeddings.create(input=text, model=model)
            return response.data[0].embedding
        except Exception as e:
            print(f"ERROR generating embedding: {e}")
            raise

    async def generate_stream(self, messages: list, options: list = None, user=None):
        """
        Generate a streaming response using AsyncOpenAI.
        Format of messages: [{"role": "user", "content": "..."}]
        """
        if options is None:
            options = []

        tools = []
        include = []
        if "web_search" in options:
            tools.append({"type": "web_search"})
            
        if "file_search" in options and user and user.vector_store_id:
            tools.append({
                "type": "file_search",
                "vector_store_ids": [user.vector_store_id]
            })
            include.append("file_search_call.results")

        if "github" in options:
            mcp_server_url = os.environ.get("GITHUB_MCP_SERVER_URL", "")
            if mcp_server_url:
                tools.append({
                    "type": "mcp",
                    "server_label": "github",
                    "server_description": "GitHub MCP server to manage repositories, branches, issues, and PRs.",
                    "server_url": mcp_server_url,
                    "require_approval": "never",
                    "authorization": f"{os.environ["GITHUB_PERSONAL_ACCESS_TOKEN"]}"
                })

        load_dotenv(override=True)
        deployment_name = os.environ.get("DEPLOYMENT_NAME", "gpt-4")
        
        kwargs = {
            "model": deployment_name,
            "input": messages,
            "stream": True
        }
        if tools:
            kwargs["tools"] = tools
        if include:
            kwargs["include"] = include

        try:
            client = self._get_client()
            start_time = time.time()
            
            global openai_call_count
            openai_call_count += 1
            
            stream = await client.responses.create(**kwargs)
            print(f"Successfully connected to Azure AI stream")
        except Exception as e:
            print(f"ERROR connecting to Azure AI: {e}")
            raise

        used_files = set()
        first_token_time = None

        async for chunk in stream:
            if chunk.type == "response.output_text.delta":
                if first_token_time is None:
                    first_token_time = time.time()
                yield chunk.delta
            
            try:
                # Attempt to extract from Pydantic model or dict
                chunk_dict = chunk.model_dump() if hasattr(chunk, "model_dump") else (chunk if isinstance(chunk, dict) else getattr(chunk, "__dict__", {}))
                
                def extract_filenames(data):
                    if isinstance(data, dict):
                        if "filename" in data and isinstance(data["filename"], str):
                            fname = data["filename"]
                            fdata = data.get('text', '')
                            if fname not in used_files:
                                used_files.add(fname)
                                print(f"Keys in data: {data.keys()}")
                                print(f"Score: {data.get('score', 'N/A')}")
                                print(f"Text snippet: {fdata[:200]}")
                                print(f"File used: {fname}")
                        for value in data.values():
                            extract_filenames(value)
                    elif isinstance(data, list):
                        for item in data:
                            extract_filenames(item)

                extract_filenames(chunk_dict)
            except Exception as e:
                print(f"Error extracting filenames: {e}")
                pass
        
        if used_files:
            yield "\n\nSources:\n" + "\n".join([f"- {fname}" for fname in used_files])

        total_time = time.time() - start_time
        ttft = (first_token_time - start_time) if first_token_time else total_time
        yield f"\n\n*(Latency: TTFT {ttft:.2f}s, Total {total_time:.2f}s)*"
