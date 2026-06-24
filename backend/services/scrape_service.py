import asyncio
from datetime import UTC, datetime
from typing import Any

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import manager
from backend.core.database import AsyncSessionLocal, get_redis
from backend.models.ioc import IOC as IOCModel
from backend.models.leak import Leak as LeakModel
from backend.models.source import Source as SourceModel
from backend.scrapers.base import ScrapedIOC, ScrapedLeak, ScrapeResult
from backend.scrapers.engine import ScrapingEngine
from backend.scrapers.sources import SourceManager

REDIS_KEY_PREFIX = "scrape:state:"
REDIS_LOCK_KEY = "scrape:lock"
STATE_TTL = 3600


class _ScrapeState:
    """Scrape state with Redis backing for progress, in-memory for engine/task.

    Progress fields are stored in a Redis hash so they survive restarts and
    are visible to all workers. The engine and task references are per-process
    (they can't be serialized). Falls back to in-memory if Redis is unavailable.
    """

    def __init__(self):
        self._local: dict[str, Any] = {
            "status": "idle",
            "progress": 0,
            "total": 0,
            "success": 0,
            "failed": 0,
            "duplicates": 0,
            "current_url": "",
            "logs": [],
            "start_time": None,
            "end_time": None,
        }
        self._active_engine: ScrapingEngine | None = None
        self._active_task: asyncio.Task | None = None
        self._lock = asyncio.Lock()
        self._use_redis: bool = False

    async def _ensure_redis(self):
        if not self._use_redis:
            redis = get_redis()
            if redis is not None:
                self._use_redis = True

    async def get_state(self) -> dict[str, Any]:
        await self._ensure_redis()
        if self._use_redis:
            redis = get_redis()
            if redis is None:
                self._use_redis = False
            else:
                try:
                    raw = await redis.hgetall(f"{REDIS_KEY_PREFIX}progress")
                    if raw:
                        logs = await redis.lrange(f"{REDIS_KEY_PREFIX}logs", 0, -1)
                        return {
                            "status": raw.get(b"status", b"idle").decode(),
                            "progress": int(raw.get(b"progress", b"0")),
                            "total": int(raw.get(b"total", b"0")),
                            "success": int(raw.get(b"success", b"0")),
                            "failed": int(raw.get(b"failed", b"0")),
                            "duplicates": int(raw.get(b"duplicates", b"0")),
                            "current_url": raw.get(b"current_url", b"").decode(),
                            "logs": [log_line.decode() for log_line in logs],
                            "start_time": raw.get(b"start_time", b"").decode() or None,
                            "end_time": raw.get(b"end_time", b"").decode() or None,
                        }
                except Exception:
                    self._use_redis = False
        async with self._lock:
            from copy import deepcopy
            return deepcopy(self._local)

    async def set_state(self, **kwargs):
        await self._ensure_redis()
        if self._use_redis:
            redis = get_redis()
            if redis is not None:
                try:
                    mapping = {k: str(v) if not isinstance(v, str) else v for k, v in kwargs.items() if k != "logs"}
                    if mapping:
                        await redis.hset(f"{REDIS_KEY_PREFIX}progress", mapping=mapping)
                        await redis.expire(f"{REDIS_KEY_PREFIX}progress", STATE_TTL)
                    if "logs" in kwargs and kwargs["logs"] is not None:
                        await redis.delete(f"{REDIS_KEY_PREFIX}logs")
                        for log_entry in kwargs["logs"]:
                            await redis.rpush(f"{REDIS_KEY_PREFIX}logs", log_entry)
                        await redis.expire(f"{REDIS_KEY_PREFIX}logs", STATE_TTL)
                    return
                except Exception:
                    self._use_redis = False
        async with self._lock:
            self._local.update(kwargs)

    async def append_log(self, msg: str):
        await self._ensure_redis()
        ts = datetime.now().strftime("%H:%M:%S")
        line = f"[{ts}] {msg}"
        if self._use_redis:
            redis = get_redis()
            if redis is not None:
                try:
                    await redis.rpush(f"{REDIS_KEY_PREFIX}logs", line)
                    await redis.ltrim(f"{REDIS_KEY_PREFIX}logs", -100, -1)
                    await redis.expire(f"{REDIS_KEY_PREFIX}logs", STATE_TTL)
                    return
                except Exception:
                    self._use_redis = False
        async with self._lock:
            self._local["logs"].append(line)
            if len(self._local["logs"]) > 100:
                self._local["logs"] = self._local["logs"][-100:]

    async def try_acquire_lock(self) -> bool:
        """Attempt to acquire a distributed scrape lock via Redis."""
        redis = get_redis()
        if redis is None:
            return True
        try:
            acquired = await redis.set(REDIS_LOCK_KEY, "1", nx=True, ex=STATE_TTL)
            return acquired is not None
        except Exception:
            return True

    async def release_lock(self):
        redis = get_redis()
        if redis is not None:
            await redis.delete(REDIS_LOCK_KEY)

    async def get_engine(self) -> ScrapingEngine | None:
        async with self._lock:
            return self._active_engine

    async def set_engine(self, engine: ScrapingEngine | None):
        async with self._lock:
            self._active_engine = engine

    async def get_task(self) -> asyncio.Task | None:
        async with self._lock:
            return self._active_task

    async def set_task(self, task: asyncio.Task | None):
        async with self._lock:
            self._active_task = task


_scrape_state = _ScrapeState()


class ScrapeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._persist_lock = asyncio.Lock()
        self.source_manager = SourceManager()

    async def get_stats(self) -> dict[str, Any]:
        state = await _scrape_state.get_state()
        return {
            "status": state["status"],
            "progress": state["progress"],
            "total": state["total"],
            "success": state["success"],
            "failed": state["failed"],
            "duplicates": state["duplicates"],
            "current_url": state["current_url"],
            "logs": state["logs"][-20:],
            "start_time": state["start_time"],
            "end_time": state["end_time"],
        }

    async def get_health(self) -> dict[str, Any]:
        state = await _scrape_state.get_state()
        engine = await _scrape_state.get_engine()
        return {
            "status": state["status"],
            "engine_running": engine is not None,
            "last_start_time": state["start_time"],
            "last_end_time": state["end_time"],
        }

    async def trigger_scrape(
        self,
        source_id: int | None = None,
        max_urls: int = 50,
        max_concurrent: int = 5,
    ) -> dict[str, Any]:
        task = await _scrape_state.get_task()
        if task and not task.done():
            return {"status": "already_running", "message": "Scrape already in progress"}
        acquired = await _scrape_state.try_acquire_lock()
        if not acquired:
            return {"status": "already_running", "message": "Scrape already in progress on another worker"}

        async def _run():
            engine = ScrapingEngine(
                max_concurrent=max_concurrent,
            )
            await _scrape_state.set_engine(engine)
            await _scrape_state.set_state(
                status="running", progress=0, total=0,
                success=0, failed=0, duplicates=0, current_url="",
                logs=[], start_time=datetime.now(UTC).isoformat(),
                end_time=None,
            )
            try:
                async with AsyncSessionLocal() as session:
                    result = await session.execute(
                        select(SourceModel).filter(SourceModel.is_active).limit(max_urls)
                    )
                    sources = result.scalars().all()

                targets = []
                for src in sources:
                    url = src.onion_url or src.url
                    if url:
                        targets.append({
                            "url": url,
                            "source_id": src.id,
                            "source_type": "tor_onion" if src.is_onion else "clearnet",
                            "config": src.scraping_config or {},
                        })

                _collected_leaks: list[ScrapedLeak] = []
                _collected_iocs: list[ScrapedIOC] = []

                _scrape_total = len(targets)
                if _scrape_total:
                    await _scrape_state.set_state(total=_scrape_total, progress=0, success=0, failed=0)

                async def _on_complete(scrape_result: ScrapeResult):
                    state = await _scrape_state.get_state()
                    await _scrape_state.set_state(
                        progress=state["progress"] + 1,
                        current_url=scrape_result.url,
                        success=state["success"] + (1 if scrape_result.success else 0),
                        failed=state["failed"] + (0 if scrape_result.success else 1),
                    )
                    if not scrape_result.success:
                        return
                    _collected_leaks.extend(scrape_result.leaks[:5])
                    _collected_iocs.extend(scrape_result.iocs[:50])

                result = await engine.scrape_batch(targets=targets, on_complete=_on_complete)

                if _collected_leaks or _collected_iocs:
                    async with AsyncSessionLocal() as batch_session:
                        seen_urls = set()
                        for leak in _collected_leaks:
                            if leak.source_url in seen_urls:
                                continue
                            seen_urls.add(leak.source_url)
                            existing = await batch_session.execute(
                                select(LeakModel).filter(LeakModel.source_url == leak.source_url).limit(1)
                            )
                            if not existing.scalars().first():
                                batch_session.add(LeakModel(
                                    title=leak.title, source_url=leak.source_url,
                                    severity=leak.severity, description=leak.description,
                                    victim_name=leak.victim_name, actor_name=leak.actor_name,
                                    data_types=leak.data_types, record_count=leak.record_count,
                                    published_date=leak.published_date or datetime.now(UTC),
                                    tags=leak.tags, confidence=leak.confidence, source_id=getattr(leak, 'source_id', 0),
                                ))
                        seen_fingerprints = set()
                        for ioc in _collected_iocs:
                            fp = f"{ioc.type}:{ioc.value.lower().strip()}"
                            if fp in seen_fingerprints:
                                continue
                            seen_fingerprints.add(fp)
                            existing = await batch_session.execute(
                                select(IOCModel).filter(
                                    IOCModel.type == ioc.type, IOCModel.value == ioc.value,
                                ).limit(1)
                            )
                            if not existing.scalars().first():
                                batch_session.add(IOCModel(
                                    type=ioc.type, value=ioc.value,
                                    source_name=ioc.source_name or "scraper",
                                    context=ioc.context, confidence=ioc.confidence, tags=ioc.tags,
                                ))
                        await batch_session.commit()

                success_count = sum(1 for r in result if r.success)
                await _scrape_state.set_state(
                    status="completed",
                    progress=len(result),
                    total=len(result),
                    success=success_count,
                    failed=len(result) - success_count,
                    duplicates=0,
                    end_time=datetime.now(UTC).isoformat(),
                )
                if manager.active_connections:
                    stats = await self.get_stats()
                    await manager.broadcast(stats, channel="scrape")
            except Exception as e:
                logger.error(f"Scrape failed: {e}")
                await _scrape_state.set_state(
                    status="failed", end_time=datetime.now(UTC).isoformat(),
                )
            finally:
                await _scrape_state.set_engine(None)
                await _scrape_state.release_lock()

        t = asyncio.create_task(_run())
        await _scrape_state.set_task(t)

        return {"status": "started", "total_urls": max_urls}

    async def stop_scrape(self) -> dict[str, Any]:
        engine = await _scrape_state.get_engine()
        if engine:
            await engine.stop()
            await _scrape_state.set_engine(None)
        task = await _scrape_state.get_task()
        if task and not task.done():
            task.cancel()
            await _scrape_state.set_task(None)
        await _scrape_state.set_state(
            status="stopped", end_time=datetime.now(UTC).isoformat(),
        )
        return {"status": "stopped", "message": "Scrape stopped"}
