import pytest

from backend.scrapers.base import ScrapedIOC, ScrapedLeak, ScrapeResult
from backend.scrapers.extractors import AdvancedIOCExtractor


class TestScrapeResult:
    def test_default_values(self):
        result = ScrapeResult(url="http://test.onion", source_id=1)
        assert result.url == "http://test.onion"
        assert result.source_id == 1
        assert result.success is False
        assert result.content is None
        assert result.iocs == []
        assert result.leaks == []
        assert result.error is None

    def test_with_iocs(self):
        result = ScrapeResult(
            url="http://test.onion",
            source_id=1,
            success=True,
            content="test content",
            iocs=[ScrapedIOC(type="ip", value="10.0.0.1")],
            leaks=[ScrapedLeak(title="Leak", source_url="http://test.onion")],
        )
        assert result.success is True
        assert len(result.iocs) == 1
        assert len(result.leaks) == 1


class TestScrapedIOC:
    def test_default_source_name(self):
        ioc = ScrapedIOC(type="ip", value="10.0.0.1")
        assert ioc.source_name == "scraper"
        assert ioc.context == ""

    def test_with_context(self):
        ioc = ScrapedIOC(type="email", value="test@test.com", source_name="test", context="found in heading")
        assert ioc.source_name == "test"
        assert ioc.context == "found in heading"


@pytest.mark.asyncio
class TestIOCExtractor:
    async def test_extract_iocs_ip(self):
        extractor = AdvancedIOCExtractor()
        text = "Found IP 8.8.8.8 and 203.0.113.1 in logs"
        iocs = await extractor.extract_all(text)
        ips = [i for i in iocs if i.type == "ip"]
        assert len(ips) >= 1

    async def test_extract_iocs_email(self):
        extractor = AdvancedIOCExtractor()
        text = "Contact: hacker@darkweb.com and admin@test.org"
        iocs = await extractor.extract_all(text)
        emails = [i for i in iocs if i.type == "email"]
        assert len(emails) >= 1

    async def test_extract_iocs_cve(self):
        extractor = AdvancedIOCExtractor()
        text = "Exploiting CVE-2024-1234 and CVE-2023-56789"
        iocs = await extractor.extract_all(text)
        cves = [i for i in iocs if i.type == "cve"]
        assert len(cves) >= 1

    async def test_extract_iocs_btc(self):
        extractor = AdvancedIOCExtractor()
        text = "Send BTC to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
        iocs = await extractor.extract_all(text)
        wallets = [i for i in iocs if i.type == "btc_wallet"]
        assert len(wallets) == 1
