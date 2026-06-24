from datetime import datetime
from typing import Any

from pydantic import BaseModel


class SourceBase(BaseModel):
    name: str
    type: str
    url: str | None = None
    onion_url: str | None = None
    description: str | None = None
    language: str = "en"
    requires_auth: bool = False
    auth_type: str | None = None
    is_onion: bool = False
    uses_tor: bool = False
    scrape_interval_minutes: int = 60
    tags: list[str] = []


class SourceCreate(SourceBase):
    credentials: dict[str, str] | None = None
    scraping_config: dict[str, Any] | None = None
    selectors: dict[str, str] | None = None


class SourceUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    url: str | None = None
    onion_url: str | None = None
    description: str | None = None
    requires_auth: bool | None = None
    is_active: bool | None = None
    scrape_interval_minutes: int | None = None
    tags: list[str] | None = None


class Source(SourceBase):
    id: int
    scraping_config: dict[str, Any] | None = {}
    selectors: dict[str, str] | None = {}
    reliability_score: float = 0.5
    last_scraped: datetime | None = None
    last_success: datetime | None = None
    scrape_failure_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SourceList(BaseModel):
    total: int
    sources: list[Source]


class SourceHealthResponse(BaseModel):
    source_id: int
    source_name: str
    status: str
    response_time_ms: int | None = None
    last_check: datetime
    error_message: str | None = None
