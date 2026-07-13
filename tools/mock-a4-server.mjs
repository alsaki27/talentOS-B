import { createServer } from 'http';
import { randomUUID } from 'crypto';

const PORT = parseInt(process.env.PORT || '4114', 10);

// ─── In-memory stores (mirror extension_schema.sql) ───
const candidateSkills = new Map();
const browserProfiles = new Map();
const applicationEvidence = new Map();
const applicationOutcomes = new Map();
const extensionCapturedJobs = new Map();
const idempotencyKeys = new Map();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24h
let lastCleanup = Date.now();

function cleanupIdempotencyKeys() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return; // clean at most once per minute
  lastCleanup = now;
  const cutoff = now - IDEMPOTENCY_TTL;
  for (const [key, { ts }] of idempotencyKeys) {
    if (ts < cutoff) idempotencyKeys.delete(key);
  }
}

// ─── Readiness engine (pure, inlined — matches packages/readiness-engine/src/index.ts) ───
const KNOWN_SKILL_VOCABULARY = [
  'react', 'typescript', 'node.js', 'sql', 'git', 'kubernetes',
  'python', 'docker', 'aws', 'graphql', 'java', 'c#', 'go', 'rust',
  'terraform', 'jenkins', 'css', 'html', 'javascript', 'mongodb',
  'postgresql', 'redis', 'kafka', 'ci/cd',
];

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9.#+]/g, '').replace(/^\.+|\.+$/g, '').trim();
}

function tokenize(text) {
  return text.toLowerCase().split(/[\s,;|()]+/).map(normalize).filter(Boolean);
}

function computeReadinessScore({ jdText, evidencedSkills, claimedSkills, knownSkillVocabulary }, threshold = 70) {
  const normalizedVocab = knownSkillVocabulary.map(normalize);
  const normalizedEvidenced = evidencedSkills.map(normalize);
  const normalizedClaimed = claimedSkills.map(normalize);
  const jdTerms = new Set(tokenize(jdText));

  const required = normalizedVocab.filter((w) => jdTerms.has(w));
  const matched = required.filter((w) => normalizedEvidenced.includes(w));
  const missing = required.filter((w) => !normalizedEvidenced.includes(w));
  const flagged = normalizedClaimed.filter((w) => !normalizedEvidenced.includes(w));
  const score = required.length > 0 ? Math.round((100 * matched.length) / required.length) : 50;

  return { required, matched, missing, flagged, score, threshold };
}

// ─── Seed data ───
const SEED_CANDIDATE_ID = 'cand_demo';
const SEED_APPLICATION_ID = 'app_0001';
const SEED_JOB_ID = 'job_seed_0001';

// Evidence for cand_demo
for (const skill of ['react', 'typescript', 'node.js', 'sql', 'git']) {
  candidateSkills.set(`${SEED_CANDIDATE_ID}:${skill}`, {
    id: randomUUID(), candidate_id: SEED_CANDIDATE_ID, skill,
    evidence_type: 'project', evidence_ref: null,
    verified_by: 'seed_admin', created_at: new Date().toISOString(),
  });
}
// Unverified kubernetes claim (will show as flagged)
candidateSkills.set(`${SEED_CANDIDATE_ID}:kubernetes`, {
  id: randomUUID(), candidate_id: SEED_CANDIDATE_ID, skill: 'kubernetes',
  evidence_type: 'manual', evidence_ref: null,
  verified_by: null, created_at: new Date().toISOString(),
});

// Seed candidate
const seedCandidate = {
  id: SEED_CANDIDATE_ID, name: 'Jane Doe', email: 'jane@example.com',
  phone: '+15551234567', location: 'San Francisco, CA',
  work_authorization: 'US Citizen', linkedin_url: 'https://linkedin.com/in/janedoe',
  portfolio_url: null, resume_url: null,
};

// Seed application ticket (approved, in queue)
const seedApplication = {
  id: SEED_APPLICATION_ID, candidate_id: SEED_CANDIDATE_ID, job_id: SEED_JOB_ID,
  status: 'approved', review_status: 'approved',
  resume_url: 'https://storage.example.com/resumes/jane_resume.pdf',
  job_title: 'Senior React Developer', company: 'Acme Corp',
  apply_url: 'https://jobs.greenhouse.io/example/123',
  approved_for_copilot: true,
};

// Seed job
const seedJob = {
  id: SEED_JOB_ID, title: 'Senior React Developer', company: 'Acme Corp',
  location: 'Remote', apply_url: 'https://jobs.greenhouse.io/example/123',
};

console.log(`Seed: candidate=${SEED_CANDIDATE_ID}, app=${SEED_APPLICATION_ID}, skills=6`);

// ─── Auth ───
function requireApiKey(req) {
  const auth = req.headers['authorization'] || '';
  const key = auth.startsWith('Bearer ') ? auth.slice(7).trim() : (req.headers['x-api-key'] || '').trim();
  if (!key) return { body: { error: { code: 'invalid_key', message: 'API key required' } }, status: 401, key: null };
  if (!key.startsWith('tos_')) return { body: { error: { code: 'invalid_key', message: 'Invalid API key format' } }, status: 401, key: null };
  return { body: null, status: 200, key };
}

// ─── Helpers ───
function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({ _parseError: true }); }
    });
  });
}

function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function errorResponse(res, status, code, message, details) {
  sendJSON(res, status, { error: { code, message, details } });
}

function routeMatch(method, url, pattern) {
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$');
  const m = url.match(re);
  return m ? { method, params: m.groups || {} } : null;
}

// ─── Server ───
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method.toUpperCase();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Api-Key,Idempotency-Key,X-TalentOS-Client');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  try {
    // ── Debug endpoint ──
    if (path === '/_debug/state' && method === 'GET') {
      sendJSON(res, 200, {
        candidateSkills: Array.from(candidateSkills.values()),
        extensionCapturedJobs: Array.from(extensionCapturedJobs.values()),
        applicationEvidence: Array.from(applicationEvidence.values()),
        seedCandidate, seedApplication, seedJob,
      });
      return;
    }

    const auth = requireApiKey(req);
    if (auth.body) { sendJSON(res, auth.status, auth.body); return; }

    // ── POST /capture-job ──
    if (path === '/capture-job' && method === 'POST') {
      const body = await readBody(req);
      if (body._parseError) return errorResponse(res, 400, 'validation_error', 'Invalid JSON body');
      if (!body.title || !body.applyUrl || !body.jdText) {
        return errorResponse(res, 400, 'validation_error', 'title, applyUrl, and jdText are required');
      }
      const idemKey = req.headers['idempotency-key'];
      if (idemKey && idempotencyKeys.has(idemKey)) {
        return sendJSON(res, 200, { jobId: idempotencyKeys.get(idemKey).id, duplicate: true });
      }
      // Check applyUrl uniqueness
      for (const j of extensionCapturedJobs.values()) {
        if (j.apply_url === body.applyUrl) {
          return sendJSON(res, 200, { jobId: j.id, duplicate: true });
        }
      }
      const jobId = randomUUID();
      extensionCapturedJobs.set(jobId, {
        id: jobId, title: body.title, company: body.company || null,
        location: body.location || null, jd_text: body.jdText,
        apply_url: body.applyUrl, source_site: body.sourceSite || null,
        salary: body.salary || null, ats_detected: body.atsDetected || null,
        screenshot_url: body.screenshotUrl || null,
        idempotency_key: idemKey || null,
        captured_at: new Date().toISOString(),
        promoted_job_id: null, created_at: new Date().toISOString(),
      });
      if (idemKey) idempotencyKeys.set(idemKey, { id: jobId, ts: Date.now() });
      sendJSON(res, 201, { jobId, duplicate: false });
      return;
    }

    // ── GET /queue/next ──
    if (path === '/queue/next' && method === 'GET') {
      const candidateId = url.searchParams.get('candidateId');
      if (!candidateId) return errorResponse(res, 400, 'validation_error', 'candidateId required');
      if (candidateId !== SEED_CANDIDATE_ID) {
        return errorResponse(res, 404, 'queue_empty', 'No approved application tickets for this candidate');
      }
      sendJSON(res, 200, {
        ticket: {
          applicationId: seedApplication.id,
          jobTitle: seedJob.title,
          company: seedJob.company,
          applyUrl: seedJob.apply_url,
          profile: {
            name: seedCandidate.name,
            email: seedCandidate.email,
            phone: seedCandidate.phone,
            location: seedCandidate.location,
            workAuthorization: seedCandidate.work_authorization,
            linkedin: seedCandidate.linkedin_url,
            portfolio: seedCandidate.portfolio_url,
            resumeUrl: seedApplication.resume_url,
          },
        },
      });
      return;
    }

    // ── POST /readiness/preview (must come BEFORE /readiness/:applicationId) ──
    if (path === '/readiness/preview' && method === 'POST') {
      const body = await readBody(req);
      if (!body.jdText) return errorResponse(res, 400, 'validation_error', 'jdText is required');
      const skills = Array.from(candidateSkills.values()).filter((s) => s.candidate_id === SEED_CANDIDATE_ID);
      const evidenced = skills.filter((s) => s.verified_by).map((s) => s.skill);
      const claimed = skills.map((s) => s.skill);
      const result = computeReadinessScore({ jdText: body.jdText, evidencedSkills: evidenced, claimedSkills: claimed, knownSkillVocabulary: KNOWN_SKILL_VOCABULARY });
      sendJSON(res, 200, result);
      return;
    }

    // ── GET /readiness/:applicationId ──
    const readinessGet = routeMatch('GET', path, '/readiness/:applicationId');
    if (readinessGet) {
      const { applicationId } = readinessGet.params;
      if (applicationId !== SEED_APPLICATION_ID) {
        return errorResponse(res, 404, 'not_found', 'Application not found');
      }
      const skills = Array.from(candidateSkills.values()).filter((s) => s.candidate_id === SEED_CANDIDATE_ID);
      const evidenced = skills.filter((s) => s.verified_by).map((s) => s.skill);
      const claimed = skills.map((s) => s.skill);
      const jdText = `We need React, TypeScript, Node.js, SQL, Git, Kubernetes, Docker, AWS, Terraform, and CI/CD experience.`;
      const result = computeReadinessScore({ jdText, evidencedSkills: evidenced, claimedSkills: claimed, knownSkillVocabulary: KNOWN_SKILL_VOCABULARY });
      sendJSON(res, 200, result);
      return;
    }

    // ── POST /evidence ──
    if (path === '/evidence' && method === 'POST') {
      const body = await readBody(req);
      if (!body.applicationId) return errorResponse(res, 400, 'validation_error', 'applicationId is required');
      // Idempotent by app + screenshot hash
      const key = `${body.applicationId}:${(body.screenshotUrl || '').slice(0, 64)}`;
      for (const e of applicationEvidence.values()) {
        if (e._dedup_key === key) return sendJSON(res, 200, { evidenceId: e.id, duplicate: true });
      }
      const evidenceId = randomUUID();
      applicationEvidence.set(evidenceId, {
        id: evidenceId, application_id: body.applicationId,
        screenshot_url: body.screenshotUrl || null,
        confirmation_scrape: body.confirmationScrape || null,
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        _dedup_key: key,
      });
      sendJSON(res, 201, { evidenceId, duplicate: false });
      return;
    }

    // ── GET /adapters/manifest ──
    if (path === '/adapters/manifest' && method === 'GET') {
      try {
        const { readFileSync } = await import('fs');
        const manifest = JSON.parse(readFileSync('packages/ats-adapters/manifest.json', 'utf-8'));
        sendJSON(res, 200, manifest);
      } catch {
        // Serve inlined manifest fallback
        sendJSON(res, 200, {
          manifestVersion: '1.0.0',
          updatedAt: new Date().toISOString(),
          adapters: [
            { name: 'greenhouse', version: '1.0.0', maturity: 'verified', checksum: 'gh-v1-abcd' },
            { name: 'lever', version: '1.0.0', maturity: 'draft', checksum: 'lv-v1-abcd' },
            { name: 'ashby', version: '1.0.0', maturity: 'draft', checksum: 'ab-v1-abcd' },
            { name: 'workday', version: '1.0.0', maturity: 'draft', checksum: 'stub' },
            { name: 'icims', version: '1.0.0', maturity: 'draft', checksum: 'stub' },
          ],
        });
      }
      return;
    }

    // ── Not found ──
    errorResponse(res, 404, 'not_found', `No route for ${method} ${path}`);
  } catch (err) {
    console.error('Server error:', err);
    errorResponse(res, 500, 'internal_error', 'Internal server error', { detail: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`A4 Mock Server → http://localhost:${PORT}`);
  console.log(`Debug state → http://localhost:${PORT}/_debug/state`);
  console.log(`Accept any key starting with "tos_"`);
});
