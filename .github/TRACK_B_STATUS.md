# Track B Status

Built: ✅ 2026-07-11

## Scaffolded & Ready

- [x] Monorepo structure (npm workspaces)
- [x] Shared auth/API client
- [x] B1: Job Capture MVP (manifest + scripts)
- [x] B2: Browser Profile Manager CLI
- [x] B3: JD-to-Resume QA stub
- [x] B4: ATS Adapters (Greenhouse/Lever stubs)
- [x] B5: Apply Copilot (profile gate + adapter load wired)

## Waiting On (Track A)

- A4: Extension API spec (endpoint definitions, scopes)
- A2: Readiness score service
- A5: Decision workbench + ATS badge display

## Next Moves

1. Track A delivers A4 API spec
2. Wire B1's `/capture-job` call (currently stubbed)
3. Verify B4 selectors against real live Greenhouse/Lever forms
4. Run B2's adversarial cross-candidate leak test
5. Implement B5's form-fill logic once B4 adapters verified

## Build & Test Locally

```bash
npm install
npm run build
```

See SETUP.md for extension loading in Chrome.

## Verification Gates

See VERIFICATION.md — every gate requires written sign-off before shipping.
Critical: B2's adversarial test must pass before B5 touches a real application.
