import asyncio
import time
from collections import OrderedDict
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, Request, Response, WebSocket, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from loguru import logger
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import get_settings
from backend.core.database import get_db, get_redis
from backend.models.user import User as UserModel

settings = get_settings()
RATE_LIMITS: dict[str, int] = {
    "/api/v1/auth/login": 10,
    "/api/v1/auth/register": 5,
    "default": 600,
}
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=14)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.secret_key, algorithm=settings.algorithm
    )
    return encoded_jwt


async def blacklist_token(token: str, expires_in: int = 1800):
    """Add token to blacklist (for logout)"""
    redis = get_redis()
    if redis:
        await redis.setex(f"blacklist_token:{token}", expires_in, "1")


async def get_user_from_token(token: str, db: AsyncSession) -> UserModel | None:
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        username: str = payload.get("sub")
        if username is None:
            return None
        # Check if token is blacklisted
        redis = get_redis()
        if redis and await redis.exists(f"blacklist_token:{token}"):
            return None
    except JWTError:
        return None
    result = await db.execute(select(UserModel).filter(UserModel.username == username))
    return result.scalars().first()


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user = await get_user_from_token(token, db)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(current_user: UserModel = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def require_roles(*roles: str) -> Callable:
    async def dependency(
        current_user: UserModel = Depends(get_current_active_user),
    ) -> UserModel:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return dependency


class MemoryRateLimiter:
    def __init__(self, max_entries: int = 10000):
        self._store: OrderedDict[str, list[float]] = OrderedDict()
        self._max = max_entries

    def clean(self):
        now = time.time()
        cutoff = now - 60
        for key in list(self._store.keys()):
            self._store[key] = [t for t in self._store[key] if t > cutoff]
            if not self._store[key]:
                del self._store[key]

    def add(self, key: str):
        if key not in self._store:
            if len(self._store) >= self._max:
                self._store.popitem(last=False)
            self._store[key] = []
        self._store[key].append(time.time())
        self.clean()

    def count(self, key: str) -> int:
        self.clean()
        return len(self._store.get(key, []))

class RateLimiter:
    def __init__(self, requests_per_minute: int = 100, burst_size: int = 10):
        self.requests_per_minute = requests_per_minute
        self.burst_size = burst_size
        self.memory_limiter = MemoryRateLimiter()

    async def is_allowed(self, client_id: str, limit: int | None = None) -> bool:
        rate_limit = limit if limit is not None else self.requests_per_minute
        now = datetime.now(UTC)
        minute_ago = now - timedelta(minutes=1)

        redis = get_redis()
        if redis is not None:
            key = f"rate_limit:{client_id}"
            try:
                await redis.zremrangebyscore(key, 0, int(minute_ago.timestamp()))
                current_count = await redis.zcard(key)
                if current_count is not None and current_count >= rate_limit:
                    return False
                await redis.zadd(key, {str(now.timestamp()): now.timestamp()})
                await redis.expire(key, 60)
            except Exception as e:
                logger.warning(f"Rate limiter error: {e}")
            return True
        else:
            self.memory_limiter.clean()
            if self.memory_limiter.count(client_id) >= rate_limit:
                return False
            self.memory_limiter.add(client_id)
            return True


rate_limiter = RateLimiter(requests_per_minute=settings.rate_limit_requests_per_minute)


def set_auth_cookie(response: Response, token: str):
    """Set JWT as httpOnly cookie"""
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60
    )


def clear_auth_cookie(response: Response):
    """Clear JWT cookie"""
    response.delete_cookie(key="access_token")


def get_token_from_cookie(request: Request) -> str | None:
    """Extract token from cookie"""
    return request.cookies.get("access_token")


async def rate_limit_middleware(request: Request, call_next):
    import os
    if os.environ.get("PYTEST_VERSION"):
        return await call_next(request)
    if request.url.path.startswith("/api/"):
        client_ip = request.client.host if request.client else "unknown"
        path_limit = RATE_LIMITS.get(request.url.path, RATE_LIMITS["default"])
        key = f"{client_ip}:{request.url.path}"
        if not await rate_limiter.is_allowed(key, path_limit):
            response = JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."},
            )
            response.headers["Access-Control-Allow-Origin"] = request.headers.get("origin", "")
            response.headers["Access-Control-Allow-Credentials"] = "true"
            return response
    response = await call_next(request)
    return response


async def get_current_user_from_cookie_or_header(
    request: Request, db: AsyncSession = Depends(get_db)
):
    """Get current user from cookie or Authorization header"""
    token = get_token_from_cookie(request)
    if not token:
        # Fallback to Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await get_user_from_token(token, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def log_audit(db: AsyncSession, user_id: int, action: str, resource: str, resource_id: int | None = None, details: str | None = None):
    from backend.services.audit_service import AuditService
    audit = AuditService(db)
    await audit.log_action(
        user_id=user_id,
        action=action,
        entity_type=resource,
        entity_id=resource_id,
        details=details,
    )


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._channels: dict[str, list[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, channels: list[str] | None = None):
        async with self._lock:
            self.active_connections.append(websocket)
            if channels:
                for ch in channels:
                    self._channels.setdefault(ch, []).append(websocket)
        return True

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
            for ch, subs in self._channels.items():
                if websocket in subs:
                    subs.remove(websocket)

    async def broadcast(self, message: dict, channel: str | None = None):
        async with self._lock:
            connections = list(self._channels.get(channel, [])) if channel else list(self.active_connections)
        stale = []
        for conn in connections:
            try:
                await conn.send_json(message)
            except Exception:
                stale.append(conn)
        for conn in stale:
            await self.disconnect(conn)


manager = ConnectionManager()
