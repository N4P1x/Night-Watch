#!/usr/bin/env python3
"""Seed the database with demo data. Run: python -m backend.seed"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.database import init_postgresql, seed_data


async def main():
    print("[*] Seeding database...")
    # Import all models so Base.metadata knows about them
    await init_postgresql()
    await seed_data()
    print("[+] Database seeding complete")


if __name__ == "__main__":
    asyncio.run(main())
