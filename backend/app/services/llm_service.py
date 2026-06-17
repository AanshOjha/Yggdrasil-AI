import os
# 1 thread is not blocked per user request
from openai import AsyncOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

class LLMProvider:
    def __init__(self):
        self.endpoint = os.environ.get("AZURE_ENDPOINT", "")
        self.token_provider_url = os.environ.get("AZURE_TOKEN_PROVIDER", "https://ai.azure.com/.default")
        self.deployment_name = os.environ.get("DEPLOYMENT_NAME", "gpt-4")
        
        if self.endpoint:
            self.token_provider = get_bearer_token_provider(DefaultAzureCredential(), self.token_provider_url)
        else:
            self.client = AsyncOpenAI() # Fallback to standard OpenAI if configured via standard env vars

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

        kwargs = {
            "model": self.deployment_name,
            "input": messages,
            "stream": True
        }
        if tools:
            kwargs["tools"] = tools

        if self.endpoint:
            # Instantiate the client per-request to evaluate the token_provider callable and get a fresh token string
            client = AsyncOpenAI(
                base_url=self.endpoint,
                api_key=self.token_provider()
            )
        else:
            client = self.client

        print(f"Calling client.responses.create with messages: {messages} and options: {options}")
        try:
            stream = await client.responses.create(**kwargs)
            print(f"Successfully connected to Azure AI stream")
        except Exception as e:
            print(f"ERROR connecting to Azure AI: {e}")
            raise

        async for chunk in stream:
            if chunk.type == "response.output_text.delta":
                yield chunk.delta
