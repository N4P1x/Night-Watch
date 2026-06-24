"""
Mock Dark Web Leak Site Server
Serves realistic ransomware leak pages for end-to-end scraper testing.
Runs on localhost:9999, configured as a clearnet source.
"""

import random
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

LEAKS = [
    {
        "title": "Quantum Dynamics - Complete Database Leak 2026",
        "victim": "Quantum Dynamics International",
        "actor": "LockBit",
        "description": "We have breached Quantum Dynamics International and exfiltrated 450GB of sensitive data including customer PII, financial records, and internal communications. Payment deadline: 72 hours.",
        "data_types": ["PII", "Financial Records", "Internal Comms", "Customer Database"],
        "record_count": "2.3M records",
        "published": "2026-06-19",
    },
    {
        "title": "Helios Technologies - Source Code & Customer Data",
        "victim": "Helios Technologies GmbH",
        "actor": "ALPHV",
        "description": "Helios Technologies has been compromised. We have extracted 1.2TB of data including proprietary source code, customer credentials, and engineering documents. Contact us for negotiation.",
        "data_types": ["Source Code", "Credentials", "Customer Data", "Engineering Docs"],
        "record_count": "890K records",
        "published": "2026-06-18",
    },
    {
        "title": "Aurora Medical Network - Patient Records",
        "victim": "Aurora Medical Network",
        "actor": "BlackCat",
        "description": "Aurora Medical Network patient database has been breached. 780K patient records including medical histories, insurance details, and personal identifiers. Pay ransom to prevent publication.",
        "data_types": ["Medical Records", "PII", "Personal IDs", "Insurance Info"],
        "record_count": "780K records",
        "published": "2026-06-17",
    },
    {
        "title": "Global Finance Corp - Financial Transaction Logs",
        "victim": "Global Finance Corp",
        "actor": "CLOP",
        "description": "Global Finance Corp transaction database compromised. 3.1M financial records including wire transfers, account balances, and verification documents. Data will be sold to highest bidder.",
        "data_types": ["Financial Records", "Verification Docs", "Transaction History", "Account Details"],
        "record_count": "3.1M records",
        "published": "2026-06-16",
    },
    {
        "title": "Crescent University - Student & Staff Database",
        "victim": "Crescent University",
        "actor": "APT29",
        "description": "Crescent University research data and personnel records compromised. 500K student records, research papers, and staff PII. Includes sensitive government-funded research.",
        "data_types": ["PII", "Research Data", "Student Records", "Government Contracts"],
        "record_count": "500K records",
        "published": "2026-06-15",
    },
    {
        "title": "Nebula Cloud - Infrastructure Credentials Dump",
        "victim": "Nebula Cloud Services",
        "actor": "Lazarus Group",
        "description": "Full cloud infrastructure credentials dump for Nebula Cloud Services. 200GB of source code, database dumps, and deployment keys. Cloud infrastructure fully compromised.",
        "data_types": ["Credentials", "Source Code", "Cloud Keys", "Database Dumps"],
        "record_count": "150K records",
        "published": "2026-06-14",
    },
    {
        "title": "Sentinel Energy - SCADA System Access",
        "victim": "Sentinel Energy Utility",
        "actor": "Scattered Spider",
        "description": "Critical infrastructure breach. Sentinel Energy SCADA systems compromised. 50GB of operational technology data including grid maps, access credentials, and emergency protocols.",
        "data_types": ["SCADA Data", "Credentials", "Infrastructure Maps", "Emergency Protocols"],
        "record_count": "250K records",
        "published": "2026-06-13",
    },
    {
        "title": "Quantum Defense - Classified Documents",
        "victim": "Quantum Defense Corporation",
        "actor": "APT29",
        "description": "Classified documents exfiltrated from Quantum Defense Corp. 1.5TB of data including weapons system specs, personnel records, and international defense contracts.",
        "data_types": ["Classified Docs", "Military Specs", "Personnel Records", "Defense Contracts"],
        "record_count": "1.1M records",
        "published": "2026-06-12",
    },
]

IOCS = [
    ("ip", "185.220.101.99"),
    ("ip", "91.121.87.88"),
    ("ip", "5.255.100.77"),
    ("domain", "threatactor-c2.example"),
    ("domain", "malware-distribution.net"),
    ("domain", "phishing-login.secure"),
    ("url", "https://threatactor-c2.example/gate.php"),
    ("url", "https://malware-distribution.net/bot.exe"),
    ("btc_wallet", "1AGNa15ZQXAZUgFiqJ2i7Z2DPU2J6hW62i"),
    ("btc_wallet", "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"),
    ("eth_wallet", "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"),
    ("cve", "CVE-2025-12345"),
    ("cve", "CVE-2025-67890"),
    ("md5", "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"),
    ("sha256", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
]


class MockLeakSiteHandler(BaseHTTPRequestHandler):
    def _html(self, status: int, body: str):
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Server", "nginx/1.22.1")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))

    def _serve_leak_list(self):
        leak_rows = ""
        for leak in LEAKS:
            slug = leak["victim"].lower().replace(" ", "-").replace(".", "")[:40]
            data_types = ", ".join(leak["data_types"])
            leak_rows += f"""
            <div class="leak-entry">
                <h2><a href="/leak/{slug}">{leak['title']}</a></h2>
                <div class="meta">
                    <span class="actor">{leak['actor']}</span>
                    <span class="date">{leak['published']}</span>
                    <span class="size">{leak['record_count']}</span>
                </div>
                <p>{leak['description'][:200]}...</p>
                <div class="tags">{data_types}</div>
            </div>"""

        self._html(200, f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Dark Web Leak Site - Active Leaks</title>
<style>
body {{ font-family: monospace; background: #0a0a0a; color: #e0e0e0; max-width: 900px; margin: 0 auto; padding: 20px; }}
h1 {{ color: #ff4444; border-bottom: 2px solid #ff4444; }}
.leak-entry {{ border: 1px solid #333; padding: 15px; margin: 15px 0; border-radius: 5px; }}
.leak-entry h2 a {{ color: #ff6666; text-decoration: none; }}
.meta {{ color: #888; font-size: 0.9em; margin: 5px 0; }}
.meta span {{ margin-right: 15px; }}
.actor {{ color: #ffaa00; }}
.tags {{ color: #66ccff; font-size: 0.85em; margin-top: 8px; }}
.footer {{ margin-top: 30px; color: #555; text-align: center; font-size: 0.8em; }}
.ioc-list {{ background: #111; padding: 10px; border-radius: 3px; margin: 10px 0; font-size: 0.85em; }}
</style></head>
<body>
<h1>⛓️ DARK WEB LEAK SITE</h1>
<div class="ioc-list">
<strong>Recent IOCs detected:</strong><br>
{[f'{t}: {v}' for t, v in random.sample(IOCS, min(5, len(IOCS)))]}
</div>
{leak_rows}
<div class="footer">Tor v3 | PGP: 0xDEADBEEF | Extorted data archive</div>
</body></html>""")

    def _serve_leak_detail(self, slug: str):
        leak = None
        for leak_item in LEAKS:
            if leak_item["victim"].lower().replace(" ", "-").replace(".", "")[:40] == slug:
                leak = leak_item
                break
        if not leak:
            self._html(404, "<html><body><h1>Leak not found</h1></body></html>")
            return

        ioc_rows = "\n".join(
            f"<tr><td>{t}</td><td>{v}</td></tr>" for t, v in IOCS
        )

        self._html(200, f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>{leak['title']} - Dark Web Leak</title>
<style>
body {{ font-family: monospace; background: #0a0a0a; color: #e0e0e0; max-width: 800px; margin: 0 auto; padding: 20px; }}
h1 {{ color: #ff4444; }}
.data-box {{ background: #111; padding: 15px; border-radius: 5px; margin: 15px 0; }}
.meta {{ color: #888; }}
.actor {{ color: #ffaa00; font-weight: bold; }}
.success {{ color: #00ff00; }}
table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
td {{ border: 1px solid #333; padding: 5px; }}
th {{ border: 1px solid #ff4444; padding: 5px; color: #ff4444; text-align: left; }}
</style></head>
<body>
<h1>⛓️ BREACH DATA: {leak['victim'].upper()}</h1>
<div class="data-box">
<p class="success">✓ Data exfiltrated and published</p>
<p><strong>Threat Actor:</strong> <span class="actor">{leak['actor']}</span></p>
<p><strong>Victim:</strong> {leak['victim']}</p>
<p><strong>Records:</strong> {leak['record_count']}</p>
<p><strong>Published:</strong> {leak['published']}</p>
<p><strong>Data Types:</strong> {', '.join(leak['data_types'])}</p>
</div>
<h2>Description</h2>
<p>{leak['description']}</p>
<h2>Extracted IOCs</h2>
<table>
<tr><th>Type</th><th>Value</th></tr>
{ioc_rows}
</table>
<div class="meta">⚠️ This data was obtained through unauthorized access. For threat intelligence purposes only.</div>
</body></html>""")

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/" or path == "/index.html":
            self._serve_leak_list()
        elif path.startswith("/leak/"):
            slug = path.split("/leak/")[1].split("/")[0]
            self._serve_leak_detail(slug)
        elif path == "/robots.txt":
            self._html(200, "User-agent: *\nDisallow: /")
        else:
            self._html(404, "<html><body><h1>Not found</h1></body></html>")

    def log_message(self, format, *args):
        pass


def run_mock_server(port: int = 9999):
    server = HTTPServer(("127.0.0.1", port), MockLeakSiteHandler)
    print(f"[+] Mock dark web leak site running on http://127.0.0.1:{port}")
    print(f"    Serves {len(LEAKS)} realistic ransomware leak pages with {len(IOCS)} embedded IOCs")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[-] Mock server stopped")
        server.server_close()


if __name__ == "__main__":
    run_mock_server()
