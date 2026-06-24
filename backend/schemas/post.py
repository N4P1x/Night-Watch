from datetime import datetime
from typing import Any

from pydantic import BaseModel


class PostBase(BaseModel):
    external_id: str | None = None
    title: str | None = None
    content: str | None = None
    author_username: str | None = None
    author_id: str | None = None
    language: str = "en"
    sentiment: str | None = None
    post_type: str | None = None
    category: str | None = None


class PostCreate(PostBase):
    source_id: int | None = None
    actor_id: int | None = None
    posted_at: datetime | None = None


class PostUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    sentiment: str | None = None
    category: str | None = None
    is_flagged: bool | None = None
    extracted_iocs: list[str] | None = None
    extracted_entities: dict[str, Any] | None = None
    keywords: list[str] | None = None


class Post(PostBase):
    id: int
    source_id: int | None = None
    actor_id: int | None = None
    content_hash: str
    upvotes: int = 0
    replies: int = 0
    views: int = 0
    extracted_iocs: list[str] = []
    extracted_entities: dict[str, Any] = {}
    keywords: list[str] = []
    is_verified: bool = False
    is_flagged: bool = False
    posted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PostList(BaseModel):
    total: int
    posts: list[Post]


class RawData(BaseModel):
    id: str | None = None
    source_id: int
    source_name: str
    content_type: str
    title: str | None = None
    url: str
    raw_content: str
    cleaned_content: str | None = None
    content_hash: str
    author: str | None = None
    language: str = "en"
    entities: dict[str, Any] = {}
    iocs: list[dict[str, Any]] = []
    keywords: list[str] = []
    classification: str = "unknown"
    collected_at: datetime
    processed_at: datetime | None = None

    class Config:
        from_attributes = True
