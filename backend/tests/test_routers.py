import pytest
from httpx import ASGITransport, AsyncClient
from passlib.hash import bcrypt

from backend.api.main import app
from backend.core.database import get_db
from backend.models.user import User

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_client(client, db_session):
    rounds = 12
    user = User(
        email="auth@test.com",
        username="authuser",
        hashed_password=bcrypt.using(rounds=rounds).hash("testpass"),
        role="admin",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "authuser", "password": "testpass"},
    )
    token = response.json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client


class TestHealth:
    async def test_root(self, client):
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert data["version"] == "1.0.0"

    async def test_health(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("healthy", "degraded")


class TestAuthRoutes:
    async def test_me_unauthenticated(self, client):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401


class TestLeakRoutes:
    async def test_delete_leak_requires_admin(self, client, db_session):
        from backend.models.leak import Leak
        leak = Leak(title="DeleteMe", severity="low")
        db_session.add(leak)
        await db_session.commit()
        response = await client.delete(f"/api/v1/leaks/{leak.id}")
        assert response.status_code == 401


class TestAlertRoutes:
    async def test_list_alerts_requires_auth(self, client):
        response = await client.get("/api/v1/alerts")
        assert response.status_code == 401


class TestRoutesAccess:
    async def test_delete_actor_requires_admin(self, client, db_session):
        from backend.models.threat_actor import ThreatActor
        actor = ThreatActor(name="DeleteMe")
        db_session.add(actor)
        await db_session.commit()
        response = await client.delete(f"/api/v1/threat-actors/{actor.id}")
        assert response.status_code == 401

    async def test_delete_leak_requires_admin(self, client, db_session):
        from backend.models.leak import Leak
        leak = Leak(title="DeleteMe", severity="low")
        db_session.add(leak)
        await db_session.commit()
        response = await client.delete(f"/api/v1/leaks/{leak.id}")
        assert response.status_code == 401


@pytest.fixture
async def sync_client():
    """App client backed by sync sqlite.

    main.py routes are sync SQLAlchemy, but the default ``client`` fixture
    overrides get_db with an AsyncSession — any authenticated request then
    dies with 'AsyncSession has no attribute query' before the assertion.
    Authenticated route tests must use this fixture.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool

    from backend.core.database import Base

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    maker = sessionmaker(bind=engine)

    async def override_get_db():
        session = maker()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c, maker
    app.dependency_overrides.clear()
    engine.dispose()


async def _login_as(client, maker, username: str, role: str):
    session = maker()
    try:
        user = User(
            email=f"{username}@test.com",
            username=username,
            hashed_password=bcrypt.using(rounds=12).hash("testpass"),
            role=role,
            is_active=True,
            is_verified=True,
        )
        session.add(user)
        session.commit()
    finally:
        session.close()
    response = await client.post(
        "/api/v1/auth/login", data={"username": username, "password": "testpass"}
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


class TestAccessControl:
    """Reads need login; writes need analyst+; ops need admin."""

    async def test_reads_require_auth(self, client):
        for path in (
            "/api/v1/threat-actors",
            "/api/v1/leaks",
            "/api/v1/iocs",
            "/api/v1/sources",
            "/api/v1/sources/types",
            "/api/v1/sources/names",
            "/api/v1/posts",
            "/api/v1/stats/dashboard",
            "/api/v1/scrape/status",
        ):
            response = await client.get(path)
            assert response.status_code == 401, path

    async def test_writes_require_auth(self, client, db_session):
        from backend.models.source import Source
        from backend.models.threat_actor import ThreatActor

        actor = ThreatActor(name="PutMe")
        source = Source(name="PutMe", type="rss")
        db_session.add_all([actor, source])
        await db_session.commit()
        cases = [
            ("post", "/api/v1/threat-actors", {"name": "X"}),
            ("put", f"/api/v1/threat-actors/{actor.id}", {"description": "X"}),
            ("post", "/api/v1/leaks", {"title": "X"}),
            ("post", "/api/v1/iocs", {"type": "ip", "value": "1.1.1.1"}),
            ("post", "/api/v1/sources", {"name": "X", "type": "rss"}),
            ("put", f"/api/v1/sources/{source.id}", {"description": "X"}),
            ("post", "/api/v1/alerts", {"alert_type": "x", "title": "X"}),
            ("post", "/api/v1/scrape/trigger", None),
            ("post", "/api/v1/scrape/stop", None),
        ]
        for method, path, body in cases:
            if method == "post":
                response = await client.post(path, json=body)
            else:
                response = await client.put(path, json=body)
            assert response.status_code == 401, f"{method} {path}"

    async def test_viewer_is_read_only(self, sync_client):
        client, maker = sync_client
        headers = await _login_as(client, maker, "viewer1", "viewer")
        response = await client.get("/api/v1/threat-actors", headers=headers)
        assert response.status_code == 200
        response = await client.post(
            "/api/v1/threat-actors", json={"name": "V"}, headers=headers
        )
        assert response.status_code == 403
        response = await client.post(
            "/api/v1/leaks", json={"title": "V"}, headers=headers
        )
        assert response.status_code == 403
        response = await client.post("/api/v1/scrape/trigger", headers=headers)
        assert response.status_code == 403

    async def test_analyst_write_roundtrip(self, sync_client):
        """Analyst writes persist — covers the schema/whitelist fixes."""
        client, maker = sync_client
        headers = await _login_as(client, maker, "analyst1", "analyst")

        response = await client.post(
            "/api/v1/threat-actors",
            json={"name": "A1", "risk_level": "high"},
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["risk_level"] == "high"
        actor_id = response.json()["id"]

        response = await client.put(
            f"/api/v1/threat-actors/{actor_id}",
            json={"description": "d", "name": "HACKED", "id": 9999},
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["description"] == "d"
        assert response.json()["name"] == "A1"
        assert response.json()["id"] == actor_id

        response = await client.post(
            "/api/v1/sources",
            json={"name": "S1", "type": "rss"},
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["is_active"] is True
        source_id = response.json()["id"]

        response = await client.put(
            f"/api/v1/sources/{source_id}",
            json={"description": "d2", "language": "ru"},
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["description"] == "d2"
        assert response.json()["language"] == "ru"

        response = await client.post(
            "/api/v1/iocs", json={"type": "ip", "value": "9.9.9.9"}, headers=headers
        )
        assert response.status_code == 200
