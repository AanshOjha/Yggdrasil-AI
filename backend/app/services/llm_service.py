import os
# 1 thread is not blocked per user request
from openai import AsyncOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

from dotenv import load_dotenv

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

    async def generate_stream(self, messages: list, options: list = None):
        """
        Generate a streaming response using AsyncOpenAI.
        Format of messages: [{"role": "user", "content": "..."}]
        """
        if options is None:
            options = []

        tools = []
        if "web_search" in options:
            tools.append({"type": "web_search"})

        load_dotenv(override=True)
        deployment_name = os.environ.get("DEPLOYMENT_NAME", "gpt-4")
        
        kwargs = {
            "model": deployment_name,
            "input": messages,
            "stream": True
        }
        if tools:
            kwargs["tools"] = tools

        try:
            client = self._get_client()
            stream = await client.responses.create(**kwargs)
            print(f"Successfully connected to Azure AI stream")
        except Exception as e:
            print(f"ERROR connecting to Azure AI: {e}")
            raise


        async for chunk in stream:
            if chunk.type == "response.output_text.delta":
                yield chunk.delta
