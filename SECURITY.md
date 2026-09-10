# Security Policy

## Supported Versions

| Project | Supported |
| ------- | --------- |
| Night-Watch `main` | :white_check_mark: |
| Older tags / forks | :x: |

## Reporting a Vulnerability

**Do not open a public issue for security bugs.**

Email: Sh3rb1n1@gmail.com with subject `[Night-Watch SECURITY]`.
Include: affected version/commit, reproduction steps, impact, PoC if any.

I aim to acknowledge within 72h and ship a fix ASAP. Responsible disclosure appreciated —
please allow 90 days before public disclosure.

## Scope Notes

Night-Watch handles dark-web sources, IOCs, and credentials:

- All dark-web traffic must stay routed via Tor. Do not disable Tor for authenticated sources.
- Source credentials are Fernet-encrypted. Never commit `.env`, `*.key`, or real credentials.
  Use `.env.example` as template.
- Report credential-logging, SSRF, RCE via scrapers, auth bypass, IDOR, or secret leakage immediately.

## Hardening

- Keep Docker images, Python deps, and Node deps updated (`pip audit` / `npm audit` recommended).
- Run with least privilege, restrict `ALLOWED_HOSTS` / CORS in production.
- Enable pre-commit, ruff, and CI before merging.
