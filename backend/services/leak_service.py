from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.leak import Leak as LeakModel
from backend.services.cache_service import CacheService
from backend.utils.db import paginated_query, sanitize_search
from backend.utils.repository import BaseRepository


class LeakService(BaseRepository[LeakModel]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, LeakModel)

    async def list(self, skip=0, limit=50, severity=None, status=None, search=None,
                   source=None, source_url=None, is_onion=None):
        filters = {"severity": severity, "status": status}
        query = select(LeakModel)
        for field, value in filters.items():
            if value is not None:
                query = query.filter(getattr(LeakModel, field) == value)
        if search:
            query = query.filter(LeakModel.title.ilike(f"%{sanitize_search(search)}%"))
        if source:
            query = query.filter(LeakModel.victim_name.ilike(f"%{sanitize_search(source)}%"))
        if source_url:
            query = query.filter(LeakModel.source_url.ilike(f"%{sanitize_search(source_url)}%"))
        if is_onion is not None:
            if is_onion:
                query = query.filter(LeakModel.source_url.like("%.onion%"))
            else:
                query = query.filter(
                    or_(~LeakModel.source_url.like("%.onion%"), LeakModel.source_url.is_(None))
                )
        query = query.order_by(LeakModel.created_at.desc())
        total, leaks = await paginated_query(self.db, LeakModel, query, skip, limit)

        cache = CacheService()
        await cache.clear_pattern("dashboard_stats:*")

        return {"total": total, "leaks": leaks}
