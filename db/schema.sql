CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('candidate', 'hrd')),
  company_name TEXT,
  industry TEXT,
  legal_number TEXT,
  phone TEXT,
  portfolio_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS industry TEXT;

CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  hrd_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL,
  salary_range TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'flagged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_matches (
  id BIGSERIAL PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL DEFAULT 0 CHECK (match_score BETWEEN 0 AND 100),
  candidate_feedback TEXT NOT NULL DEFAULT '',
  hr_strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  hr_gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  interview_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_confidence INTEGER NOT NULL DEFAULT 0,
  ai_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_criteria_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

ALTER TABLE job_matches ADD COLUMN IF NOT EXISTS ai_confidence INTEGER NOT NULL DEFAULT 0;
ALTER TABLE job_matches ADD COLUMN IF NOT EXISTS ai_evidence JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE job_matches ADD COLUMN IF NOT EXISTS ai_criteria_scores JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS candidate_profiles (
  candidate_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cv_text TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id BIGSERIAL PRIMARY KEY,
  job_match_id BIGINT NOT NULL REFERENCES job_matches(id) ON DELETE CASCADE,
  candidate_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shortlisted', 'rejected')),
  screening_status TEXT NOT NULL DEFAULT 'not_started',
  screening_step SMALLINT NOT NULL DEFAULT 0,
  screening_started_at TIMESTAMPTZ,
  screening_completed_at TIMESTAMPTZ,
  screening_error TEXT,
  applied_at DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(candidate_id, job_id)
);

ALTER TABLE applications ADD COLUMN IF NOT EXISTS screening_status TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS screening_step SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS screening_started_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS screening_completed_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS screening_error TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_screening_status_check') THEN
    ALTER TABLE applications ADD CONSTRAINT applications_screening_status_check
      CHECK (screening_status IN ('not_started', 'processing', 'completed', 'failed'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS applications_screening_idx ON applications(job_id, screening_status);

CREATE TABLE IF NOT EXISTS application_documents (
  application_id BIGINT PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT,
  portfolio_url TEXT,
  cover_letter TEXT NOT NULL DEFAULT '',
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_path TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hrd_ai_settings (
  hrd_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  skill_weight INTEGER NOT NULL DEFAULT 60 CHECK (skill_weight BETWEEN 0 AND 100),
  experience_weight INTEGER NOT NULL DEFAULT 30 CHECK (experience_weight BETWEEN 0 AND 100),
  education_weight INTEGER NOT NULL DEFAULT 10 CHECK (education_weight BETWEEN 0 AND 100),
  review_threshold INTEGER NOT NULL DEFAULT 60 CHECK (review_threshold BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (skill_weight + experience_weight + education_weight = 100)
);

CREATE TABLE IF NOT EXISTS interviews (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  meeting_url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  candidate_response TEXT NOT NULL DEFAULT 'pending' CHECK (candidate_response IN ('pending', 'confirmed', 'reschedule_requested')),
  reschedule_message TEXT NOT NULL DEFAULT '',
  reschedule_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_response TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS reschedule_message TEXT NOT NULL DEFAULT '';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS reschedule_requested_at TIMESTAMPTZ;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interviews_candidate_response_check') THEN
    ALTER TABLE interviews ADD CONSTRAINT interviews_candidate_response_check
      CHECK (candidate_response IN ('pending', 'confirmed', 'reschedule_requested'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS interviews_scheduled_idx ON interviews(scheduled_at);

ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS applicant_name TEXT NOT NULL DEFAULT '';
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS applicant_email TEXT NOT NULL DEFAULT '';
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS applicant_phone TEXT;
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS portfolio_url TEXT;

CREATE INDEX IF NOT EXISTS jobs_status_created_idx ON jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_hrd_idx ON jobs(hrd_id);
CREATE INDEX IF NOT EXISTS applications_candidate_idx ON applications(candidate_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS applications_job_idx ON applications(job_id, status);
