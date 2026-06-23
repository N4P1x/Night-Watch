from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_active_user, log_audit, manager, require_roles
from backend.core.database import get_db
from backend.models.user import User as UserModel
from backend.schemas.auth import Alert, AlertCreate, AlertResponse, AlertUpdate
from backend.services.alert_service import AlertService

router = APIRouter(prefix="/api/v1/alerts", tags=["Alerts"])


@router.get("", response_model=AlertResponse)
async def list_alerts(
    skip: int = 0,
    limit: int = 50,
    is_read: bool = None,
    severity: str = None,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await AlertService(db).list(skip, limit, is_read, current_user.id, severity)


@router.post("", response_model=Alert)
async def create_alert(
    alert: AlertCreate,
    current_user: UserModel = Depends(require_roles("admin", "analyst")),
    db: AsyncSession = Depends(get_db),
):
    service = AlertService(db)
    db_alert = await service.create(alert)
    await manager.broadcast(
        {
            "type": "new_alert",
            "data": {
                "id": db_alert.id,
                "title": db_alert.title,
                "severity": db_alert.severity,
                "created_at": db_alert.created_at.isoformat() if db_alert.created_at else None,
            },
        },
        channel="alerts",
    )
    return db_alert


@router.put("/{alert_id}", response_model=Alert)
async def update_alert(
    alert_id: int,
    alert_update: AlertUpdate,
    request: Request,
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await AlertService(db).update(alert_id, alert_update, current_user)

    await log_audit(db, current_user.id, "update_alert", "alert", resource_id=alert_id, details=f"Updated alert {alert_id}")

    return result


@router.post("/read-all")
async def mark_all_alerts_read(
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return await AlertService(db).mark_all_read(current_user.id)


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: int,
    request: Request,
    current_user: UserModel = Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await AlertService(db).delete(alert_id)

    await log_audit(db, current_user.id, "delete_alert", "alert", resource_id=alert_id, details=f"Deleted alert {alert_id}")

    return result
