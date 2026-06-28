import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse


from app.db.database import get_db
from app.db.models import Conversation, Message, User
from app.schemas.chat import ChatRequest, ConversationListItem, MessageOut
from app.api.deps import get_current_user
from app.services.llm.factory import get_provider

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("/conversations", response_model=list[ConversationListItem])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversations = (
        db.query(Conversation)
        .filter(Conversation.owner_id == current_user.id)
        .order_by(Conversation.created_at.desc())
        .all()
    )
    return conversations


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def get_conversation_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.owner_id == current_user.id)
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return messages


@router.post("/stream")
async def stream_chat(
    payload: ChatRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_new_conversation = False

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
        conversation = Conversation(owner_id=current_user.id, title="New Conversation")
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        is_new_conversation = True

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

    conversation_id = conversation.id  # capture before generator runs (db session may close)

    # 5. Stream back, accumulating the full reply to save + title after
    async def event_generator():
        full_reply = ""
        new_title = None
        was_stopped = False
        try:
            yield {"event": "conversation_id", "data": str(conversation_id)}

            async for chunk in provider.stream(lc_input):
                if await request.is_disconnected():
                    was_stopped = True
                    break
                full_reply += chunk
                yield {"event": "token", "data": json.dumps({"content": chunk})}
        finally:
            if full_reply:
                assistant_message = Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_reply,
                    model_used=payload.model,
                )
                db.add(assistant_message)
                db.commit()

            if is_new_conversation:
                new_title = payload.content[:50]
                try:
                    title_provider = get_provider("openai/gpt-oss-120b")
                    title_prompt = [{
                        "role": "user",
                        "content": (
                            "Generate a short 3-6 word title (no quotes, no punctuation, "
                            "no trailing period) summarizing this conversation:\n\n"
                            f"User: {payload.content}\nAssistant: {full_reply[:300]}"
                        ),
                    }]
                    generated = ""
                    async for t_chunk in title_provider.stream(title_prompt):
                        generated += t_chunk
                    generated = generated.strip().strip('"').strip()
                    if generated:
                        new_title = generated[:60]
                except Exception as e:
                     print(f"TITLE GENERATION FAILED: {type(e).__name__}: {e}")

                conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
                if conv:
                    conv.title = new_title
                    db.commit()

        if not was_stopped:
            try:
                if is_new_conversation and new_title:
                    yield {"event": "title", "data": new_title}
                yield {"event": "done", "data": "[DONE]"}
            except Exception:
                pass
    
    return EventSourceResponse(event_generator())