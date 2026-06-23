from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_active_user, log_audit, manager, require_roles
from backend.core.database import get_db
from backend.models.user import User as UserModel
from backend.schemas.leak import Leak, LeakCreate, LeakList
from backend.services.leak_service import LeakService

router = APIRouter(prefix="/api/v1/leaks", tags=["Leaks"])


@router.get("", response_model=LeakList)
async def list_leaks(
    skip: int = 0,
    limit: int = 50,
    severity: str = None,
    status: str = None,
    search: str = None,
    source: str = None,
    source_url: str = None,
    is_onion: bool = None,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = LeakService(db)
    return await service.list(skip, limit, severity, status, search, source, source_url, is_onion)


@router.post("", response_model=Leak)
async def create_leak(
    leak: LeakCreate,
    request: Request,
    current_user: UserModel = Depends(require_roles("admin", "analyst")),
    db: AsyncSession = Depends(get_db),
):
    service = LeakService(db)
    db_leak = await service.create(leak)
    await manager.broadcast(
        {
            "type": "new_leak",
            "data": {
                "id": db_leak.id,
                "title": db_leak.title,
                "severity": db_leak.severity.value if hasattr(db_leak.severity, 'value') else db_leak.severity,
                "created_at": db_leak.created_at.isoformat() if db_leak.created_at else None,
            },
        },
        channel="leaks",
    )

    await log_audit(db, current_user.id, "create_leak", "leak", resource_id=db_leak.id, details=f"Created leak: {db_leak.title}")

    return db_leak


@router.get("/{leak_id}", response_model=Leak)
async def get_leak(
    leak_id: int,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = LeakService(db)
    return await service.get(leak_id)


@router.delete("/{leak_id}")
async def delete_leak(
    leak_id: int,
    request: Request,
    current_user: UserModel = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    service = LeakService(db)
    result = await service.delete(leak_id)

    await log_audit(db, current_user.id, "delete_leak", "leak", resource_id=leak_id, details=f"Deleted leak {leak_id}")

    return result
