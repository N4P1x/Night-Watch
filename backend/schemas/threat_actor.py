from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ThreatActorBase(BaseModel):
    name: str
    aliases: list[str] = []
    description: str | None = None
    motivation: str | None = None
    sophistication: str | None = None
    resource_level: str | None = None
    primary_languages: list[str] = []
    target_industries: list[str] = []
    target_regions: list[str] = []
    ttps: list[str] = []
    associated_malware: list[str] = []
    associated_tools: list[str] = []
    associated_ransomware: list[str] = []
    tags: list[str] = []
    notes: str | None = None


class ThreatActorCreate(ThreatActorBase):
    pass


class ThreatActorUpdate(BaseModel):
    aliases: list[str] | None = None
    description: str | None = None
    motivation: str | None = None
    sophistication: str | None = None
    resource_level: str | None = None
    primary_languages: list[str] | None = None
    target_industries: list[str] | None = None
    target_regions: list[str] | None = None
    ttps: list[str] | None = None
    associated_malware: list[str] | None = None
    associated_tools: list[str] | None = None
    associated_ransomware: list[str] | None = None
    tags: list[str] | None = None
    notes: str | None = None
    is_active: bool | None = None


class ThreatActor(ThreatActorBase):
    id: int
    attribution_score: float = 0.0
    threat_score: float = 0.0
    risk_level: str = "low"
    first_seen: datetime
    last_activity: datetime
    contact_info: dict[str, Any] = {}
    infrastructure_ips: list[str] = []
    infrastructure_domains: list[str] = []
    wallet_addresses: list[str] = []
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ThreatActorList(BaseModel):
    total: int
    actors: list[ThreatActor]


class ThreatActorStats(BaseModel):
    total_actors: int
    active_actors: int
    by_risk_level: dict[str, int]
    top_actors: list[dict[str, Any]]
    recent_activity: int
