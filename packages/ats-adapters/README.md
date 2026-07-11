# B4: ATS Submission Adapters

Versioned independently. Each adapter is a DOM field-map for filling applications on an ATS platform.

## Current Adapters

- **Greenhouse** (v1.0.0) — selector map for common form fields
- **Lever** (v1.0.0) — selector map for common form fields

## Adding a New Adapter

1. Add to `src/index.ts` in `adapters` object
2. Fill in selector map (stub OK, update as you test against real listings)
3. Run canary: `npm run canary` (TODO: implement live DOM verification)
4. Bump version in package.json
5. Commit with ATS name in message

## Selector Map Fields

- `name` — CSS selector for candidate name input
- `email` — email input
- `phone` — phone input
- `location` — location/city input
- `workAuth` — work authorization dropdown/input
- `linkedin` — LinkedIn URL input
- `portfolio` — portfolio/personal site input
- `resumeUpload` — file upload for resume PDF

If a field doesn't exist on a form, leave it undefined. B5 will flag it.

## Nightly Canary

Runs automatically (TODO: set up CI job).

- Visits one sample job per ATS
- Compares live DOM selectors against adapter manifest
- Alerts on any drift (selector no longer matches, form changed)
- Prevents adapter breakage from reaching candidates

## Release

```bash
npm run build
npm publish  # Private package; configure per team
```

No build pipeline coordination needed — adapters ship independently.
