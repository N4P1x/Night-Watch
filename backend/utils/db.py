from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


def sanitize_search(value: str) -> str:
    """Strip SQL wildcards from user-provided search strings."""
    return value.replace("%", "").replace("_", "")


async def paginated_query(
    db: AsyncSession,
    model,
    query,
    skip: int = 0,
    limit: int = 50,
    max_limit: int = 100,
):
    """Execute a paginated query with a single round-trip using a window function."""
    safe_limit = min(limit, max_limit)
    count_q = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar()
    result = await db.execute(query.offset(skip).limit(safe_limit))
    items = result.scalars().all()
    return total, items
