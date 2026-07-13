import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.TALENTOS_TEST_API || 'http://localhost:4114';
const KEY = process.env.TALENTOS_TEST_KEY || 'tos_test_00000000000000000000000000';
const h = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}`, 'X-TalentOS-Client': 'test-suite/1.0.0' };

async function post(path, body, extraHeaders = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { ...h, ...extraHeaders },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: h });
  return { status: res.status, body: await res.json() };
}

describe('A4 Contract Tests', () => {
  // ─── Auth & scope failures ───
  it('returns 401 for missing API key', async () => {
    const res = await fetch(`${BASE}/capture-job`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', applyUrl: 'https://x.com/1', jdText: '...' }),
    });
    assert.equal(res.status, 401);
    const b = await res.json();
    assert.equal(b.error.code, 'invalid_key');
  });

  it('returns 401 for invalid API key format', async () => {
    const res = await fetch(`${BASE}/capture-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer bad_key' },
      body: JSON.stringify({ title: 'Test', applyUrl: 'https://x.com/2', jdText: '...' }),
    });
    assert.equal(res.status, 401);
  });

  // ─── Capture + dedupe ───
  it('captures a job and deduplicates', async () => {
    const applyUrl = `https://example.com/jobs/${Date.now()}`;
    const idemKey = `idem-${Date.now()}`;

    const r1 = await post('/capture-job', {
      title: 'Test Job', applyUrl, jdText: 'Test JD text',
    }, { 'Idempotency-Key': idemKey });
    assert.equal(r1.status, 201);
    assert.ok(r1.body.jobId);
    assert.equal(r1.body.duplicate, false);

    // Idempotency-key dedupe
    const r2 = await post('/capture-job', {
      title: 'Test Job', applyUrl: `${applyUrl}/different`, jdText: 'Test JD text',
    }, { 'Idempotency-Key': idemKey });
    assert.equal(r2.status, 200);
    assert.equal(r2.body.duplicate, true);

    // applyUrl dedupe
    const r3 = await post('/capture-job', {
      title: 'Test Job', applyUrl, jdText: 'Test JD text',
    }, { 'Idempotency-Key': `idem-other-${Date.now()}` });
    assert.equal(r3.status, 200);
    assert.equal(r3.body.duplicate, true);
  });

  it('returns 400 for missing required fields', async () => {
    const r = await post('/capture-job', { title: 'No URL or JD' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'validation_error');
  });

  // ─── Queue ───
  it('returns queue_empty for unknown candidate', async () => {
    const r = await get('/queue/next?candidateId=00000000-0000-0000-0000-000000000000');
    assert.equal(r.status, 404);
    assert.equal(r.body.error.code, 'queue_empty');
  });

  it('returns the next approved ticket for seed candidate', async () => {
    const r = await get('/queue/next?candidateId=cand_demo');
    assert.equal(r.status, 200);
    assert.equal(r.body.ticket.applicationId, 'app_0001');
    assert.equal(r.body.ticket.jobTitle, 'Senior React Developer');
    assert.ok(r.body.ticket.profile.name);
    assert.ok(r.body.ticket.profile.email);
  });

  // ─── Readiness ───
  it('returns readiness for seed application', async () => {
    const r = await get('/readiness/app_0001');
    assert.equal(r.status, 200);
    assert.ok(r.body.required.length > 0);
    assert.ok(r.body.matched.length > 0);
    assert.ok(r.body.missing.length > 0);
    assert.equal(r.body.threshold, 70);
    assert.ok(typeof r.body.score === 'number');
  });

  it('preview readiness is byte-identical to computeReadinessScore', async () => {
    const jdText = 'React TypeScript Node.js SQL Git Kubernetes Docker AWS Terraform CI/CD experience required.';
    const r = await post('/readiness/preview', { jdText });
    assert.equal(r.status, 200);
    assert.equal(r.body.threshold, 70);

    // Known seeds: react,typescript,node.js,sql,git evidenced; kubernetes claimed
    // 10 required from vocab, 5 matched → score 50
    assert.equal(r.body.score, 50);
    assert.ok(r.body.flagged.includes('kubernetes'));
    assert.equal(r.body.matched.length, 5);
  });

  it('incident fixture is below threshold', async () => {
    const r = await get('/readiness/app_0001');
    assert.ok(r.body.score < 70, `Expected incident fixture score < 70, got ${r.body.score}`);
  });

  // ─── Evidence ───
  it('stores and deduplicates evidence', async () => {
    const screenshot = `screenshot-${Date.now()}`;
    const r1 = await post('/evidence', {
      applicationId: 'app_0001',
      screenshotUrl: screenshot,
      confirmationScrape: { title: 'Thanks!' },
    });
    assert.equal(r1.status, 201);
    assert.equal(r1.body.duplicate, false);

    const r2 = await post('/evidence', {
      applicationId: 'app_0001',
      screenshotUrl: screenshot,
      confirmationScrape: { title: 'Thanks again' },
    });
    assert.equal(r2.status, 200);
    assert.equal(r2.body.duplicate, true);
  });

  // ─── Adapters manifest ───
  it('returns adapters manifest as array', async () => {
    const r = await get('/adapters/manifest');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.adapters));
    assert.ok(r.body.adapters.length >= 3);
    assert.ok(r.body.adapters.some((a) => a.name === 'greenhouse'));
    assert.ok(r.body.adapters.some((a) => a.name === 'lever'));
  });
});
