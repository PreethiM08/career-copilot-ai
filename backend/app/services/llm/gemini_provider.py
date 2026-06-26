from typing import AsyncIterator
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from app.core.config import settings
from app.services.llm.base import LLMProvider

class GeminiProvider(LLMProvider):
    def __init__(self, model: str = "gemini-3.5-flash"):
        self.llm = ChatGoogleGenerativeAI(
            model=model,
            google_api_key=settings.GOOGLE_API_KEY,
        )

    def _convert(self, messages: list[dict]):
        role_map = {"user": HumanMessage, "assistant": AIMessage, "system": SystemMessage}
        return [role_map[m["role"]](content=m["content"]) for m in messages]

    async def stream(self, messages: list[dict]) -> AsyncIterator[str]:
        lc_messages = self._convert(messages)
        async for chunk in self.llm.astream(lc_messages):
            if chunk.content:
                yield chunk.content