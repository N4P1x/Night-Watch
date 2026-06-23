from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_active_user, log_audit, require_roles
from backend.core.database import get_db
from backend.models.user import User as UserModel
from backend.schemas.threat_actor import ThreatActor, ThreatActorCreate, ThreatActorList, ThreatActorUpdate
from backend.services.threat_actor_service import ThreatActorService

router = APIRouter(prefix="/api/v1/threat-actors", tags=["Threat Actors"])


@router.get("", response_model=ThreatActorList)
async def list_actors(
    skip: int = 0,
    limit: int = 50,
    search: str = None,
    is_active: bool = None,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = ThreatActorService(db)
    return await service.list(skip, limit, search, is_active)


@router.post("", response_model=ThreatActor)
async def create_actor(
    actor: ThreatActorCreate,
    request: Request,
    current_user: UserModel = Depends(require_roles("admin", "analyst")),
    db: AsyncSession = Depends(get_db),
):
    service = ThreatActorService(db)
    db_actor = await service.create(actor)

    await log_audit(db, current_user.id, "create_threat_actor", "threat_actor", resource_id=db_actor.id, details=f"Created threat actor: {db_actor.name}")

    return db_actor


@router.get("/{actor_id}", response_model=ThreatActor)
async def get_actor(
    actor_id: int,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = ThreatActorService(db)
    return await service.get(actor_id)


@router.put("/{actor_id}", response_model=ThreatActor)
async def update_actor(
    actor_id: int,
    actor_update: ThreatActorUpdate,
    request: Request,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = ThreatActorService(db)
    result = await service.update(actor_id, actor_update)

    await log_audit(db, current_user.id, "update_threat_actor", "threat_actor", resource_id=actor_id, details=f"Updated threat actor {actor_id}")

    return result


@router.delete("/{actor_id}")
async def delete_actor(
    actor_id: int,
    request: Request,
    current_user: UserModel = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    service = ThreatActorService(db)
    result = await service.delete(actor_id)

    await log_audit(db, current_user.id, "delete_threat_actor", "threat_actor", resource_id=actor_id, details=f"Deleted threat actor {actor_id}")

    return result
