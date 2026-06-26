import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from app.db.database import get_db
from app.db.models import Conversation, Message, User
from app.schemas.chat import ChatRequest
from app.api.deps import get_current_user
from app.services.llm.factory import get_provider

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/stream")
async def stream_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Get or create the conversation
    if payload.conversation_id:
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id == payload.conversation_id,
                Conversation.owner_id == current_user.id,
            )
            .first()
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(owner_id=current_user.id, title=payload.content[:50])
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # 2. Save the user's message immediately
    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=payload.content,
    )
    db.add(user_message)
    db.commit()

    # 3. Build full message history for context
    history = (
        db.query(Message)
        .filter(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
        .all()
    )
    lc_input = [{"role": m.role, "content": m.content} for m in history]

    # 4. Pick the provider
    try:
        provider = get_provider(payload.model)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 5. Stream back, accumulating the full reply to save after
    async def event_generator():
        full_reply = ""
        yield {"event": "conversation_id", "data": str(conversation.id)}

        async for chunk in provider.stream(lc_input):
            full_reply += chunk
            yield {"event": "token", "data": json.dumps({"content": chunk})}

        assistant_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=full_reply,
            model_used=payload.model,
        )
        db.add(assistant_message)
        db.commit()

        yield {"event": "done", "data": "[DONE]"}

    return EventSourceResponse(event_generator())