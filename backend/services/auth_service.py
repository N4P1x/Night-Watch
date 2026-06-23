import re
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import create_access_token, get_password_hash, get_redis, verify_password
from backend.core.config import get_settings
from backend.models.user import User as UserModel
from backend.schemas.auth import UserCreate, UserUpdate

settings = get_settings()


def validate_password_strength(password: str) -> bool:
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'\d', password):
        return False
    if not re.search(r'[!@#$%^&*(),.?":{}|<>_]', password):
        return False
    return True


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, user: UserCreate) -> UserModel:
        if not validate_password_strength(user.password):
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character"
            )
        # Check if email already exists
        result = await self.db.execute(select(UserModel).filter(UserModel.email == user.email))
        db_user = result.scalars().first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Check if username already exists
        result = await self.db.execute(select(UserModel).filter(UserModel.username == user.username))
        db_user = result.scalars().first()
        if db_user:
            raise HTTPException(status_code=400, detail="Username already taken")

        hashed_password = get_password_hash(user.password)

        db_user = UserModel(
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            hashed_password=hashed_password,
            role="viewer",
            is_verified=False,
        )
        self.db.add(db_user)
        await self.db.commit()
        await self.db.refresh(db_user)
        return db_user

    async def login(self, username: str, password: str) -> dict:
        result = await self.db.execute(
            select(UserModel).filter(UserModel.username == username)
        )
        user = result.scalars().first()

        if not user or not verify_password(password, user.hashed_password):
            # Track failed login attempts for brute-force protection
            redis = get_redis()
            if redis:
                key = f"failed_login:{username}"
                redis.incr(key)
                redis.expire(key, 900)  # Reset after 15 minutes
                if int(redis.get(key) or 0) >= 5:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Too many failed login attempts. Try again in 15 minutes."
                    )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Reset failed login counter on successful login
        redis = get_redis()
        if redis:
            redis.delete(f"failed_login:{username}")

        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")
        if not user.is_verified:
            raise HTTPException(status_code=400, detail="Email not verified")
        username = user.username
        user.last_login = datetime.now(UTC)
        await self.db.commit()
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": username}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}

    async def update_user(self, user: UserModel, user_update: UserUpdate) -> UserModel:
        if user_update.email and user_update.email != user.email:
            result = await self.db.execute(
                select(UserModel).filter(
                    UserModel.email == user_update.email,
                    UserModel.id != user.id
                )
            )
            existing = result.scalars().first()
            if existing:
                raise HTTPException(status_code=400, detail="Email already registered")
            user.email = user_update.email
        if user_update.full_name is not None:
            user.full_name = user_update.full_name
        if user_update.alert_keywords is not None:
            user.alert_keywords = user_update.alert_keywords
        if user_update.alert_sources is not None:
            user.alert_sources = user_update.alert_sources
        if user_update.alert_iocs is not None:
            user.alert_iocs = user_update.alert_iocs
        if user_update.notification_preferences is not None:
            user.notification_preferences = user_update.notification_preferences
        await self.db.commit()
        await self.db.refresh(user)
        return user
