from typing import Any, Generic, TypeVar

from backend.utils.db import paginated_query, sanitize_search
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

ModelT = TypeVar("ModelT")


class BaseRepository(Generic[ModelT]):
    """Generic repository with common CRUD operations."""

    def __init__(self, db: AsyncSession, model: type[ModelT]):
        self.db = db
        self.model = model

    async def list(
        self,
        skip: int = 0,
        limit: int = 50,
        filters: dict[str, Any] | None = None,
        search_field: str | None = None,
        search_value: str | None = None,
        order_field: str | None = None,
        order_desc: bool = True,
    ) -> dict:
        query = select(self.model)
        if filters:
            for field, value in filters.items():
                if value is not None:
                    query = query.filter(getattr(self.model, field) == value)
        if search_field and search_value:
            query = query.filter(
                getattr(self.model, search_field).ilike(f"%{sanitize_search(search_value)}%")
            )
        order_col = getattr(self.model, order_field or "created_at")
        query = query.order_by(order_col.desc() if order_desc else order_col.asc())
        total, items = await paginated_query(self.db, self.model, query, skip, limit)
        return {"total": total, self.model.__tablename__: items}

    async def get(self, entity_id: int) -> ModelT:
        result = await self.db.execute(
            select(self.model).filter(self.model.id == entity_id)
        )
        entity = result.scalars().first()
        if not entity:
            raise HTTPException(status_code=404, detail=f"{self.model.__name__} not found")
        return entity

    async def create(self, schema, **extra_fields) -> ModelT:
        data = schema.model_dump()
        data.update(extra_fields)
        entity = self.model(**data)
        self.db.add(entity)
        await self.db.commit()
        await self.db.refresh(entity)
        return entity

    async def update(self, entity_id: int, schema, exclude_unset: bool = True) -> ModelT:
        entity = await self.get(entity_id)
        update_data = schema.model_dump(exclude_unset=exclude_unset)
        for field, value in update_data.items():
            setattr(entity, field, value)
        await self.db.commit()
        await self.db.refresh(entity)
        return entity

    async def delete(self, entity_id: int) -> dict:
        entity = await self.get(entity_id)
        await self.db.delete(entity)
        await self.db.commit()
        return {"message": f"{self.model.__name__} deleted successfully"}
