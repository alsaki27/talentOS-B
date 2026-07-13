-- TalentOS Extension Schema — additive DDL for Track A (A1 + A3)
-- [MIGRATE] Append to neon/migrations/0001_initial_schema.sql
-- [MIGRATE] Or create new supabase/migrations/<ts>_extension_tables.sql
-- All tables use "create table if not exists" for idempotent apply.
-- FKs reference tables that already exist in the TalentOS Neon schema.

-- A1: Candidate skill ledger
create table if not exists candidate_skills (
  id            uuid primary key default gen_random_uuid(),
  candidate_id  uuid not null references candidates(id) on delete cascade,
  skill         text not null,          -- NORMALIZED lowercase ('react', 'node.js')
  evidence_type text not null check (evidence_type in ('resume','project','certification','work_history','manual')),
  evidence_ref  text,
  verified_by   text,                   -- null = unverified claim (feeds flaggedClaims)
  created_at    timestamptz not null default now(),
  unique (candidate_id, skill)
);

-- A3: Browser profiles (for B2 gate / CLI isolation)
create table if not exists browser_profiles (
  id              uuid primary key default gen_random_uuid(),
  candidate_id    uuid not null unique references candidates(id) on delete cascade,
  marker_hash     text not null,           -- SHA-256 of the .talentos-profile JSON
  chrome_profile  text,                    -- path to the --user-data-dir
  decommissioned_at timestamptz,           -- tombstone: non-null = decommissioned
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- A3: Application evidence (B6)
create table if not exists application_evidence (
  id                uuid primary key default gen_random_uuid(),
  application_id    uuid not null references applications(id) on delete cascade,
  screenshot_url    text,
  confirmation_scrape jsonb,              -- scraped confirmation page content
  submitted_at      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  unique (application_id, screenshot_url) -- idempotent by app+url
);

-- A3: Application outcomes (A7 cron + A8 webhooks)
create table if not exists application_outcomes (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references applications(id) on delete cascade,
  status          text not null,          -- 'submitted', 'rejected', 'offer', 'withdrawn', 'expired'
  source          text not null check (source in ('manual', 'cron', 'webhook')),
  source_detail   text,                   -- webhook source name (e.g. 'greenhouse')
  outcome_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- A3: Extension captured jobs — staging table (human promotes to jobs)
create table if not exists extension_captured_jobs (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  company         text,
  location        text,
  jd_text         text not null,
  apply_url       text not null unique,
  source_site     text,
  salary          text,
  ats_detected    text,
  screenshot_url  text,
  idempotency_key text unique,
  captured_at     timestamptz not null,
  promoted_job_id uuid references jobs(id),  -- set when a human promotes it
  created_at      timestamptz not null default now()
);

-- Indexes
create index if not exists idx_candidate_skills_candidate on candidate_skills(candidate_id);
create index if not exists idx_application_evidence_app on application_evidence(application_id);
create index if not exists idx_application_outcomes_app on application_outcomes(application_id);
create index if not exists idx_extension_captured_jobs_promoted on extension_captured_jobs(promoted_job_id) where promoted_job_id is not null;
