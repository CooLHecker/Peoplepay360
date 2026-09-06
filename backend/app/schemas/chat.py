from typing import Literal

from pydantic import BaseModel, Field

ChatRole = Literal["user", "bot"]


class ChatHistoryMessage(BaseModel):
    """One previous turn, in the same shape the frontend already keeps
    its message list in ("bot" for the assistant, "user" for the
    employee) — so the frontend can pass its existing state straight
    through without reshaping it."""

    from_: ChatRole = Field(alias="from")
    text: str = Field(max_length=2000)

    model_config = {"populate_by_name": True}


class ChatAskRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    # Prior turns for conversational follow-ups (e.g. "and sick leave?").
    # Capped well below Gemini's context limits — this is a short HR
    # Q&A widget, not a long-running conversation.
    history: list[ChatHistoryMessage] = Field(default_factory=list, max_length=20)


class ChatAskResponse(BaseModel):
    reply: str
