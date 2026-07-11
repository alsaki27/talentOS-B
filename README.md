# TalentOS Track B — External Extensions & Adapters

Independent build from the main TalentOS repo. These three Chrome extensions, the browser-profile manager, and the ATS adapter pack all communicate with TalentOS only through the `/api/extension/v1/*` seam (defined in Track A, A4).

## Packages

- `shared/` — Auth, API client, profile check, shared utils (used by all three extensions)
- `extension-job-capture/` — B1: Save job postings to TalentOS
- `extension-qa/` — B3: JD-to-Resume readiness QA
- `extension-copilot/` — B5: Apply autofill (human-submit only)
- `ats-adapters/` — B4: DOM field-mappers (versioned independently)
- `browser-profiles/` — B2: CLI for setting up isolated candidate browser profiles

## Release independence

Each package has its own versioning. Extensions share a build pipeline but can ship independently. ATS adapters ship on their own cadence — a DOM fix doesn't wait for the extension.

## Setup

```bash
npm install
npm run build
```

## Status

- [ ] A4 API spec finalized (blocks everything)
- [ ] B1 MVP (Job Capture) in progress
- [ ] B2 adversarial gate pending
- [ ] B4 Greenhouse/Lever adapters pending

See the full plan at `../talentos-roadmap.html` and `../talentos_internal_external.html`.
