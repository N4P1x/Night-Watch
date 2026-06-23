import hashlib
import json
from collections.abc import Callable
from functools import wraps
from typing import Any

from backend.core.config import get_settings
from backend.core.database import get_redis

settings = get_settings()


def get_cache_key(prefix: str, *args, **kwargs) -> str:
    """Generate a cache key from function arguments"""
    key_parts = [prefix]
    if args:
        key_parts.append(hashlib.md5(str(args).encode()).hexdigest())
    if kwargs:
        key_parts.append(hashlib.md5(str(sorted(kwargs.items())).encode()).hexdigest())
    return ":".join(key_parts)


def cached(prefix: str, expire: int = 300):
    """Decorator for caching function results in Redis"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            redis = get_redis()
            if not redis:
                return await func(*args, **kwargs)

            cache_key = get_cache_key(prefix, *args, **kwargs)

            try:
                cached = await redis.get(cache_key)
                if cached:
                    return json.loads(cached)
                result = await func(*args, **kwargs)
                await redis.setex(cache_key, expire, json.dumps(result, default=str))
                return result
            except Exception:
                return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            redis = get_redis()
            if not redis:
                return func(*args, **kwargs)
            return func(*args, **kwargs)

        if hasattr(func, '__await__'):
            return async_wrapper
        return sync_wrapper
    return decorator


class CacheService:
    def __init__(self):
        self.redis = get_redis()

    async def get(self, key: str) -> Any | None:
        """Get value from cache"""
        if not self.redis:
            return None
        try:
            data = await self.redis.get(key)
            if data:
                return json.loads(data)
        except Exception:
            pass
        return None

    async def set(self, key: str, value: Any, expire: int = 300) -> bool:
        """Set value in cache with expiration"""
        if not self.redis:
            return False
        try:
            return bool(await self.redis.setex(key, expire, json.dumps(value, default=str)))
        except Exception:
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.redis:
            return False
        try:
            return bool(await self.redis.delete(key))
        except Exception:
            return False

    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern using SCAN (non-blocking)"""
        if not self.redis:
            return 0
        try:
            deleted = 0
            cursor = 0
            while True:
                cursor, keys = await self.redis.scan(cursor=cursor, match=pattern, count=100)
                if keys:
                    deleted += await self.redis.delete(*keys)
                if cursor == 0:
                    break
            return deleted
        except Exception:
            return 0
