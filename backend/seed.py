#!/usr/bin/env python3
"""Seed the database with demo data. Run: python -m backend.seed"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import UTC, datetime

from passlib.context import CryptContext

from backend.core.database import SessionLocal, init_postgresql
from backend.models.ioc import IOC
from backend.models.leak import Leak
from backend.models.source import Source
from backend.models.threat_actor import ThreatActor
from backend.models.user import Alert, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed_data():
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.username == "admin").first()
        if not existing_user:
            admin = User(
                username="admin",
                # Must be a globally valid address: response schemas use
                # EmailStr, and .local-style domains 500 every /me read,
                # bricking the console right after login.
                email="admin@night-watch.io",
                hashed_password=pwd_context.hash("admin123"),
                role="admin",
                is_active=True,
                created_at=datetime.now(UTC),
            )
            db.add(admin)
            db.commit()
            print("[+] Admin user created (admin / admin123)")
        elif (existing_user.email or "").endswith(".local"):
            # Self-heal installs seeded before the email fix.
            existing_user.email = "admin@night-watch.io"
            db.commit()
            print("[+] Repaired admin email (.local is not a valid EmailStr)")

        if db.query(Source).count() == 0:
            sources = [
                Source(name="Mock Dark Web Leak Site", type="simulated_darkweb",
                       url="http://127.0.0.1:9999", language="en",
                       is_active=True, is_onion=False, uses_tor=False,
                       scrape_interval_minutes=10, reliability_score=1.0),
                Source(name="BleepingComputer", type="rss",
                       url="https://www.bleepingcomputer.com/feed/", language="en",
                       is_active=True, is_onion=False, uses_tor=False,
                       scrape_interval_minutes=60, reliability_score=0.9),
            ]
            db.add_all(sources)
            db.commit()
            print(f"[+] Created {len(sources)} sources")

        # Demo intel so a fresh install shows every console page working.
        # Guarded per-table like sources above; clearly synthetic data.
        if db.query(ThreatActor).count() == 0:
            actors = [
                ThreatActor(
                    name="RedLock Demo", risk_level="critical",
                    description="Synthetic seed actor for UI development.",
                    motivation="Financial", sophistication="High",
                    target_industries=["Healthcare", "Finance"],
                    target_regions=["North America", "Europe"],
                    ttps=["T1486", "T1490"], associated_tools=["DemoLocker"],
                    tags=["demo", "seed"], is_active=True,
                ),
                ThreatActor(
                    name="QuietPanda Demo", risk_level="high",
                    description="Synthetic seed actor for UI development.",
                    motivation="Espionage", sophistication="High",
                    target_industries=["Technology"],
                    target_regions=["Asia"],
                    ttps=["T1059", "T1070"], associated_tools=["DemoShell"],
                    tags=["demo", "seed"], is_active=True,
                ),
            ]
            db.add_all(actors)
            db.commit()
            print(f"[+] Created {len(actors)} demo threat actors")

        if db.query(Leak).count() == 0:
            redlock = db.query(ThreatActor).filter(ThreatActor.name == "RedLock Demo").first()
            leaks = [
                Leak(title="Demo breach: Example Manufacturing",
                     description="<p>Synthetic seed leak for UI development.</p>",
                     victim_name="Example Manufacturing", victim_industry="Manufacturing",
                     actor_id=redlock.id if redlock else None, actor_name="RedLock Demo",
                     source_url="http://demo-leak-site.test/posts/1",
                     severity="critical", confidence=0.9, tags=["demo", "seed"]),
                Leak(title="Demo breach: Sample Clinic",
                     description="Synthetic seed leak for UI development.",
                     victim_name="Sample Clinic", victim_industry="Healthcare",
                     source_url="http://demo-leak-site.test/posts/2",
                     severity="high", confidence=0.75, tags=["demo"]),
                Leak(title="Demo breach: Test Retail Group",
                     description="Synthetic seed leak for UI development.",
                     victim_name="Test Retail Group", victim_industry="Retail",
                     source_url="https://example.com/breach-disclosure",
                     severity="medium", confidence=0.6, tags=["demo"]),
            ]
            db.add_all(leaks)
            db.commit()
            print(f"[+] Created {len(leaks)} demo leaks")

        if db.query(IOC).count() == 0:
            iocs = [
                IOC(type="ip", value="203.0.113.10", source_name="demo-seed",
                    confidence=0.9, tags=["demo"]),
                IOC(type="domain", value="malicious-demo.test", source_name="demo-seed",
                    confidence=0.8, tags=["demo"]),
                IOC(type="file_hash",
                    value="d41d8cd98f00b204e9800998ecf8427e", source_name="demo-seed",
                    confidence=0.7, tags=["demo"]),
                IOC(type="cve", value="CVE-2024-0001", source_name="demo-seed",
                    confidence=0.85, tags=["demo"]),
                IOC(type="url", value="http://malicious-demo.test/payload",
                    source_name="demo-seed", confidence=0.6, tags=["demo"]),
            ]
            db.add_all(iocs)
            db.commit()
            print(f"[+] Created {len(iocs)} demo IOCs")

        admin = db.query(User).filter(User.username == "admin").first()
        if admin and db.query(Alert).count() == 0:
            db.add(Alert(
                user_id=admin.id, alert_type="keyword", title="Demo alert: RedLock Demo mentioned",
                description="Synthetic seed alert for UI development.",
                severity="high", confidence=0.8,
                matched_keywords=["RedLock"], is_read=False,
            ))
            db.commit()
            print("[+] Created 1 demo alert")
    finally:
        db.close()


async def main():
    print("[*] Seeding database...")
    await init_postgresql()
    await seed_data()
    print("[+] Database seeding complete")


if __name__ == "__main__":
    asyncio.run(main())
