from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.user import Alert as AlertModel
from backend.schemas.auth import AlertCreate, AlertUpdate


class AlertService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(
        self,
        skip: int = 0,
        limit: int = 50,
        is_read: bool = None,
        user_id: int = None,
        severity: str = None,
    ) -> dict:
        query = select(AlertModel)
        if user_id:
            query = query.filter(AlertModel.user_id == user_id)
        if is_read is not None:
            query = query.filter(AlertModel.is_read == is_read)
        if severity:
            query = query.filter(AlertModel.severity == severity)

        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.execute(count_query)
        total = total.scalar()

        result = await self.db.execute(
            query.order_by(AlertModel.created_at.desc()).offset(skip).limit(limit)
        )
        alerts = result.scalars().all()

        unread_count = await self.db.execute(
            select(func.count()).select_from(
                select(AlertModel).filter(
                    AlertModel.user_id == user_id,
                    not AlertModel.is_read
                ).subquery()
            )
        )
        unread = unread_count.scalar()

        return {"total": total, "unread": unread, "alerts": alerts}

    async def get(self, alert_id: int) -> AlertModel:
        result = await self.db.execute(
            select(AlertModel).filter(AlertModel.id == alert_id)
        )
        alert = result.scalars().first()
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        return alert

    async def create(self, alert: AlertCreate) -> AlertModel:
        db_alert = AlertModel(**alert.model_dump())
        self.db.add(db_alert)
        await self.db.commit()
        await self.db.refresh(db_alert)
        return db_alert

    async def update(self, alert_id: int, alert_update: AlertUpdate, current_user) -> AlertModel:
        alert = await self.get(alert_id)

        # Only allow users to update their own alerts unless admin
        if alert.user_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized to update this alert")

        update_data = alert_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(alert, field, value)

        await self.db.commit()
        await self.db.refresh(alert)
        return alert

    async def delete(self, alert_id: int) -> dict:
        alert = await self.get(alert_id)
        await self.db.delete(alert)
        await self.db.commit()
        return {"message": "Alert deleted successfully"}

    async def mark_all_read(self, user_id: int) -> dict:
        await self.db.execute(
            update(AlertModel)
            .where(AlertModel.user_id == user_id, AlertModel.is_read.is_(False))
            .values(is_read=True)
        )
        await self.db.commit()
        return {"message": "All alerts marked as read"}
