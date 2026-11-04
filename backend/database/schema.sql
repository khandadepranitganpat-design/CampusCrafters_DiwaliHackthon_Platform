-- ==============================================================================
-- CampusCrafters Diwali Hackathon Platform — PostgreSQL Database Schema
-- Canonical Schema Definition based on DATABASE_INTEGRATION.md v1.2.0
-- ==============================================================================

-- Drop tables in reverse order of foreign key dependencies
DROP TABLE IF EXISTS announcement_reads CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS evaluation_scores CASCADE;
DROP TABLE IF EXISTS project_submissions CASCADE;
DROP TABLE IF EXISTS problem_selections CASCADE;
DROP TABLE IF EXISTS team_memberships CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS problem_statements CASCADE;
DROP TABLE IF EXISTS tracks CASCADE;
DROP TABLE IF EXISTS waitlist CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS revoked_tokens CASCADE;
DROP TABLE IF EXISTS event_config CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ------------------------------------------------------------------------------
-- Table 1: users
-- Represents user identities provisioned via SSO or dev accounts.
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(128) NOT NULL,
    college VARCHAR(255) NOT NULL,
    course VARCHAR(128),
    year VARCHAR(64),
    phone VARCHAR(32) UNIQUE,
    bio TEXT,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    roles VARCHAR(32)[] NOT NULL DEFAULT '{"participant"}',
    password_hash VARCHAR(255), -- Dev mock auth only
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (LOWER(email));

-- ------------------------------------------------------------------------------
-- Table 2: tracks
-- Hackathon competition tracks.
-- ------------------------------------------------------------------------------
CREATE TABLE tracks (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    short_description TEXT NOT NULL,
    detailed_description TEXT NOT NULL,
    accent_color VARCHAR(16) NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- ------------------------------------------------------------------------------
-- Table 3: registrations
-- Stores official hackathon registrations and ticket passes.
-- ------------------------------------------------------------------------------
CREATE TABLE registrations (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    ticket_code VARCHAR(32) NOT NULL UNIQUE,
    track_id VARCHAR(64) NOT NULL REFERENCES tracks(id),
    experience VARCHAR(32) NOT NULL,
    interests JSONB DEFAULT '[]'::jsonb,
    rules_accepted BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(32) NOT NULL DEFAULT 'confirmed',
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_registrations_ticket_code ON registrations (ticket_code);
CREATE INDEX idx_registrations_user_id ON registrations (user_id);

-- ------------------------------------------------------------------------------
-- Table 4: waitlist
-- Stores applicant records when event state is full.
-- ------------------------------------------------------------------------------
CREATE TABLE waitlist (
    id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(128) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    college VARCHAR(255),
    track_interest VARCHAR(64) NOT NULL DEFAULT 'any',
    status VARCHAR(32) NOT NULL DEFAULT 'waitlisted',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_waitlist_email ON waitlist (LOWER(email));

-- ------------------------------------------------------------------------------
-- Table 5: problem_statements
-- Challenge prompts within each track.
-- ------------------------------------------------------------------------------
CREATE TABLE problem_statements (
    id VARCHAR(64) PRIMARY KEY,
    track_id VARCHAR(64) NOT NULL REFERENCES tracks(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(32) NOT NULL,
    domain VARCHAR(128) NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    evaluation_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    expected_deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_problem_statements_track ON problem_statements (track_id);

-- ------------------------------------------------------------------------------
-- Table 6: teams
-- Formed teams led by a creator.
-- ------------------------------------------------------------------------------
CREATE TABLE teams (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    join_code VARCHAR(16) NOT NULL UNIQUE,
    track_id VARCHAR(64) NOT NULL REFERENCES tracks(id),
    leader_id VARCHAR(64) NOT NULL REFERENCES users(id),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_teams_join_code ON teams (UPPER(join_code));

-- ------------------------------------------------------------------------------
-- Table 7: team_memberships
-- Enforces 1-team-per-user invariant via UNIQUE(user_id).
-- ------------------------------------------------------------------------------
CREATE TABLE team_memberships (
    id BIGSERIAL PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_memberships_team_id ON team_memberships (team_id);

-- ------------------------------------------------------------------------------
-- Table 8: problem_selections
-- Canonical single source of truth for a team's challenge selection.
-- ------------------------------------------------------------------------------
CREATE TABLE problem_selections (
    id BIGSERIAL PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
    problem_statement_id VARCHAR(64) NOT NULL REFERENCES problem_statements(id),
    selected_by VARCHAR(64) NOT NULL REFERENCES users(id),
    selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- Table 9: project_submissions
-- Project submission drafts and locked records.
-- ------------------------------------------------------------------------------
CREATE TABLE project_submissions (
    id VARCHAR(64) PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
    problem_statement_id VARCHAR(64) REFERENCES problem_statements(id),
    project_title VARCHAR(128) NOT NULL DEFAULT '',
    short_description VARCHAR(255) NOT NULL DEFAULT '',
    detailed_description TEXT NOT NULL DEFAULT '',
    repository_url VARCHAR(512) NOT NULL DEFAULT '',
    demo_url VARCHAR(512) DEFAULT '',
    presentation_url VARCHAR(512) DEFAULT '',
    tech_stack JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- Table 10: announcements & announcement_reads
-- System announcements and per-user read tracking.
-- ------------------------------------------------------------------------------
CREATE TABLE announcements (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(64) NOT NULL,
    priority VARCHAR(32) NOT NULL DEFAULT 'normal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_category ON announcements (category);
CREATE INDEX idx_announcements_priority ON announcements (priority);

CREATE TABLE announcement_reads (
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    announcement_id VARCHAR(64) NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, announcement_id)
);

-- ------------------------------------------------------------------------------
-- Table 11: revoked_tokens
-- Server-side token denylist for logout.
-- ------------------------------------------------------------------------------
CREATE TABLE revoked_tokens (
    jti VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revoked_tokens_expires ON revoked_tokens (expires_at);

-- ------------------------------------------------------------------------------
-- Table 12: evaluation_scores
-- Judge rubric evaluation scores.
-- ------------------------------------------------------------------------------
CREATE TABLE evaluation_scores (
    id BIGSERIAL PRIMARY KEY,
    submission_id VARCHAR(64) NOT NULL REFERENCES project_submissions(id) ON DELETE CASCADE,
    judge_id VARCHAR(64) NOT NULL REFERENCES users(id),
    innovation_score INT NOT NULL CHECK (innovation_score >= 0 AND innovation_score <= 30),
    technical_score INT NOT NULL CHECK (technical_score >= 0 AND technical_score <= 30),
    uiux_score INT NOT NULL CHECK (uiux_score >= 0 AND uiux_score <= 20),
    impact_score INT NOT NULL CHECK (impact_score >= 0 AND impact_score <= 20),
    total_score INT NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
    feedback TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_submission_judge UNIQUE (submission_id, judge_id),
    CONSTRAINT ck_total_score_sum CHECK (total_score = innovation_score + technical_score + uiux_score + impact_score)
);

-- ------------------------------------------------------------------------------
-- Table 13: event_config
-- Global platform lifecycle configuration.
-- ------------------------------------------------------------------------------
CREATE TABLE event_config (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(64) REFERENCES users(id)
);

