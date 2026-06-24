import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any


class SourceType(StrEnum):
    TOR_ONION = "tor_onion"
    CLEARNET = "clearnet"
    RSS = "rss"
    PASTE_SITE = "paste_site"
    TELEGRAM = "telegram"
    API_FEED = "api_feed"
    FORUM = "forum"


class ContentCategory(StrEnum):
    RANSOMWARE_LEAK = "ransomware_leak"
    DATA_BREACH = "data_breach"
    CREDENTIAL_DUMP = "credential_dump"
    EXPLOIT_SALE = "exploit_sale"
    HACKING_SERVICE = "hacking_service"
    MARKETPLACE = "marketplace"
    FORUM_POST = "forum_post"
    NEWS = "news"
    GENERAL = "general"


class SeverityLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ScrapedIOC:
    type: str
    value: str
    source_name: str = "scraper"
    source_url: str = ""
    context: str | None = ""
    confidence: float = 0.5
    tags: list[str] = field(default_factory=list)
    first_seen: datetime | None = None
    meta_data: dict[str, Any] = field(default_factory=dict)

    @property
    def fingerprint(self) -> str:
        return hashlib.sha256(f"{self.type}:{self.value.lower().strip()}".encode()).hexdigest()[:16]


@dataclass
class ScrapedLeak:
    title: str
    source_url: str
    severity: str = "medium"
    description: str | None = None
    victim_name: str | None = None
    actor_name: str | None = None
    data_types: list[str] = field(default_factory=list)
    record_count: int | None = None
    published_date: datetime | None = None
    tags: list[str] = field(default_factory=list)
    confidence: float = 0.5
    meta_data: dict[str, Any] = field(default_factory=dict)


@dataclass
class ScrapeMetrics:
    total_urls: int = 0
    scraped: int = 0
    successful: int = 0
    failed: int = 0
    total_iocs: int = 0
    total_leaks: int = 0
    avg_response_time_ms: float = 0.0
    uptime_seconds: float = 0.0
    started_at: datetime | None = None
    completed_at: datetime | None = None
    errors: list[str] = field(default_factory=list)

    @property
    def success_rate(self) -> float:
        return (self.successful / self.scraped * 100) if self.scraped > 0 else 0.0

    @property
    def is_running(self) -> bool:
        return self.started_at is not None and self.completed_at is None

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_urls": self.total_urls,
            "scraped": self.scraped,
            "successful": self.successful,
            "failed": self.failed,
            "success_rate": round(self.success_rate, 1),
            "total_iocs": self.total_iocs,
            "total_leaks": self.total_leaks,
            "avg_response_time_ms": round(self.avg_response_time_ms, 1),
            "uptime_seconds": round(self.uptime_seconds, 1),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "is_running": self.is_running,
            "recent_errors": self.errors[-10:],
        }


@dataclass
class ScrapeResult:
    url: str
    source_id: int
    source_type: SourceType = SourceType.TOR_ONION
    success: bool = False
    content: str | None = None
    text_content: str | None = None
    title: str | None = None
    iocs: list[ScrapedIOC] = field(default_factory=list)
    leaks: list[ScrapedLeak] = field(default_factory=list)
    category: ContentCategory = ContentCategory.GENERAL
    severity: SeverityLevel = SeverityLevel.MEDIUM
    response_time_ms: float = 0.0
    status_code: int | None = None
    content_hash: str | None = None
    error: str | None = None
    meta_data: dict[str, Any] = field(default_factory=dict)
    scraped_at: datetime | None = None

    def __post_init__(self):
        if self.scraped_at is None:
            self.scraped_at = datetime.now(UTC)
        if self.content and not self.content_hash:
            self.content_hash = hashlib.sha256(self.content.encode()).hexdigest()[:32]


class BaseScraper(ABC):
    """Abstract base for all scrapers. All subclasses must implement async methods."""

    def __init__(self, source_type: SourceType = SourceType.TOR_ONION, **kwargs):
        self.source_type = source_type
        self.max_content_size = kwargs.get("max_content_size", 5_000_000)
        self.timeout = kwargs.get("timeout", 30)
        self.max_retries = kwargs.get("max_retries", 3)
        self.retry_delay_base = kwargs.get("retry_delay_base", 2)

    @abstractmethod
    async def scrape(self, url: str, source_id: int, config: dict[str, Any] = None) -> ScrapeResult:
        """Scrape a single URL and return structured result."""
        ...

    @abstractmethod
    async def extract_iocs(self, text: str, source_url: str = "") -> list[ScrapedIOC]:
        """Extract IOCs from text content."""
        ...

    @abstractmethod
    async def extract_leaks(self, text: str, url: str, source_id: int, page_title: str = "") -> list[ScrapedLeak]:
        """Extract leak information from content."""
        ...


