from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.post import Post as PostModel
from backend.utils.repository import BaseRepository


class PostService(BaseRepository[PostModel]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, PostModel)

    async def list(self, skip=0, limit=50, source_id=None, actor_id=None, search=None):
        return await super().list(
            skip=skip, limit=limit,
            filters={"source_id": source_id, "actor_id": actor_id},
            search_field="title" if search else None,
            search_value=search,
        )
