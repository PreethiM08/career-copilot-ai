from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    content: str
    conversation_id: Optional[int] = None
    model: str = "gpt-4o-mini"

class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    model_used: Optional[str] = None

    class Config:
        from_attributes = True

class ConversationOut(BaseModel):
    id: int
    title: str

    class Config:
        from_attributes = True