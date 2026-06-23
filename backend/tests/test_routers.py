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
        assert "checks" in data


class TestAuthRoutes:
    async def test_register(self, client):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "new@test.com",
                "username": "newuser",
                "password": "Newpass123!",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "newuser"

    async def test_login(self, client, db_session):
        rounds = 12
        user = User(
            email="login@test.com",
            username="loginuser",
            hashed_password=bcrypt.using(rounds=rounds).hash("loginpass"),
            role="viewer",
            is_active=True,
            is_verified=True,
        )
        db_session.add(user)
        await db_session.commit()

        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "loginuser", "password": "loginpass"},
        )
        assert response.status_code == 200
        assert "access_token" in response.json()

    async def test_me_unauthenticated(self, client):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401


class TestThreatActorRoutes:
    async def test_list_actors_requires_auth(self, client):
        response = await client.get("/api/v1/threat-actors")
        assert response.status_code == 401

    async def test_list_actors(self, auth_client):
        response = await auth_client.get("/api/v1/threat-actors")
        assert response.status_code == 200
        assert "actors" in response.json()

    async def test_create_actor(self, auth_client):
        response = await auth_client.post(
            "/api/v1/threat-actors",
            json={"name": "NewActor", "is_active": True},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "NewActor"


class TestIOCRoutes:
    async def test_create_ioc_requires_auth(self, client):
        response = await client.post(
            "/api/v1/iocs",
            json={"type": "ip", "value": "1.2.3.4"},
        )
        assert response.status_code == 401

    async def test_create_ioc(self, auth_client):
        response = await auth_client.post(
            "/api/v1/iocs",
            json={"type": "ip", "value": "1.2.3.4"},
        )
        assert response.status_code == 200
        assert response.json()["value"] == "1.2.3.4"


class TestLeakRoutes:
    async def test_list_leaks_requires_auth(self, client):
        response = await client.get("/api/v1/leaks")
        assert response.status_code == 401

    async def test_list_leaks(self, auth_client):
        response = await auth_client.get("/api/v1/leaks")
        assert response.status_code == 200
        assert "leaks" in response.json()

    async def test_create_leak(self, auth_client, sample_threat_actor):
        response = await auth_client.post(
            "/api/v1/leaks",
            json={
                "title": "Test Leak",
                "severity": "high",
                "actor_id": sample_threat_actor.id,
            },
        )
        assert response.status_code == 200
        assert response.json()["title"] == "Test Leak"

    async def test_get_leak(self, auth_client, sample_leak):
        response = await auth_client.get(f"/api/v1/leaks/{sample_leak.id}")
        assert response.status_code == 200
        assert response.json()["id"] == sample_leak.id

    async def test_delete_leak_requires_admin(self, client, db_session):
        from backend.models.leak import Leak
        leak = Leak(title="DeleteMe", severity="low")
        db_session.add(leak)
        await db_session.commit()
        response = await client.delete(f"/api/v1/leaks/{leak.id}")
        assert response.status_code == 401


class TestSourceRoutes:
    async def test_list_sources_requires_auth(self, client):
        response = await client.get("/api/v1/sources")
        assert response.status_code == 401

    async def test_list_sources(self, auth_client):
        response = await auth_client.get("/api/v1/sources")
        assert response.status_code == 200
        assert "sources" in response.json()

    async def test_create_source_requires_admin(self, client):
        response = await client.post(
            "/api/v1/sources",
            json={"name": "New Source", "type": "hacker_forum"},
        )
        assert response.status_code == 401

    async def test_create_source(self, auth_client):
        response = await auth_client.post(
            "/api/v1/sources",
            json={"name": "New Source", "type": "hacker_forum"},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "New Source"

    async def test_toggle_source(self, auth_client, sample_source):
        response = await auth_client.put(
            f"/api/v1/sources/{sample_source.id}",
            json={"is_active": False},
        )
        assert response.status_code == 200
        assert response.json()["is_active"] is False


class TestAlertRoutes:
    async def test_list_alerts_requires_auth(self, client):
        response = await client.get("/api/v1/alerts")
        assert response.status_code == 401

    async def test_list_alerts(self, auth_client):
        response = await auth_client.get("/api/v1/alerts")
        assert response.status_code == 200
        assert "alerts" in response.json()

    async def test_mark_read(self, auth_client, db_session):
        from sqlalchemy import select

        from backend.models.user import Alert, User
        result = await db_session.execute(select(User).filter(User.username == "authuser"))
        user = result.scalars().first()
        alert = Alert(alert_type="test", title="Read Me", severity="low", user_id=user.id)
        db_session.add(alert)
        await db_session.commit()
        await db_session.refresh(alert)
        response = await auth_client.put(
            f"/api/v1/alerts/{alert.id}",
            json={"is_read": True},
        )
        assert response.status_code == 200
        assert response.json()["is_read"] is True

    async def test_mark_all_read(self, auth_client, db_session):
        from sqlalchemy import select

        from backend.models.user import Alert, User
        result = await db_session.execute(select(User).filter(User.username == "authuser"))
        user = result.scalars().first()
        alert = Alert(alert_type="test", title="Bulk Read", severity="low", user_id=user.id)
        db_session.add(alert)
        await db_session.commit()
        response = await auth_client.post("/api/v1/alerts/read-all")
        assert response.status_code == 200


class TestPostRoutes:
    async def test_list_posts_requires_auth(self, client):
        response = await client.get("/api/v1/posts")
        assert response.status_code == 401

    async def test_list_posts(self, auth_client):
        response = await auth_client.get("/api/v1/posts")
        assert response.status_code == 200
        assert "posts" in response.json()

    async def test_create_post(self, auth_client, sample_source):
        response = await auth_client.post(
            "/api/v1/posts",
            json={
                "title": "New Post",
                "content": "Post content",
                "source_id": sample_source.id,
            },
        )
        assert response.status_code == 200
        assert response.json()["title"] == "New Post"


class TestDashboardRoutes:
    async def test_dashboard_stats_requires_auth(self, client):
        response = await client.get("/api/v1/stats/dashboard")
        assert response.status_code == 401

    async def test_dashboard_stats(self, auth_client):
        response = await auth_client.get("/api/v1/stats/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "threat_actors" in data
        assert "leaks" in data
        assert "iocs" in data
        assert "sources" in data


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
