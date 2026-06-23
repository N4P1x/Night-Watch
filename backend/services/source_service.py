from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.source import Source as SourceModel
from backend.schemas.source import SourceCreate, SourceUpdate
from backend.utils.crypto import decrypt_credentials, encrypt_credentials
from backend.utils.repository import BaseRepository


class SourceService(BaseRepository[SourceModel]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, SourceModel)

    async def list(self, skip=0, limit=50, source_type=None, is_active=None, is_onion=None):
        return await super().list(
            skip=skip, limit=limit,
            filters={"type": source_type, "is_active": is_active, "is_onion": is_onion},
        )

    async def get_names(self):
        result = await self.db.execute(
            select(SourceModel.id, SourceModel.name).filter(SourceModel.is_active)
        )
        return {"names": [{"id": row.id, "name": row.name} for row in result.all()]}

    async def get_types(self):
        result = await self.db.execute(
            select(SourceModel.type).distinct()
        )
        return {"types": [row[0] for row in result.all() if row[0]]}

    async def create(self, source: SourceCreate):
        data = source.model_dump()
        if data.get("credentials"):
            data["credentials"] = encrypt_credentials(data["credentials"])
        entity = self.model(**data)
        self.db.add(entity)
        await self.db.commit()
        await self.db.refresh(entity)
        entity.credentials = decrypt_credentials(entity.credentials) if entity.credentials else {}
        return entity

    async def update(self, entity_id: int, source_update: SourceUpdate):
        entity = await self.get(entity_id)
        update_data = source_update.model_dump(exclude_unset=True)
        if "credentials" in update_data:
            update_data["credentials"] = encrypt_credentials(update_data["credentials"])
        for field, value in update_data.items():
            setattr(entity, field, value)
        await self.db.commit()
        await self.db.refresh(entity)
        entity.credentials = decrypt_credentials(entity.credentials) if entity.credentials else {}
        return entity

    async def get(self, entity_id: int):
        entity = await super().get(entity_id)
        if entity.credentials:
            entity.credentials = decrypt_credentials(entity.credentials)
        return entity
