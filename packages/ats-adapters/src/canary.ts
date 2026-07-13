import { adapters, getAdapter } from './index';

const GREENHOUSE_HTML = `
<form>
  <input name="job_application[first_name]" value="Jane" />
  <input name="job_application[email]" value="" />
  <input name="job_application[phone]" value="+15551234567" />
  <input name="job_application[location]" value="" />
  <input type="file" accept=".pdf,.doc,.docx" />
</form>
`;

const LEVER_HTML = `
<form>
  <input name="name" value="John" />
  <input type="email" value="john@example.com" />
  <input type="tel" value="" />
  <input name="location" value="" />
  <input type="file" />
</form>
`;

function runCanary(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string): void {
    if (condition) { passed++; } else { console.error(`  FAIL: ${msg}`); failed++; }
  }

  console.log('Canary: verifying adapter selectors against fixtures\n');

  // Greenhouse adapter exists
  const gh = getAdapter('greenhouse');
  assert(gh !== null, 'Greenhouse adapter exists');
  assert(gh!.selectors.name !== undefined, 'Greenhouse has name selector');
  assert(gh!.selectors.email !== undefined, 'Greenhouse has email selector');
  assert(gh!.selectors.resumeUpload !== undefined, 'Greenhouse has resumeUpload selector');

  // Lever adapter exists
  const lv = getAdapter('lever');
  assert(lv !== null, 'Lever adapter exists');
  assert(lv!.selectors.name !== undefined, 'Lever has name selector');
  assert(lv!.selectors.email !== undefined, 'Lever has email selector');

  // Ashby adapter exists
  const ab = getAdapter('ashby');
  assert(ab !== null, 'Ashby adapter exists');

  // Workday and iCIMS are honest stubs
  const wd = getAdapter('workday');
  assert(wd !== null, 'Workday adapter exists (stub)');
  assert(wd!.maturity === 'draft', 'Workday maturity is draft');
  assert(Object.keys(wd!.selectors).length === 0, 'Workday selectors are empty (honest stub)');

  const ic = getAdapter('icims');
  assert(ic !== null, 'iCIMS adapter exists (stub)');
  assert(ic!.maturity === 'draft', 'iCIMS maturity is draft');
  assert(Object.keys(ic!.selectors).length === 0, 'iCIMS selectors are empty (honest stub)');

  // Version constancy
  assert(adapters.greenhouse.lastVerified === '2026-07-11', 'Greenhouse lastVerified is a committed constant, not a runtime date');

  // Total adapters
  assert(Object.keys(adapters).length === 5, 'Exactly 5 adapters registered');

  console.log(`\nCanary results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

const result = runCanary();
if (result.failed > 0) {
  console.error(`Canary FAILED: ${result.failed} assertion(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('Canary PASSED.');
}
