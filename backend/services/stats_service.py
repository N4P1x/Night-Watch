from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.ioc import IOC as IOCModel
from backend.models.leak import Leak as LeakModel
from backend.models.source import Source as SourceModel
from backend.models.threat_actor import ThreatActor as ThreatActorModel
from backend.services.cache_service import cached


class StatsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @cached("dashboard_stats", expire=60)
    async def dashboard(self) -> dict:
        today = datetime.now(UTC).date()

        # Combine multiple COUNT queries into a single round trip
        result = await self.db.execute(
            select(
                select(func.count()).select_from(ThreatActorModel).scalar_subquery(),
                select(func.count()).select_from(ThreatActorModel).filter(ThreatActorModel.is_active).scalar_subquery(),
                select(func.count()).select_from(LeakModel).scalar_subquery(),
                select(func.count()).select_from(LeakModel).filter(LeakModel.created_at >= today).scalar_subquery(),
                select(func.count()).select_from(IOCModel).filter(~IOCModel.is_whitelisted).scalar_subquery(),
                select(func.count()).select_from(SourceModel).filter(SourceModel.is_active).scalar_subquery(),
            )
        )
        total_actors, active_actors, total_leaks, new_leaks_today, total_iocs, active_sources = (
            (x or 0) for x in result.one()
        )

        # Get onion vs web leaks
        result = await self.db.execute(
            select(func.count()).select_from(LeakModel).filter(LeakModel.source_url.like("%.onion%"))
        )
        onion_leaks = result.scalar()
        web_leaks = total_leaks - onion_leaks

        # Get severity breakdown
        result = await self.db.execute(
            select(LeakModel.severity, func.count(LeakModel.id))
            .group_by(LeakModel.severity)
        )
        severity_results = result.all()
        severity_breakdown = {}
        for sev, count in severity_results:
            severity_breakdown[sev or "unknown"] = count

        source_breakdown = {
            "dark_web": onion_leaks,
            "surface_web": web_leaks,
        }

        return {
            "threat_actors": {"total": total_actors, "active": active_actors},
            "leaks": {
                "total": total_leaks,
                "new_today": new_leaks_today,
                "onion": onion_leaks,
                "web": web_leaks,
                "by_severity": severity_breakdown,
                "by_source": source_breakdown,
            },
            "iocs": {"total": total_iocs},
            "sources": {"active": active_sources},
        }
