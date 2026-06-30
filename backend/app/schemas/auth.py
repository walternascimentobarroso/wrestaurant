from typing import Literal

from pydantic import BaseModel, Field


class ActionResult(BaseModel):
    ok: bool
    error: str | None = None


class MessageResponse(BaseModel):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class LoginRequest(BaseModel):
    password: str = Field(min_length=1)
