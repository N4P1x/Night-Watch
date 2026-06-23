from datetime import UTC, datetime

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.core.database import Base
from backend.models.ioc import IOC
from backend.models.leak import Leak
from backend.models.source import Source
from backend.models.threat_actor import ThreatActor
from backend.models.user import User


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
    await engine.dispose()


@pytest_asyncio.fixture
async def admin_user(db_session):
    from passlib.hash import bcrypt
    rounds = 12
    user = User(
        email="admin@test.com",
        username="admin",
        hashed_password=bcrypt.using(rounds=rounds).hash("testpass123"),
        role="admin",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def sample_threat_actor(db_session):
    actor = ThreatActor(name="Test Actor", is_active=True)
    db_session.add(actor)
    await db_session.commit()
    await db_session.refresh(actor)
    return actor


@pytest_asyncio.fixture
async def sample_source(db_session):
    source = Source(name="Test Source", type="hacker_forum", is_active=True)
    db_session.add(source)
    await db_session.commit()
    await db_session.refresh(source)
    return source


@pytest_asyncio.fixture
async def sample_ioc(db_session, sample_source):
    ioc = IOC(type="ip", value="10.0.0.1", source_id=sample_source.id, is_active=True)
    db_session.add(ioc)
    await db_session.commit()
    await db_session.refresh(ioc)
    return ioc


@pytest_asyncio.fixture
async def sample_leak(db_session, sample_threat_actor, sample_source):
    leak = Leak(
        title="Test Leak",
        severity="high",
        actor_id=sample_threat_actor.id,
        source_id=sample_source.id,
        source_url="http://test.onion/leak",
        is_active=True,
        is_verified=True,
        published_date=datetime.now(UTC),
    )
    db_session.add(leak)
    await db_session.commit()
    await db_session.refresh(leak)
    return leak
