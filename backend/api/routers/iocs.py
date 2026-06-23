from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_active_user, log_audit, require_roles
from backend.core.database import get_db
from backend.models.user import User as UserModel
from backend.schemas.ioc import IOC, IOCCreate, IOCList, IOCUpdate
from backend.services.ioc_service import IOCService

router = APIRouter(prefix="/api/v1/iocs", tags=["IOCs"])


@router.get("", response_model=IOCList)
async def list_iocs(
    skip: int = 0,
    limit: int = 50,
    ioc_type: str = None,
    search: str = None,
    is_whitelisted: bool = None,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = IOCService(db)
    return await service.list(skip, limit, ioc_type, search, is_whitelisted)


@router.post("", response_model=IOC)
async def create_ioc(
    ioc: IOCCreate,
    request: Request,
    current_user: UserModel = Depends(require_roles("admin", "analyst")),
    db: AsyncSession = Depends(get_db),
):
    service = IOCService(db)
    db_ioc = await service.create(ioc)

    await log_audit(db, current_user.id, "create_ioc", "ioc", resource_id=db_ioc.id, details=f"Created IOC: {db_ioc.value}")

    return db_ioc


@router.get("/{ioc_id}", response_model=IOC)
async def get_ioc(
    ioc_id: int,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = IOCService(db)
    return await service.get(ioc_id)


@router.put("/{ioc_id}", response_model=IOC)
async def update_ioc(
    ioc_id: int,
    ioc_update: IOCUpdate,
    request: Request,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = IOCService(db)
    result = await service.update(ioc_id, ioc_update)

    await log_audit(db, current_user.id, "update_ioc", "ioc", resource_id=ioc_id, details=f"Updated IOC {ioc_id}")

    return result


@router.delete("/{ioc_id}")
async def delete_ioc(
    ioc_id: int,
    request: Request,
    current_user: UserModel = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    service = IOCService(db)
    result = await service.delete(ioc_id)

    await log_audit(db, current_user.id, "delete_ioc", "ioc", resource_id=ioc_id, details=f"Deleted IOC {ioc_id}")

    return result
