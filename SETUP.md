# Track B Setup

## Prerequisites
- Node 18+ (`nvm use` to switch)
- npm workspaces supported

## Install & Build

```bash
nvm use
npm install
npm run build
```

## Testing B1 locally

1. Build: `npm run build -w @talentos/extension-job-capture`
2. Load extension in Chrome: `chrome://extensions` → Load unpacked → `packages/extension-job-capture/dist`
3. Set API key in localStorage: open DevTools on any tab, run:
   ```js
   localStorage.setItem('talentos_extension_key', '<your-key>');
   localStorage.setItem('talentos_candidate_id', '<candidate-id>');
   ```
4. Visit a job site (Greenhouse, Lever) → click extension icon → "Save to TalentOS"

## Waiting on Track A

- A4 API spec (extension endpoints) — blocks B1, B3, B5
- A2 readiness score deployed — needed for B3/B5
- A5 decision workbench with ATS badge — displays B1 output

Check ../talentos-roadmap.html for full sequencing.
