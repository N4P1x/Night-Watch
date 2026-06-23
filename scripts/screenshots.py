#!/usr/bin/env python3
"""Take screenshots of NightWatch platform pages."""
import asyncio
from playwright.async_api import async_playwright

BASE_URL = "http://127.0.0.1:3000"
API_URL = "http://127.0.0.1:8000"
OUTPUT_DIR = "/home/n4p1/NightWatch/media"


async def take_screenshots():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2,
        )
        page = await context.new_page()

        # 1. Login page
        print("[1/9] Login page...")
        await page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{OUTPUT_DIR}/login.png", full_page=True)

        # 2. Login
        print("[*] Logging in...")
        await page.fill('input[name="username"], input[type="text"]', "admin")
        await page.fill('input[type="password"], input[name="password"]', "testpass123")
        await page.click('button[type="submit"], button:has-text("Login")')
        await page.wait_for_timeout(3000)
        await page.wait_for_load_state("networkidle")

        # 3. Dashboard
        print("[2/9] Dashboard...")
        await page.goto(f"{BASE_URL}/", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{OUTPUT_DIR}/dashboard.png", full_page=True)

        # 4. Leaks
        print("[3/9] Leaks...")
        await page.goto(f"{BASE_URL}/leaks", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{OUTPUT_DIR}/leaks.png", full_page=True)

        # 5. Threat Actors
        print("[4/9] Threat Actors...")
        await page.goto(f"{BASE_URL}/actors", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{OUTPUT_DIR}/threat-actors.png", full_page=True)

        # 6. IOCs
        print("[5/9] IOCs...")
        await page.goto(f"{BASE_URL}/iocs", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{OUTPUT_DIR}/iocs.png", full_page=True)

        # 7. Sources
        print("[6/9] Sources...")
        await page.goto(f"{BASE_URL}/sources", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{OUTPUT_DIR}/sources.png", full_page=True)

        # 8. Alerts
        print("[7/9] Alerts...")
        await page.goto(f"{BASE_URL}/alerts", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{OUTPUT_DIR}/alerts.png", full_page=True)

        # 9. Settings
        print("[8/9] Settings...")
        await page.goto(f"{BASE_URL}/settings", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{OUTPUT_DIR}/settings.png", full_page=True)

        # 10. API Docs
        print("[9/9] API Docs...")
        await page.goto(f"{API_URL}/docs", wait_until="networkidle")
        await page.wait_for_timeout(3000)
        await page.screenshot(path=f"{OUTPUT_DIR}/api-docs.png", full_page=True)

        await browser.close()
        print("\nAll screenshots saved to media/")

if __name__ == "__main__":
    asyncio.run(take_screenshots())
