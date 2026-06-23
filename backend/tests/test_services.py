
import pytest

from backend.schemas.auth import AlertCreate, AlertUpdate, UserCreate
from backend.schemas.ioc import IOCCreate
from backend.schemas.leak import LeakCreate
from backend.schemas.post import PostCreate, PostUpdate
from backend.schemas.source import SourceCreate, SourceUpdate
from backend.schemas.threat_actor import ThreatActorCreate
from backend.services.alert_service import AlertService
from backend.services.auth_service import AuthService
from backend.services.ioc_service import IOCService
from backend.services.leak_service import LeakService
from backend.services.post_service import PostService
from backend.services.source_service import SourceService
from backend.services.stats_service import StatsService
from backend.services.threat_actor_service import ThreatActorService

pytestmark = pytest.mark.asyncio


class TestAuthService:
    async def test_register_user(self, db_session):
        service = AuthService(db_session)
        user_data = UserCreate(
            email="test@test.com",
            username="testuser",
            password="Testpass123!",
            full_name="Test User",
        )
        user = await service.register(user_data)
        assert user.email == "test@test.com"
        assert user.username == "testuser"
        assert user.role == "viewer"

    async def test_login_success(self, db_session, admin_user):
        service = AuthService(db_session)
        result = await service.login("admin", "testpass123")
        assert "access_token" in result
        assert result["token_type"] == "bearer"

    async def test_login_failure(self, db_session):
        service = AuthService(db_session)
        with pytest.raises(Exception):
            await service.login("nonexistent", "wrongpass")


class TestThreatActorService:
    async def test_list_empty(self, db_session):
        service = ThreatActorService(db_session)
        result = await service.list()
        assert result["total"] == 0
        assert result["actors"] == []

    async def test_create(self, db_session):
        service = ThreatActorService(db_session)
        actor = await service.create(ThreatActorCreate(name="APT-Test"))
        assert actor.name == "APT-Test"
        assert actor.is_active

    async def test_get_not_found(self, db_session):
        service = ThreatActorService(db_session)
        with pytest.raises(Exception):
            await service.get(999)


class TestLeakService:
    async def test_create(self, db_session, sample_threat_actor):
        service = LeakService(db_session)
        leak = await service.create(
            LeakCreate(
                title="New Breach",
                severity="critical",
                actor_id=sample_threat_actor.id,
            )
        )
        assert leak.title == "New Breach"
        assert leak.severity == "critical"

    async def test_list_filter_severity(self, db_session, sample_leak):
        service = LeakService(db_session)
        result = await service.list(severity="high")
        assert result["total"] >= 1

    async def test_filter_onion(self, db_session, sample_leak):
        service = LeakService(db_session)
        result = await service.list(is_onion=True)
        assert result["total"] == 1

    async def test_delete(self, db_session, sample_threat_actor):
        service = LeakService(db_session)
        leak = await service.create(
            LeakCreate(title="Delete Me", severity="low", actor_id=sample_threat_actor.id)
        )
        result = await service.delete(leak.id)
        assert result["message"] == "Leak deleted successfully"


class TestIOCService:
    async def test_create(self, db_session):
        service = IOCService(db_session)
        ioc = await service.create(IOCCreate(type="ip", value="10.0.0.1"))
        assert ioc.value == "10.0.0.1"
        assert ioc.type == "ip"

    async def test_create_whitelisted(self, db_session):
        service = IOCService(db_session)
        ioc = await service.create(
            IOCCreate(type="domain", value="trusted.example.com", is_whitelisted=True)
        )
        assert ioc.is_whitelisted is True

    async def test_list_filtered(self, db_session):
        service = IOCService(db_session)
        await service.create(IOCCreate(type="ip", value="10.0.0.1"))
        await service.create(IOCCreate(type="domain", value="test.com"))
        result = await service.list(ioc_type="ip")
        assert result["total"] >= 1
        for ioc in result["iocs"]:
            assert ioc.type == "ip"

    async def test_delete(self, db_session):
        service = IOCService(db_session)
        ioc = await service.create(IOCCreate(type="ip", value="10.0.0.2"))
        result = await service.delete(ioc.id)
        assert result["message"] == "IOC deleted successfully"


class TestSourceService:
    async def test_create(self, db_session):
        service = SourceService(db_session)
        source = await service.create(
            SourceCreate(name="Test Forum", type="hacker_forum", uses_tor=True)
        )
        assert source.name == "Test Forum"
        assert source.uses_tor

    async def test_get_names(self, db_session):
        service = SourceService(db_session)
        await service.create(SourceCreate(name="SourceA", type="hacker_forum"))
        await service.create(SourceCreate(name="SourceB", type="telegram"))
        result = await service.get_names()
        names = [s["name"] for s in result["names"]]
        assert "SourceA" in names
        assert "SourceB" in names

    async def test_get_types(self, db_session):
        service = SourceService(db_session)
        await service.create(SourceCreate(name="Forum", type="hacker_forum"))
        result = await service.get_types()
        assert "hacker_forum" in result["types"]

    async def test_toggle_active(self, db_session):
        service = SourceService(db_session)
        source = await service.create(SourceCreate(name="ToggleMe", type="hacker_forum"))
        updated = await service.update(source.id, SourceUpdate(is_active=False))
        assert updated.is_active is False

    async def test_delete(self, db_session):
        service = SourceService(db_session)
        source = await service.create(SourceCreate(name="DeleteMe", type="hacker_forum"))
        result = await service.delete(source.id)
        assert result["message"] == "Source deleted successfully"


class TestPostService:
    async def test_create_post(self, db_session, sample_source):
        service = PostService(db_session)
        post = await service.create(
            PostCreate(
                title="Test Post",
                content="Test content here",
                source_id=sample_source.id,
            )
        )
        assert post.title == "Test Post"

    async def test_update(self, db_session, sample_source):
        service = PostService(db_session)
        post = await service.create(
            PostCreate(title="Original", content="Original content", source_id=sample_source.id)
        )
        updated = await service.update(post.id, PostUpdate(title="Updated"))
        assert updated.title == "Updated"

    async def test_delete(self, db_session, sample_source):
        service = PostService(db_session)
        post = await service.create(
            PostCreate(title="DeletePost", content="Delete me", source_id=sample_source.id)
        )
        result = await service.delete(post.id)
        assert result["message"] == "Post deleted successfully"


class TestAlertService:
    async def test_create_alert(self, db_session):
        service = AlertService(db_session)
        alert = await service.create(
            AlertCreate(
                alert_type="test",
                title="Test Alert",
                severity="high",
            )
        )
        assert alert.title == "Test Alert"
        assert not alert.is_read

    async def test_mark_as_read(self, db_session, admin_user):
        service = AlertService(db_session)
        alert = await service.create(
            AlertCreate(alert_type="test", title="Unread Alert", severity="low")
        )
        updated = await service.update(alert.id, AlertUpdate(is_read=True), admin_user)
        assert updated.is_read is True

    async def test_mark_all_read(self, db_session, admin_user):
        service = AlertService(db_session)
        await service.create(AlertCreate(alert_type="test", title="Alert 1", severity="low"))
        await service.create(AlertCreate(alert_type="test", title="Alert 2", severity="low"))
        result = await service.mark_all_read(admin_user.id)
        assert result["message"] == "All alerts marked as read"

    async def test_list_filtered(self, db_session):
        service = AlertService(db_session)
        await service.create(AlertCreate(alert_type="test", title="High Alert", severity="high"))
        await service.create(AlertCreate(alert_type="test", title="Low Alert", severity="low"))
        result = await service.list(severity="high")
        assert result["total"] >= 1
        for alert in result["alerts"]:
            assert alert.severity == "high"


class TestStatsService:
    async def test_dashboard_empty(self, db_session):
        service = StatsService(db_session)
        stats = await service.dashboard()
        assert stats["threat_actors"]["total"] == 0

    async def test_dashboard_with_data(self, db_session, sample_leak, sample_threat_actor, sample_ioc, sample_source):
        service = StatsService(db_session)
        stats = await service.dashboard()
        assert stats["threat_actors"]["total"] >= 1
