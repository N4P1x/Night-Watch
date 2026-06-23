from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_active_user, log_audit, require_roles
from backend.core.database import get_db
from backend.models.user import User as UserModel
from backend.schemas.source import Source, SourceCreate, SourceList, SourceUpdate
from backend.services.source_service import SourceService

router = APIRouter(prefix="/api/v1/sources", tags=["Sources"])


@router.get("", response_model=SourceList)
async def list_sources(
    skip: int = 0,
    limit: int = 50,
    source_type: str = None,
    is_active: bool = None,
    is_onion: bool = None,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = SourceService(db)
    return await service.list(skip, limit, source_type, is_active, is_onion)


@router.post("", response_model=Source)
async def create_source(
    source: SourceCreate,
    request: Request,
    current_user: UserModel = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    service = SourceService(db)
    db_source = await service.create(source)

    await log_audit(db, current_user.id, "create_source", "source", resource_id=db_source.id, details=f"Created source: {db_source.name}")

    return db_source


@router.get("/names")
async def get_source_names(
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = SourceService(db)
    return await service.get_names()


@router.get("/types")
async def get_source_types(
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = SourceService(db)
    return await service.get_types()


@router.get("/{source_id}", response_model=Source)
async def get_source(
    source_id: int,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = SourceService(db)
    return await service.get(source_id)


@router.put("/{source_id}", response_model=Source)
async def update_source(
    source_id: int,
    source_update: SourceUpdate,
    request: Request,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = SourceService(db)
    result = await service.update(source_id, source_update)

    await log_audit(db, current_user.id, "update_source", "source", resource_id=source_id, details=f"Updated source {source_id}")

    return result


@router.delete("/{source_id}")
async def delete_source(
    source_id: int,
    request: Request,
    current_user: UserModel = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    service = SourceService(db)
    result = await service.delete(source_id)

    await log_audit(db, current_user.id, "delete_source", "source", resource_id=source_id, details=f"Deleted source {source_id}")

    return result
