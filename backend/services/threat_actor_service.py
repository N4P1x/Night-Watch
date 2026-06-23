from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.threat_actor import ThreatActor as ThreatActorModel
from backend.schemas.threat_actor import ThreatActorCreate
from backend.utils.repository import BaseRepository


class ThreatActorService(BaseRepository[ThreatActorModel]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, ThreatActorModel)

    async def list(self, skip=0, limit=50, search=None, is_active=None):
        result = await super().list(
            skip=skip,
            limit=limit,
            filters={"is_active": is_active} if is_active is not None else None,
            search_field="name" if search else None,
            search_value=search,
        )
        return {"total": result["total"], "actors": result["threat_actors"]}

    async def create(self, actor: ThreatActorCreate):
        result = await self.db.execute(
            select(ThreatActorModel).filter(ThreatActorModel.name == actor.name)
        )
        if result.scalars().first():
            raise HTTPException(status_code=409, detail="Threat actor already exists")
        return await super().create(actor)
