from openai import OpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from python_dotenv import load_dotenv
import os
load_dotenv()

endpoint = os.environ.get("AZUREE_ENDPOINT")
token_provider = get_bearer_token_provider(DefaultAzureCredential(), os.environ.get("AZURE_TOKEN_PROVIDER"))

client = OpenAI(
    base_url=endpoint,
    api_key=token_provider
)

DEPLOYMENT_NAME = os.environ.get("DEPLOYMENT_NAME")

response = client.responses.create(
    model=DEPLOYMENT_NAME,
    input="",
)

print(response.output_text)