# A4 Extension API v1 — Contract

**Base URL:** `https://<talentos-host>/api/extension/v1`

**Auth:** Bearer `tos_<base64url>` or `x-api-key` header. Five scopes, one key per extension install:

| Scope | Extension | Routes |
|---|---|---|
| `extension:job:capture` | B1 (Job Capture) | `POST /capture-job` |
| `extension:queue:read` | B5 (Copilot) | `GET /queue/next` |
| `extension:readiness:read` | B3 (QA) | `GET /readiness/:appId`, `POST /readiness/preview` |
| `extension:evidence:write` | B1 + B5 | `POST /evidence` |
| `extension:adapters:read` | B5 (Copilot) | `GET /adapters/manifest` |

## Error Envelope

Every non-2xx response:
```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable description", "details": {} } }
```

### Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `invalid_key` | 401 | API key missing, revoked, or expired |
| `missing_scope` | 403 | Key lacks the required scope |
| `no_marker` | 400 | No browser profile marker found |
| `malformed_marker` | 400 | Marker JSON is invalid |
| `candidate_mismatch` | 403 | Marker candidate_id doesn't match expected |
| `queue_empty` | 404 | No pending approved application tickets |
| `not_found` | 404 | Resource not found |
| `duplicate` | 409 | Idempotency conflict (key or apply_url) |
| `validation_error` | 400 | Request body fails validation |
| `adapter_expired` | 410 | Adapter manifest version is outdated |
| `rate_limited` | 429 | Too many requests |
| `internal_error` | 500 | Server error |

## Headers

- **`Idempotency-Key`** (required on POSTs): `crypto.randomUUID()`. Server deduplicates by this key.
- **`X-TalentOS-Client`** (required): `<packageName>/<version>`, e.g. `extension-job-capture/0.2.0`.

## Routes

### POST /capture-job

**Scope:** `extension:job:capture`

**Body:**
```json
{
  "title": "Senior React Developer",
  "applyUrl": "https://jobs.greenhouse.io/example/123",
  "jdText": "Full job description text...",
  "company": "Acme Corp",
  "location": "Remote",
  "sourceSite": "greenhouse.io",
  "salary": "$120k-$160k",
  "atsDetected": "greenhouse",
  "screenshotUrl": null
}
```

**Response 201:**
```json
{ "jobId": "uuid", "duplicate": false }
```

**Response 200 (duplicate):**
```json
{ "jobId": "uuid", "duplicate": true }
```

Deduplication: by `Idempotency-Key` header AND by `applyUrl` uniqueness. Stores in `extension_captured_jobs` (staging, not `jobs` — a human promotes in the workbench).

### GET /queue/next?candidateId=<uuid>

**Scope:** `extension:queue:read`

**Response 200:**
```json
{
  "ticket": {
    "applicationId": "uuid",
    "jobTitle": "Senior React Developer",
    "company": "Acme Corp",
    "applyUrl": "https://jobs.greenhouse.io/...",
    "profile": {
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "+15551234567",
      "location": "San Francisco, CA",
      "workAuthorization": "US Citizen",
      "linkedin": "https://linkedin.com/in/janedoe",
      "portfolio": null,
      "resumeUrl": "https://storage.../resume.pdf"
    }
  }
}
```

**Response 404:**
```json
{ "error": { "code": "queue_empty", "message": "No approved application tickets for this candidate" } }
```

### GET /readiness/:applicationId

**Scope:** `extension:readiness:read`

**Response 200:**
```json
{
  "required": ["react", "typescript", "node.js", "sql"],
  "matched": ["react", "typescript"],
  "missing": ["node.js", "sql"],
  "flagged": ["kubernetes"],
  "score": 50,
  "threshold": 70
}
```

### POST /readiness/preview

**Scope:** `extension:readiness:read`

**Body:**
```json
{ "jdText": "Full job description text..." }
```

**Response 200:**
Same shape as `GET /readiness/:applicationId` but computed against the current page's JD text and the candidate's stored skills ledger.

Byte-identical to the workbench's `computeReadinessScore()` call.

### POST /evidence

**Scope:** `extension:evidence:write`

**Body:**
```json
{
  "applicationId": "uuid",
  "screenshotUrl": "data:image/png;base64,...",
  "confirmationScrape": { "title": "Thank you", "body": "..." }
}
```

**Response 201:**
```json
{ "evidenceId": "uuid", "duplicate": false }
```

Idempotent by `applicationId + screenshotUrl` hash.

### GET /adapters/manifest

**Scope:** `extension:adapters:read`

**Response 200:**
```json
{
  "manifestVersion": "1.0.0",
  "updatedAt": "2026-07-11T00:00:00Z",
  "adapters": [
    { "name": "greenhouse", "version": "1.0.0", "maturity": "draft", "checksum": "abc123..." },
    { "name": "lever", "version": "1.0.0", "maturity": "draft", "checksum": "def456..." },
    { "name": "ashby", "version": "1.0.0", "maturity": "draft", "checksum": "ghi789..." },
    { "name": "workday", "version": "1.0.0", "maturity": "draft", "checksum": "stub" },
    { "name": "icims", "version": "1.0.0", "maturity": "draft", "checksum": "stub" }
  ]
}
```

## Versioning

- API routes are under `/v1`. Breaking changes bump to `/v2`.
- ATS adapters version independently; semver bumps on selector changes.
- Clients that detect an expired adapter (manifest server version > local) MUST refuse to proceed.

## Scoring Rule (Readiness Engine)

```
required = knownSkillVocabulary ∩ terms(jdText)     // normalized lowercase tokenize
matched  = required ∩ evidencedSkills               // candidate_skills with verified_by not null
missing  = required - matched
flagged  = claimedSkills - evidencedSkills
score    = required.length ? round(100 * |matched| / |required|) : 50
threshold = 70
```

Pure arithmetic, no AI. Deterministic.

## DDL

See `sql/extension_schema.sql` at the repo root. Tables: `candidate_skills`, `browser_profiles`, `application_evidence`, `application_outcomes`, `extension_captured_jobs`.
