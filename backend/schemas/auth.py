from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, EmailStr


class UserRole(StrEnum):
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None


class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str | None = None
    role: UserRole = UserRole.VIEWER


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    role: UserRole | None = None
    alert_keywords: list[str] | None = None
    alert_sources: list[int] | None = None
    alert_iocs: list[int] | None = None
    notification_preferences: dict[str, Any] | None = None


class UserInDB(UserBase):
    id: int
    is_active: bool
    is_verified: bool
    last_login: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class User(UserInDB):
    pass


class LoginRequest(BaseModel):
    username: str
    password: str


class AlertBase(BaseModel):
    alert_type: str
    title: str
    description: str | None = None
    severity: str = "medium"
    confidence: float = 0.5


class AlertCreate(AlertBase):
    user_id: int | None = None
    source_id: int | None = None
    source_name: str | None = None
    entity_type: str | None = None
    entity_id: int | None = None
    entity_value: str | None = None
    matched_keywords: list[str] | None = None
    meta_data: dict[str, Any] | None = None


class AlertUpdate(BaseModel):
    is_read: bool | None = None
    is_dismissed: bool | None = None


class Alert(AlertBase):
    id: int
    user_id: int | None = None
    source_id: int | None = None
    source_name: str | None = None
    entity_type: str | None = None
    entity_id: int | None = None
    entity_value: str | None = None
    matched_keywords: list[str] | None = []
    meta_data: dict[str, Any] | None = {}
    is_read: bool
    is_dismissed: bool
    created_at: datetime
    read_at: datetime | None = None

    class Config:
        from_attributes = True


class AlertResponse(BaseModel):
    total: int
    unread: int
    alerts: list[Alert]
