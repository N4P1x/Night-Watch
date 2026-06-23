from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.ioc import IOC as IOCModel
from backend.utils.repository import BaseRepository


class IOCService(BaseRepository[IOCModel]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, IOCModel)

    async def list(self, skip=0, limit=50, ioc_type=None, search=None, is_whitelisted=None):
        return await super().list(
            skip=skip, limit=limit,
            filters={"type": ioc_type, "is_whitelisted": is_whitelisted},
            search_field="value" if search else None,
            search_value=search,
        )
