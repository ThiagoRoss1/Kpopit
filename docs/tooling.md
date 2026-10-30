# Tooling notes

## Lighthouse CI (`@lhci/cli`)
- Pinned at **0.15.1**, the newest release (checked 2026-10-30). There's nothing newer to move to.
- `npm audit` reports high-severity advisories under it (`lighthouse` → `puppeteer-core`, `tmp`, `extract-zip`, `basic-ftp`, `zod`…). They're all in the dev-only Lighthouse chain: it runs locally and in CI against a local build, never in the shipped app. Production dependencies have 0 vulnerabilities (`npm audit --omit=dev`).
- Revisit when a new `@lhci/cli` release clears the audit.

## Pyright
- `kpopit-backend/pyrightconfig.json`: basic mode against `.venv`. Run with `npx pyright` from `kpopit-backend/`.
- Rule: fix new errors in files you touch; don't mass-fix old ones in unrelated changes.
