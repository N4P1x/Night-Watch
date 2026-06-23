"""seed core data (sources, threat actors)

Revision ID: 0003_seed_core_data
Revises: 0002_add_audit_logs
Create Date: 2026-06-22
"""
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op

revision = "0003_seed_core_data"
down_revision = "0002_add_audit_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    now = datetime.now(UTC)

    # --- threat actors ---
    actors = [
        ("LockBit", '["LockBit Group"]', "Ransomware-as-a-Service operation active since 2019",
         "Financial", "high", "high", '["Finance", "Healthcare", "Government"]',
         '["North America", "Europe"]', '["Data Encryption", "Double Extortion", "Data Theft"]',
         '["LockBit"]', "critical", 1),
        ("ALPHV", '["BlackCat", "BlackCat/ALPHV"]', "Ransomware group using Rust-based malware",
         "Financial", "high", "high", '["Technology", "Healthcare", "Energy"]',
         '["North America", "Europe", "Asia"]', '["Ransomware", "Data Exfiltration", "Double Extortion"]',
         '["ALPHV"]', "critical", 1),
        ("CLOP", '["Clop", "Cl0p"]', "Ransomware gang known for large-scale data theft",
         "Financial", "medium", "medium", '["Finance", "Education", "Technology"]',
         '["North America", "Europe"]', '["Data Theft", "Ransomware", "Phishing"]',
         '["Clop"]', "high", 1),
        ("APT29", '["Cozy Bear", "Midnight Blizzard", "Nobelium"]',
         "Russian state-sponsored APT group attributed to SVR",
         "Espionage", "high", "high", '["Government", "Defense", "Energy", "Technology"]',
         '["North America", "Europe"]', '["Spear Phishing", "Custom Malware", "Credential Theft"]',
         '["SolarWinds Backdoor", "Teardrop", "GoldMax"]', "critical", 1),
        ("Lazarus Group", '["APT38", "Hidden Cobra"]', "North Korean state-sponsored cyber threat group",
         "Espionage", "high", "high", '["Finance", "Defense", "Government", "Technology"]',
         '["Asia", "North America", "Middle East"]',
         '["Social Engineering", "Supply Chain Attack", "Cryptocurrency Theft"]',
         '["Rising Sun", "Lightless"]', "critical", 1),
        ("Scattered Spider", '["UNC3944"]',
         "English-speaking cybercriminal group targeting telecom and tech",
         "Financial", "medium", "medium", '["Technology", "Telecommunications", "Gaming"]',
         '["North America"]', '["SIM Swapping", "Social Engineering", "Ransomware"]',
         '[]', "high", 1),
    ]
    for a in actors:
        conn.execute(
            sa.text("""
                INSERT OR IGNORE INTO threat_actors
                    (name, aliases, description, motivation, sophistication, resource_level,
                     target_industries, target_regions, ttps, associated_malware, risk_level, is_active,
                     created_at, updated_at, first_seen, last_activity)
                VALUES (:name, :aliases, :description, :motivation, :sophistication, :resource_level,
                        :target_industries, :target_regions, :ttps, :associated_malware, :risk_level, :is_active,
                        :created_at, :updated_at, :first_seen, :last_activity)
            """),
            {
                "name": a[0], "aliases": a[1], "description": a[2], "motivation": a[3],
                "sophistication": a[4], "resource_level": a[5], "target_industries": a[6],
                "target_regions": a[7], "ttps": a[8], "associated_malware": a[9],
                "risk_level": a[10], "is_active": a[11],
                "created_at": now, "updated_at": now, "first_seen": now, "last_activity": now,
            }
        )

    # --- sources ---
    sources = [
        ("Mock Dark Web Leak Site", "simulated_darkweb", "http://127.0.0.1:9999",
         None, "en", 1, 0, 0, 10, 1.0),
        ("BleepingComputer", "rss", "https://www.bleepingcomputer.com/feed/",
         None, "en", 1, 0, 0, 60, 0.9),
        ("The Record", "rss", "https://therecord.media/feed/",
         None, "en", 1, 0, 0, 60, 0.85),
        ("CyberScoop", "rss", "https://cyberscoop.com/feed/",
         None, "en", 1, 0, 0, 60, 0.8),
        ("Pastebin", "paste_site", "https://psbdmp.ws",
         None, "en", 1, 0, 0, 30, 0.7),
        ("HackForums", "hacker_forum", "https://hackforums.net",
         None, "en", 1, 0, 0, 60, 0.5),
    ]
    # Ransomware leak sites (onion)
    onion_sources = [
        ("Ransomware-Group-List", "ransomware_blog", "",
         "http://ransomwr3tsydeii4q43vazm7wofla5ujdajquitomtd47cxjtfgwyyd.onion", "en", 1, 1, 1, 180, 0.6),
        ("RansomWiki", "ransomware_blog", "",
         "http://ranswikiif2mir7mnnscyrsvppxmwwqrvc43fhtddvtnmhedkj4hopyd.onion", "en", 1, 1, 1, 180, 0.6),
        ("0APT", "ransomware_blog", "",
         "http://oaptxiyisljt2kv3we2we34kuudmqda7f2geffoylzpeo7ourhtz4dad.onion", "en", 1, 1, 1, 180, 0.6),
        ("0DAY", "ransomware_blog", "",
         "http://odaygplp3zhyx7zl45egetl6dzc4reduisnoyym34rjdmaryfaz5doqd.onion", "en", 1, 1, 1, 180, 0.6),
        ("0X-Thief", "ransomware_blog", "",
         "https://oxthiefsvzp3qifmkrpwcllwscyu7jvmdxmd2coz2rxpem6ohut6x5qd.onion", "en", 1, 1, 1, 180, 0.6),
        ("0mega", "ransomware_blog", "",
         "http://omegalock5zxwbhswbisc42o2q2i54vdulyvtqqbudqousisjgc7j7yd.onion", "en", 1, 1, 1, 180, 0.6),
        ("ThreeAM", "ransomware_blog", "",
         "http://threeamkelxicjsaf2czjyz2lc4q3ngqkxhhlexyfcp2o6raw4rphyad.onion", "en", 1, 1, 1, 180, 0.6),
        ("8BASE", "ransomware_blog", "",
         "http://xb6q2aggycmlcrjtbjendcnnwpmmwbosqaugxsqb4nx6cmod3emy7sad.onion", "en", 1, 1, 1, 180, 0.6),
        ("8BASE-Mirror", "ransomware_blog", "",
         "http://xfycpauc22t5jsmfjcaz2oydrrrfy75zuk6chr32664bsscq4fgyaaqd.onion", "en", 1, 1, 1, 180, 0.6),
        ("Abrahams-Ax", "ransomware_blog", "",
         "http://abrahamm32umasogaqojib3ey2w2nwoafffrguq43tsyke4s3fz3w4yd.onion", "en", 1, 1, 1, 180, 0.6),
        ("ABYSS", "ransomware_blog", "",
         "http://3ev4metjirohtdpshsqlkrqcmxq6zu3d7obrdhglpy5jpbr7whmlfgqd.onion", "en", 1, 1, 1, 180, 0.6),
        ("AILOCK", "ransomware_blog", "",
         "http://dhnsppqjaaa22lsqxl2tfhji4ca43743kubltnodvsft3hkvai77p6ad.onion", "en", 1, 1, 1, 180, 0.6),
        ("Akira", "ransomware_blog", "",
         "https://akiral2iz6a7qgd3ayp3l6yub7xx2uep76idk3u2kollpj5z3z636bad.onion", "en", 1, 1, 1, 180, 0.6),
        ("Akira-Victims", "ransomware_blog", "",
         "https://akiralkzxzq2dsrzsrvbr2xgbbu2wgsmxryd4csgfameg52n7efvr2id.onion", "en", 1, 1, 1, 180, 0.6),
        ("ALP-001", "ransomware_blog", "",
         "http://b4riuxx7ypobdptctf6lyfcvgi6vn74iurzdh4kn2agbk7472dvywgyd.onion", "en", 1, 1, 1, 180, 0.6),
        ("ALPHV-BlackCat", "ransomware_blog", "",
         "http://alphvuzxyxv6ylumd2ngp46xzq3pw6zflomrghvxeuks6kklberrbmyd.onion", "en", 1, 1, 1, 180, 0.6),
        ("ALPHV-DataLeaks", "ransomware_blog", "",
         "http://vqifktlreqpudvulhbzmc5gocbeawl67uvs2pttswemdorbnhaddohyd.onion", "en", 1, 1, 1, 180, 0.6),
        ("ANUBIS", "ransomware_blog", "",
         "http://om6q4a6cyipxvt7ioudxt24cw4oqu4yodmqzl25mqd2hgllymrgu4aqd.onion", "en", 1, 1, 1, 180, 0.6),
        ("Apos-Security", "ransomware_blog", "",
         "http://yrz6bayqwhleymbeviter7ejccxm64sv2ppgqgderzgdhutozcbbhpqd.onion", "en", 1, 1, 1, 180, 0.6),
        ("APT73", "ransomware_blog", "",
         "http://apt73grpjgjwykrenq7vnjejue76vosdzptdvmonv7vyqnsyokrw57ad.onion", "en", 1, 1, 1, 180, 0.6),
        ("APT73-Mirror1", "ransomware_blog", "",
         "http://wn6vonooq6fggjdgyocp7bioykmfjket7sbp47cwhgubvowwd7ws5pyd.onion", "en", 1, 1, 1, 180, 0.6),
        ("APT73-Mirror2", "ransomware_blog", "",
         "http://basheqtvzqwz4vp6ks5lm2ocq7i6tozqgf6vjcasj4ezmsy4bkpshhyd.onion", "en", 1, 1, 1, 180, 0.6),
        ("APT73-Mirror3", "ransomware_blog", "",
         "http://basherq53eniermxovo3bkduw5qqq5bkqcml3qictfmamgvmzovykyqd.onion", "en", 1, 1, 1, 180, 0.6),
        ("APT73-Mirror4", "ransomware_blog", "",
         "http://basherykagbxoaiaxkgqhmhd5gbmedwb3di4ig3ouovziagosv4n77qd.onion", "en", 1, 1, 1, 180, 0.6),
        ("APT73-Mirror5", "ransomware_blog", "",
         "http://bashete63b3gcijfofpw6fmn3rwnmyi5aclp55n6awcfbexivexbhyad.onion", "en", 1, 1, 1, 180, 0.6),
    ]

    for s in sources + onion_sources:
        name, stype, url, onion_url, lang, active, is_onion, uses_tor, interval, reliability = s
        conn.execute(
            sa.text("""
                INSERT OR IGNORE INTO sources
                    (name, type, url, onion_url, language, is_active, is_onion, uses_tor,
                     scrape_interval_minutes, reliability_score, created_at, updated_at)
                VALUES (:name, :type, :url, :onion_url, :language, :is_active, :is_onion, :uses_tor,
                        :scrape_interval_minutes, :reliability_score, :created_at, :updated_at)
            """),
            {
                "name": name, "type": stype, "url": url, "onion_url": onion_url,
                "language": lang, "is_active": active, "is_onion": is_onion, "uses_tor": uses_tor,
                "scrape_interval_minutes": interval, "reliability_score": reliability,
                "created_at": now, "updated_at": now,
            }
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM threat_actors"))
    conn.execute(sa.text("DELETE FROM sources"))
