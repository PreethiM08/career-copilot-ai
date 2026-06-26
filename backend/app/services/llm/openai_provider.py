from typing import AsyncIterator
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from app.core.config import settings
from app.services.llm.base import LLMProvider

class OpenAIProvider(LLMProvider):
    def __init__(self, model: str = "gpt-4o-mini"):
        self.llm = ChatOpenAI(
            model=model,
            api_key=settings.OPENAI_API_KEY,
            streaming=True,
        )

    def _convert(self, messages: list[dict]):
        role_map = {"user": HumanMessage, "assistant": AIMessage, "system": SystemMessage}
        return [role_map[m["role"]](content=m["content"]) for m in messages]

    async def stream(self, messages: list[dict]) -> AsyncIterator[str]:
        lc_messages = self._convert(messages)
        async for chunk in self.llm.astream(lc_messages):
            if chunk.content:
                yield chunk.content