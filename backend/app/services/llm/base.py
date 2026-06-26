from abc import ABC, abstractmethod
from typing import AsyncIterator

class LLMProvider(ABC):
    """Common interface every model provider must implement."""

    @abstractmethod
    async def stream(self, messages: list[dict]) -> AsyncIterator[str]:
        """
        messages: list of {"role": "user"|"assistant", "content": str}
        Yields: response text chunks as they arrive from the model.
        """
        ...