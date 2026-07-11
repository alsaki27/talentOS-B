# Track B Build Guide

## Structure

```
packages/
  shared/              - Auth, API client, profile validation (used by all extensions)
  extension-job-capture/  - B1: Save job postings (MVP)
  extension-qa/           - B3: JD-to-Resume readiness check
  extension-copilot/      - B5: Apply autofill (human-submit only)
  ats-adapters/           - B4: DOM field-mappers (Greenhouse, Lever, ...)
  browser-profiles/       - B2: CLI for candidate profile isolation
```

## Key Constraints

1. **B2 gate**: Browser profile validation runs on all extension load. No extension proceeds if profile mismatch.
2. **Submit constraint**: B5 never clicks submit programmatically. Ever. Code review confirms this.
3. **One API seam**: Everything talks to TalentOS via `/api/extension/v1/*` (Track A, A4).
4. **Scope-gated keys**: Each extension's API key has only the scopes it needs (`job:capture`, `readiness:read`, etc).

## Status

| Package | Status | Blocks | Notes |
|---------|--------|--------|-------|
| shared | ✅ Stub | All extensions | Auth, API client, profile check |
| B1 (job-capture) | ✅ Stub | A5 (ATS badge) | Ready to fill in extraction logic |
| B2 (browser-profiles) | ✅ Stub | B5 (adversarial gate) | CLI scaffolded, needs testing |
| B4 (ats-adapters) | ✅ Stub | B5 | Greenhouse/Lever stubs ready, canary TODO |
| B3 (extension-qa) | ✅ Stub | — | Calls /readiness API, renders panel TODO |
| B5 (extension-copilot) | ✅ Stub | A1-A5 + B2 + B4 | Profile gate + adapter load wired, fill logic TODO |

## Build

```bash
npm install
npm run build          # Builds all packages
npm run build -w @talentos/extension-job-capture   # Single package
```

## Next Steps

1. Wait for Track A's A4 (Extension API spec) to finalize
2. Fill in B1's extraction logic once `/capture-job` endpoint exists
3. Run B2's adversarial cross-candidate leak test
4. Fill in B4's Greenhouse/Lever adapter selectors against live sites
5. Wire B5's form-filling once B4 adapters are verified

## Release Independence

- `ats-adapters` ships on its own — ATS DOM changes need rapid fixes without waiting for extension review
- Extensions can ship independently but share the build pipeline
- Each package has independent version in package.json
