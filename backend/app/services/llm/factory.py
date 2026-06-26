from app.services.llm.base import LLMProvider
from app.services.llm.openai_provider import OpenAIProvider
from app.services.llm.gemini_provider import GeminiProvider

PROVIDER_MAP = {
    "gpt-4o-mini": OpenAIProvider,
    "gpt-4o": OpenAIProvider,
    "gemini-3.5-flash": GeminiProvider,
    "gemini-3.5-pro-preview": GeminiProvider,
}

def get_provider(model_name: str) -> LLMProvider:
    provider_cls = PROVIDER_MAP.get(model_name)
    if provider_cls is None:
        raise ValueError(f"Unsupported model: {model_name}")
    return provider_cls(model=model_name)