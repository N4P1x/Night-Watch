from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_active_user, log_audit
from backend.core.database import get_db
from backend.models.user import User as UserModel
from backend.schemas.post import Post, PostCreate, PostList, PostUpdate
from backend.services.post_service import PostService

router = APIRouter(prefix="/api/v1/posts", tags=["Posts"])


@router.get("", response_model=PostList)
async def list_posts(
    skip: int = 0,
    limit: int = 50,
    source_id: int = None,
    actor_id: int = None,
    search: str = None,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = PostService(db)
    return await service.list(skip, limit, source_id, actor_id, search)


@router.post("", response_model=Post)
async def create_post(
    post: PostCreate,
    request: Request,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = PostService(db)
    db_post = await service.create(post)

    await log_audit(db, current_user.id, "create_post", "post", resource_id=db_post.id, details=f"Created post: {db_post.title}")

    return db_post


@router.get("/{post_id}", response_model=Post)
async def get_post(
    post_id: int,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = PostService(db)
    return await service.get(post_id)


@router.put("/{post_id}", response_model=Post)
async def update_post(
    post_id: int,
    post_update: PostUpdate,
    request: Request,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = PostService(db)
    result = await service.update(post_id, post_update)

    await log_audit(db, current_user.id, "update_post", "post", resource_id=post_id, details=f"Updated post {post_id}")

    return result


@router.delete("/{post_id}")
async def delete_post(
    post_id: int,
    request: Request,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = PostService(db)
    result = await service.delete(post_id)

    await log_audit(db, current_user.id, "delete_post", "post", resource_id=post_id, details=f"Deleted post {post_id}")

    return result
