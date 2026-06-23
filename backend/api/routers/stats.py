from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import get_current_active_user
from backend.core.database import get_db
from backend.models.user import User as UserModel
from backend.services.stats_service import StatsService

router = APIRouter(prefix="/api/v1/stats", tags=["Statistics"])


@router.get("/dashboard")
async def get_dashboard_stats(
    current_user: UserModel = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = StatsService(db)
    return await service.dashboard()
