from datetime import datetime
from typing import Any

from pydantic import BaseModel


class LeakBase(BaseModel):
    title: str
    description: str | None = None
    victim_name: str | None = None
    victim_industry: str | None = None
    victim_country: str | None = None
    victim_website: str | None = None
    victim_size: str | None = None
    actor_name: str | None = None
    source_url: str | None = None
    status: str = "new"
    severity: str = "medium"
    confidence: float = 0.5
    data_types: list[str] = []
    data_size: str | None = None
    record_count: int | None = None
    published_date: datetime | None = None
    deadline_date: datetime | None = None
    asking_price: str | None = None
    currency: str | None = None
    tags: list[str] = []


class LeakCreate(LeakBase):
    source_id: int | None = None
    actor_id: int | None = None


class LeakUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    victim_name: str | None = None
    victim_industry: str | None = None
    victim_country: str | None = None
    status: str | None = None
    severity: str | None = None
    confidence: float | None = None
    is_verified: bool | None = None
    tags: list[str] | None = None


class Leak(LeakBase):
    id: int
    actor_id: int | None = None
    source_id: int | None = None
    screenshot_url: str | None = None
    extracted_iocs: list[str] = []
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeakList(BaseModel):
    total: int
    leaks: list[Leak]


class LeakStats(BaseModel):
    total_leaks: int
    new_today: int
    by_severity: dict[str, int]
    by_industry: dict[str, int]
    by_country: dict[str, int]
    top_actors: list[dict[str, Any]]
    recent_activity: list[Leak]
