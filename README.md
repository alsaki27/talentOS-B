# TalentOS Track B — External Extensions & Adapters v0.2

Independent build from the main TalentOS repo. These three Chrome extensions, the browser-profile manager, and the ATS adapter pack all communicate with TalentOS only through the `/api/extension/v1/*` seam (defined in `docs/A4_EXTENSION_API.md`).

## Packages

- `shared/` — Auth, API client, profile check, evidence capture, ATS detection, DTOs (used by all three extensions)
- `readiness-engine/` — Pure deterministic readiness scoring (migration-ready for TalentOS)
- `ats-adapters/` — B4: DOM field-mappers (versioned independently), fill engine, offline canary
- `browser-profiles/` — B2: CLI for setting up isolated candidate browser profiles
- `extension-job-capture/` — B1: Save job postings to TalentOS + B6 evidence capture
- `extension-qa/` — B3: JD-to-Resume readiness QA
- `extension-copilot/` — B5: Apply autofill (human-submit only)

## Status

- [x] A4 API spec finalized (`docs/A4_EXTENSION_API.md`)
- [x] B1 MVP (Job Capture) — working MV3 extension with capture + evidence
- [x] B2 (browser profiles) — CLI with create/list/verify/launch/decommission
- [x] B3 (QA) — shadow-DOM readiness panel
- [x] B4 (ATS adapters) — 5 adapters (3 with selectors, 2 honest stubs) + fill engine + manifest
- [x] B5 (Copilot) — full flow, shadow-DOM review panel, hard no-submit guarantee
- [x] B6 (Evidence) — reusable capture listener used by B1 and B5

Still open:
- [ ] B4 fill accuracy ≥95% against LIVE postings (draft adapters stay `maturity:'draft'`)
- [ ] B2 adversarial re-check on a real machine
- [ ] B5 20-submission supervised pilot
- [ ] A4 security review of scope design

## Quick start

```bash
npm install
npm run build           # builds all packages
npm test                # unit tests + canary (23 checks)
npm run mock-server     # A4 mock on :4114 (accepts any tos_ key)
npm run test:integration # 11 contract tests against mock
npm run ci              # full pipeline: build → test → integration → release gates
```
