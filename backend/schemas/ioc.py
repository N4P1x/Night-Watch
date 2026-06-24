from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class IOCBase(BaseModel):
    type: str = Field(..., min_length=1, max_length=50)
    value: str = Field(..., min_length=1, max_length=2000)
    source_name: str | None = Field(default="manual", max_length=255)
    confidence: float | None = Field(default=0.5, ge=0.0, le=1.0)
    context: str | None = Field(default=None, max_length=5000)
    tags: list[str] = Field(default_factory=list)
    meta_data: dict[str, Any] = Field(default_factory=dict)

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        valid_types = [
            "ip",
            "domain",
            "url",
            "email",
            "cve",
            "hash",
            "crypto_wallet",
            "file_hash",
            "onion_url",
            "file",
        ]
        if v.lower() not in valid_types:
            raise ValueError(
                f"Invalid IOC type. Must be one of: {', '.join(valid_types)}"
            )
        return v.lower()

    @field_validator("value")
    @classmethod
    def validate_value(cls, v):
        if len(v.strip()) == 0:
            raise ValueError("IOC value cannot be empty")
        return v.strip()


class IOCCreate(IOCBase):
    actor_id: int | None = Field(default=None, gt=0)
    leak_id: int | None = Field(default=None, gt=0)
    source_id: int | None = Field(default=None, gt=0)
    is_whitelisted: bool = False
    is_verified: bool = False
    is_active: bool = True


class IOCUpdate(BaseModel):
    context: str | None = None
    tags: list[str] | None = None
    meta_data: dict[str, Any] | None = None
    is_whitelisted: bool | None = None
    is_verified: bool | None = None
    is_active: bool | None = None


class IOC(IOCBase):
    id: int
    actor_id: int | None = None
    leak_id: int | None = None
    source_id: int | None = None
    first_seen: datetime
    last_seen: datetime
    threat_score: float = 0.0
    false_positive_rate: float = 0.0
    is_whitelisted: bool = False
    is_verified: bool = False
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IOCList(BaseModel):
    total: int
    iocs: list[IOC]


class IOCStats(BaseModel):
    total_iocs: int
    by_type: dict[str, int]
    recent_count: int
    high_threat_count: int


class IOCBulkCreate(BaseModel):
    iocs: list[IOCCreate]
