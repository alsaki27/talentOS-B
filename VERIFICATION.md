# Track B Verification Gates

## B1: Job Capture Extension
- [ ] Capture 10 real postings across Greenhouse, Lever, Workday, iCIMS
- [ ] ATS platform detected correctly on ≥90% of sample
- [ ] Every field lands in database (check via TalentOS workbench)
- [ ] Extension requests only `activeTab` permission
- [ ] No network calls except to `/api/extension/v1/capture-job`

## B2: Browser Profile Manager
- [ ] Adversarial test: copy Candidate A's marker into Candidate B's profile
  - **Expected**: Extensions refuse to run with clear error
  - **Must pass before B5 can ship**
- [ ] localStorage/cookies confirmed isolated per Chrome profile
- [ ] `browser_profiles.candidate_id` unique constraint enforced
- [ ] Decommission removes local marker file

## B4: ATS Adapters
- [ ] Fill accuracy ≥95% per ATS (manual test against real job postings)
- [ ] Nightly canary runs, alerts on selector drift
- [ ] "Unknown field" cases handled explicitly (not silently null)
- [ ] Manifest version bumps on every selector change

## B5: Apply Copilot
- [ ] Code review: zero programmatic submit button clicks (grep confirms)
- [ ] Profile mismatch causes refusal (exercises B2 gate)
- [ ] Uncertain-field flag rate logged and reviewed
- [ ] Human edit of prefilled field persists through to final submit
- [ ] Pilot run: 20 real submissions, human review catches <5% issues

## B3: JD-to-Resume QA
- [ ] Readiness score in extension matches workbench score (byte-identical)
- [ ] Real incident fixture surfaces flagged claims before submit

## B6 & B7: Evidence & Auto-submit Gate
- [ ] Evidence captured within seconds of live test submission
- [ ] Toggle in workbench updates within one page reload in extension
- [ ] Auto-submit gate only active after A7's outcome data exists + sign-off

---

**Release blocker**: Every ✓ must be signed off in writing before the package ships.
