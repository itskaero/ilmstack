-- ============================================================
-- ILMSTACK HEALTH — Initial Schema Migration
-- Version: 1.0.0
-- Description: Core multi-tenant SaaS schema with RLS
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for full-text search

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE workspace_role AS ENUM ('admin', 'editor', 'contributor', 'viewer');
CREATE TYPE note_status AS ENUM ('draft', 'under_review', 'approved', 'published', 'archived');
CREATE TYPE case_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE review_status AS ENUM ('pending', 'in_review', 'approved', 'changes_requested', 'rejected');
CREATE TYPE review_action_type AS ENUM (
  'submitted', 'assigned', 'approved', 'rejected',
  'changes_requested', 'comment_added', 'revision_submitted', 'reopened'
);
CREATE TYPE journal_status AS ENUM ('generating', 'draft', 'published', 'archived');
CREATE TYPE comment_type AS ENUM ('general', 'inline', 'review');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- ============================================================
-- UTILITY FUNCTION: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE: profiles (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  specialty   TEXT,
  title       TEXT, -- Dr., Prof., Mr., etc.
  bio         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: workspaces (tenants / hospitals)
-- ============================================================

CREATE TABLE workspaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  description     TEXT,
  logo_url        TEXT,
  primary_color   TEXT DEFAULT '#0ea5e9',
  plan            TEXT NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free', 'starter', 'professional', 'enterprise')),
  settings        JSONB NOT NULL DEFAULT '{}',
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_workspaces_slug ON workspaces(slug);

-- ============================================================
-- TABLE: workspace_members
-- ============================================================

CREATE TABLE workspace_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          workspace_role NOT NULL DEFAULT 'viewer',
  invited_by    UUID REFERENCES profiles(id),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);

-- ============================================================
-- TABLE: workspace_invitations
-- ============================================================

CREATE TABLE workspace_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          workspace_role NOT NULL DEFAULT 'contributor',
  token         TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  status        invitation_status NOT NULL DEFAULT 'pending',
  invited_by    UUID NOT NULL REFERENCES profiles(id),
  accepted_by   UUID REFERENCES profiles(id),
  accepted_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX idx_invitations_token ON workspace_invitations(token);
CREATE INDEX idx_invitations_email ON workspace_invitations(email);

-- ============================================================
-- TABLE: topics (hierarchical taxonomy)
-- ============================================================

CREATE TABLE topics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id     UUID REFERENCES topics(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  description   TEXT,
  color         TEXT,
  icon          TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, parent_id, slug)
);

CREATE INDEX idx_topics_workspace_id ON topics(workspace_id);
CREATE INDEX idx_topics_parent_id ON topics(parent_id);

-- ============================================================
-- TABLE: tags
-- ============================================================

CREATE TABLE tags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#64748b',
  created_by    UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_tags_workspace_id ON tags(workspace_id);

-- ============================================================
-- TABLE: notes (core entity)
-- ============================================================

CREATE TABLE notes (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  topic_id               UUID REFERENCES topics(id) ON DELETE SET NULL,
  author_id              UUID NOT NULL REFERENCES profiles(id),
  title                  TEXT NOT NULL,
  content                TEXT NOT NULL DEFAULT '',
  content_html           TEXT,
  status                 note_status NOT NULL DEFAULT 'draft',
  recommend_for_journal  BOOLEAN NOT NULL DEFAULT FALSE,
  current_version        INT NOT NULL DEFAULT 1,
  view_count             INT NOT NULL DEFAULT 0,
  published_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- full-text search vector
  search_vector          TSVECTOR
    GENERATED ALWAYS AS (
      to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
    ) STORED
);

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_notes_workspace_id ON notes(workspace_id);
CREATE INDEX idx_notes_author_id ON notes(author_id);
CREATE INDEX idx_notes_topic_id ON notes(topic_id);
CREATE INDEX idx_notes_status ON notes(workspace_id, status);
CREATE INDEX idx_notes_search ON notes USING GIN(search_vector);
CREATE INDEX idx_notes_updated_at ON notes(workspace_id, updated_at DESC);

-- ============================================================
-- TABLE: note_tags (junction)
-- ============================================================

CREATE TABLE note_tags (
  note_id  UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(note_id, tag_id)
);

CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);

-- ============================================================
-- TABLE: note_versions (version history)
-- ============================================================

CREATE TABLE note_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  version_number  INT NOT NULL,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  changed_by      UUID NOT NULL REFERENCES profiles(id),
  change_summary  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(note_id, version_number)
);

CREATE INDEX idx_note_versions_note_id ON note_versions(note_id);

-- ============================================================
-- TABLE: note_attachments (file uploads)
-- ============================================================

CREATE TABLE note_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id       UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  uploader_id   UUID NOT NULL REFERENCES profiles(id),
  file_name     TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_size     BIGINT NOT NULL,
  mime_type     TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_note_attachments_note_id ON note_attachments(note_id);

-- ============================================================
-- TABLE: note_comments (discussion + inline)
-- ============================================================

CREATE TABLE note_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id       UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES profiles(id),
  parent_id     UUID REFERENCES note_comments(id) ON DELETE CASCADE,
  comment_type  comment_type NOT NULL DEFAULT 'general',
  content       TEXT NOT NULL,
  resolved      BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by   UUID REFERENCES profiles(id),
  resolved_at   TIMESTAMPTZ,
  -- For inline comments: "line:42" or anchor reference
  anchor_ref    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER note_comments_updated_at
  BEFORE UPDATE ON note_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_note_comments_note_id ON note_comments(note_id);
CREATE INDEX idx_note_comments_parent_id ON note_comments(parent_id);

-- ============================================================
-- TABLE: review_requests
-- ============================================================

CREATE TABLE review_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id       UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  requested_by  UUID NOT NULL REFERENCES profiles(id),
  reviewer_id   UUID REFERENCES profiles(id),
  status        review_status NOT NULL DEFAULT 'pending',
  priority      TEXT NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date      DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER review_requests_updated_at
  BEFORE UPDATE ON review_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_review_requests_workspace_id ON review_requests(workspace_id);
CREATE INDEX idx_review_requests_note_id ON review_requests(note_id);
CREATE INDEX idx_review_requests_reviewer_id ON review_requests(reviewer_id);
CREATE INDEX idx_review_requests_status ON review_requests(workspace_id, status);

-- ============================================================
-- TABLE: review_actions (immutable audit trail)
-- ============================================================

CREATE TABLE review_actions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_request_id   UUID NOT NULL REFERENCES review_requests(id) ON DELETE CASCADE,
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id            UUID NOT NULL REFERENCES profiles(id),
  action              review_action_type NOT NULL,
  note                TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_actions_review_request_id ON review_actions(review_request_id);
CREATE INDEX idx_review_actions_workspace_id ON review_actions(workspace_id, created_at DESC);

-- ============================================================
-- TABLE: cases (structured medical cases)
-- ============================================================

CREATE TABLE cases (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  author_id             UUID NOT NULL REFERENCES profiles(id),
  topic_id              UUID REFERENCES topics(id) ON DELETE SET NULL,
  title                 TEXT NOT NULL,
  status                case_status NOT NULL DEFAULT 'draft',
  -- Structured sections (stored as markdown text)
  presentation          TEXT,
  history               TEXT,
  examination           TEXT,
  investigations        TEXT,
  management_timeline   JSONB NOT NULL DEFAULT '[]',
  outcome               TEXT,
  learning_points       TEXT,
  -- Anonymized patient metadata
  patient_age_range     TEXT,
  patient_gender        TEXT CHECK (patient_gender IN ('male', 'female', 'other', 'not_disclosed')),
  specialty             TEXT,
  diagnosis             TEXT,
  icd_codes             TEXT[] NOT NULL DEFAULT '{}',
  view_count            INT NOT NULL DEFAULT 0,
  published_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_vector         TSVECTOR
    GENERATED ALWAYS AS (
      to_tsvector('english',
        coalesce(title, '') || ' ' ||
        coalesce(diagnosis, '') || ' ' ||
        coalesce(learning_points, '') || ' ' ||
        coalesce(presentation, '')
      )
    ) STORED
);

CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_cases_workspace_id ON cases(workspace_id);
CREATE INDEX idx_cases_author_id ON cases(author_id);
CREATE INDEX idx_cases_topic_id ON cases(topic_id);
CREATE INDEX idx_cases_status ON cases(workspace_id, status);
CREATE INDEX idx_cases_search ON cases USING GIN(search_vector);

-- ============================================================
-- TABLE: case_tags (junction)
-- ============================================================

CREATE TABLE case_tags (
  case_id  UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(case_id, tag_id)
);

CREATE INDEX idx_case_tags_tag_id ON case_tags(tag_id);

-- ============================================================
-- TABLE: case_imaging
-- ============================================================

CREATE TABLE case_imaging (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  uploader_id   UUID NOT NULL REFERENCES profiles(id),
  caption       TEXT,
  modality      TEXT, -- XR, CT, MRI, US, ECG, etc.
  file_url      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_size     BIGINT NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_case_imaging_case_id ON case_imaging(case_id);

-- ============================================================
-- TABLE: journals (monthly department journals)
-- ============================================================

CREATE TABLE journals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  period_year     INT NOT NULL,
  period_month    INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  status          journal_status NOT NULL DEFAULT 'draft',
  editorial_note  TEXT,
  cover_image_url TEXT,
  pdf_url         TEXT,
  pdf_storage_path TEXT,
  generated_by    UUID NOT NULL REFERENCES profiles(id),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, period_year, period_month)
);

CREATE TRIGGER journals_updated_at
  BEFORE UPDATE ON journals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_journals_workspace_id ON journals(workspace_id, period_year DESC, period_month DESC);

-- ============================================================
-- TABLE: journal_entries
-- ============================================================

CREATE TABLE journal_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id    UUID NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
  note_id       UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  section       TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  featured      BOOLEAN NOT NULL DEFAULT FALSE,
  added_by      UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(journal_id, note_id)
);

CREATE INDEX idx_journal_entries_journal_id ON journal_entries(journal_id, sort_order);

-- ============================================================
-- TABLE: audit_logs (workspace event log)
-- ============================================================

CREATE TABLE audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id       UUID REFERENCES profiles(id),
  action         TEXT NOT NULL,
  resource_type  TEXT NOT NULL,
  resource_id    UUID,
  metadata       JSONB NOT NULL DEFAULT '{}',
  ip_address     INET,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_workspace_id ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(workspace_id, resource_type, resource_id);

-- ============================================================
-- ROW LEVEL SECURITY: Enable on all tables
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_imaging ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: get caller's workspace role
-- ============================================================

CREATE OR REPLACE FUNCTION get_workspace_role(p_workspace_id UUID)
RETURNS workspace_role AS $$
  SELECT role FROM workspace_members
  WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_workspace_role(p_workspace_id UUID, p_roles workspace_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role = ANY(p_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS POLICIES: profiles
-- ============================================================

-- Users can read any profile (needed for displaying names/avatars)
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (TRUE);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Profiles are inserted via trigger on auth.users
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================
-- RLS POLICIES: workspaces
-- ============================================================

CREATE POLICY "workspaces_select_member"
  ON workspaces FOR SELECT
  TO authenticated
  USING (is_workspace_member(id));

CREATE POLICY "workspaces_insert_authenticated"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "workspaces_update_admin"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (has_workspace_role(id, ARRAY['admin']::workspace_role[]))
  WITH CHECK (has_workspace_role(id, ARRAY['admin']::workspace_role[]));

-- ============================================================
-- RLS POLICIES: workspace_members
-- ============================================================

CREATE POLICY "workspace_members_select_member"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_insert_admin"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[]));

CREATE POLICY "workspace_members_update_admin"
  ON workspace_members FOR UPDATE
  TO authenticated
  USING (has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[]))
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[]));

CREATE POLICY "workspace_members_delete_admin"
  ON workspace_members FOR DELETE
  TO authenticated
  USING (
    has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[])
    OR user_id = auth.uid() -- allow self-removal
  );

-- ============================================================
-- RLS POLICIES: workspace_invitations
-- ============================================================

CREATE POLICY "invitations_select_admin_or_invitee"
  ON workspace_invitations FOR SELECT
  TO authenticated
  USING (
    has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[])
    OR email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "invitations_insert_admin"
  ON workspace_invitations FOR INSERT
  TO authenticated
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[]));

CREATE POLICY "invitations_update_admin"
  ON workspace_invitations FOR UPDATE
  TO authenticated
  USING (has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[]));

CREATE POLICY "invitations_delete_admin"
  ON workspace_invitations FOR DELETE
  TO authenticated
  USING (has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[]));

-- ============================================================
-- RLS POLICIES: topics
-- ============================================================

CREATE POLICY "topics_select_member"
  ON topics FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "topics_insert_editor_or_admin"
  ON topics FOR INSERT
  TO authenticated
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[]));

CREATE POLICY "topics_update_editor_or_admin"
  ON topics FOR UPDATE
  TO authenticated
  USING (has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[]));

CREATE POLICY "topics_delete_admin"
  ON topics FOR DELETE
  TO authenticated
  USING (has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[]));

-- ============================================================
-- RLS POLICIES: tags
-- ============================================================

CREATE POLICY "tags_select_member"
  ON tags FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "tags_insert_contributor_plus"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['admin', 'editor', 'contributor']::workspace_role[]));

CREATE POLICY "tags_update_editor_or_admin"
  ON tags FOR UPDATE
  TO authenticated
  USING (has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[]));

CREATE POLICY "tags_delete_admin"
  ON tags FOR DELETE
  TO authenticated
  USING (has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[]));

-- ============================================================
-- RLS POLICIES: notes
-- ============================================================

CREATE POLICY "notes_select_member"
  ON notes FOR SELECT
  TO authenticated
  USING (
    is_workspace_member(workspace_id) AND (
      -- Admins and editors see all notes
      has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[])
      -- Authors see their own drafts
      OR author_id = auth.uid()
      -- Others see non-draft notes
      OR status != 'draft'
    )
  );

CREATE POLICY "notes_insert_contributor_plus"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (
    has_workspace_role(workspace_id, ARRAY['admin', 'editor', 'contributor']::workspace_role[])
    AND author_id = auth.uid()
  );

CREATE POLICY "notes_update_author_or_editor"
  ON notes FOR UPDATE
  TO authenticated
  USING (
    is_workspace_member(workspace_id) AND (
      has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[])
      OR author_id = auth.uid()
    )
  )
  WITH CHECK (
    is_workspace_member(workspace_id) AND (
      has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[])
      OR author_id = auth.uid()
    )
  );

CREATE POLICY "notes_delete_author_or_admin"
  ON notes FOR DELETE
  TO authenticated
  USING (
    has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[])
    OR (author_id = auth.uid() AND status = 'draft')
  );

-- ============================================================
-- RLS POLICIES: note_tags
-- ============================================================

CREATE POLICY "note_tags_select_member"
  ON note_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = note_id AND is_workspace_member(n.workspace_id)
    )
  );

CREATE POLICY "note_tags_manage_author_or_editor"
  ON note_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = note_id AND (
        has_workspace_role(n.workspace_id, ARRAY['admin', 'editor']::workspace_role[])
        OR n.author_id = auth.uid()
      )
    )
  );

-- ============================================================
-- RLS POLICIES: note_versions
-- ============================================================

CREATE POLICY "note_versions_select_member"
  ON note_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = note_id AND is_workspace_member(n.workspace_id)
    )
  );

CREATE POLICY "note_versions_insert_system"
  ON note_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = note_id AND (
        has_workspace_role(n.workspace_id, ARRAY['admin', 'editor']::workspace_role[])
        OR n.author_id = auth.uid()
      )
    )
  );

-- ============================================================
-- RLS POLICIES: note_attachments
-- ============================================================

CREATE POLICY "note_attachments_select_member"
  ON note_attachments FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "note_attachments_insert_contributor_plus"
  ON note_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    has_workspace_role(workspace_id, ARRAY['admin', 'editor', 'contributor']::workspace_role[])
    AND uploader_id = auth.uid()
  );

CREATE POLICY "note_attachments_delete_uploader_or_admin"
  ON note_attachments FOR DELETE
  TO authenticated
  USING (
    has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[])
    OR uploader_id = auth.uid()
  );

-- ============================================================
-- RLS POLICIES: note_comments
-- ============================================================

CREATE POLICY "note_comments_select_member"
  ON note_comments FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "note_comments_insert_member"
  ON note_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    is_workspace_member(workspace_id)
    AND author_id = auth.uid()
  );

CREATE POLICY "note_comments_update_author_or_admin"
  ON note_comments FOR UPDATE
  TO authenticated
  USING (
    has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[])
    OR author_id = auth.uid()
  );

CREATE POLICY "note_comments_delete_author_or_admin"
  ON note_comments FOR DELETE
  TO authenticated
  USING (
    has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[])
    OR author_id = auth.uid()
  );

-- ============================================================
-- RLS POLICIES: review_requests
-- ============================================================

CREATE POLICY "review_requests_select_member"
  ON review_requests FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "review_requests_insert_contributor_plus"
  ON review_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    has_workspace_role(workspace_id, ARRAY['admin', 'editor', 'contributor']::workspace_role[])
    AND requested_by = auth.uid()
  );

CREATE POLICY "review_requests_update_editor_plus"
  ON review_requests FOR UPDATE
  TO authenticated
  USING (has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[]));

-- ============================================================
-- RLS POLICIES: review_actions
-- ============================================================

CREATE POLICY "review_actions_select_member"
  ON review_actions FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "review_actions_insert_editor_plus"
  ON review_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[])
    AND actor_id = auth.uid()
  );

-- ============================================================
-- RLS POLICIES: cases
-- ============================================================

CREATE POLICY "cases_select_member"
  ON cases FOR SELECT
  TO authenticated
  USING (
    is_workspace_member(workspace_id) AND (
      has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[])
      OR author_id = auth.uid()
      OR status != 'draft'
    )
  );

CREATE POLICY "cases_insert_contributor_plus"
  ON cases FOR INSERT
  TO authenticated
  WITH CHECK (
    has_workspace_role(workspace_id, ARRAY['admin', 'editor', 'contributor']::workspace_role[])
    AND author_id = auth.uid()
  );

CREATE POLICY "cases_update_author_or_editor"
  ON cases FOR UPDATE
  TO authenticated
  USING (
    has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[])
    OR author_id = auth.uid()
  );

CREATE POLICY "cases_delete_author_or_admin"
  ON cases FOR DELETE
  TO authenticated
  USING (
    has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[])
    OR (author_id = auth.uid() AND status = 'draft')
  );

-- ============================================================
-- RLS POLICIES: case_tags
-- ============================================================

CREATE POLICY "case_tags_select_member"
  ON case_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id AND is_workspace_member(c.workspace_id)
    )
  );

CREATE POLICY "case_tags_manage_author_or_editor"
  ON case_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id AND (
        has_workspace_role(c.workspace_id, ARRAY['admin', 'editor']::workspace_role[])
        OR c.author_id = auth.uid()
      )
    )
  );

-- ============================================================
-- RLS POLICIES: case_imaging
-- ============================================================

CREATE POLICY "case_imaging_select_member"
  ON case_imaging FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "case_imaging_insert_contributor_plus"
  ON case_imaging FOR INSERT
  TO authenticated
  WITH CHECK (
    has_workspace_role(workspace_id, ARRAY['admin', 'editor', 'contributor']::workspace_role[])
    AND uploader_id = auth.uid()
  );

CREATE POLICY "case_imaging_delete_uploader_or_admin"
  ON case_imaging FOR DELETE
  TO authenticated
  USING (
    has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[])
    OR uploader_id = auth.uid()
  );

-- ============================================================
-- RLS POLICIES: journals
-- ============================================================

CREATE POLICY "journals_select_member"
  ON journals FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "journals_insert_editor_plus"
  ON journals FOR INSERT
  TO authenticated
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[]));

CREATE POLICY "journals_update_editor_plus"
  ON journals FOR UPDATE
  TO authenticated
  USING (has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[]));

CREATE POLICY "journals_delete_admin"
  ON journals FOR DELETE
  TO authenticated
  USING (has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[]));

-- ============================================================
-- RLS POLICIES: journal_entries
-- ============================================================

CREATE POLICY "journal_entries_select_member"
  ON journal_entries FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "journal_entries_manage_editor_plus"
  ON journal_entries FOR ALL
  TO authenticated
  USING (has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[]))
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[]));

-- ============================================================
-- RLS POLICIES: audit_logs
-- ============================================================

CREATE POLICY "audit_logs_select_admin"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[]));

CREATE POLICY "audit_logs_insert_member"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(workspace_id));

-- ============================================================
-- TRIGGER: Auto-create profile on user sign-up
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: Auto-version notes on content change
-- ============================================================

CREATE OR REPLACE FUNCTION create_note_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only snapshot if content or title changed
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO note_versions (note_id, version_number, title, content, changed_by, change_summary)
    VALUES (OLD.id, OLD.current_version, OLD.title, OLD.content, auth.uid(), 'Auto-saved version');

    NEW.current_version = OLD.current_version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notes_auto_version
  BEFORE UPDATE ON notes
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title)
  EXECUTE FUNCTION create_note_version();

-- ============================================================
-- FUNCTION: Increment view count (bypass RLS for counter)
-- ============================================================

CREATE OR REPLACE FUNCTION increment_note_views(p_note_id UUID)
RETURNS VOID AS $$
  UPDATE notes SET view_count = view_count + 1 WHERE id = p_note_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_case_views(p_case_id UUID)
RETURNS VOID AS $$
  UPDATE cases SET view_count = view_count + 1 WHERE id = p_case_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Get workspace stats
-- ============================================================

CREATE OR REPLACE FUNCTION get_workspace_stats(p_workspace_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Validate caller is a member
  IF NOT is_workspace_member(p_workspace_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'notes_total',     (SELECT COUNT(*) FROM notes WHERE workspace_id = p_workspace_id),
    'notes_published', (SELECT COUNT(*) FROM notes WHERE workspace_id = p_workspace_id AND status = 'published'),
    'notes_pending',   (SELECT COUNT(*) FROM notes WHERE workspace_id = p_workspace_id AND status = 'under_review'),
    'cases_total',     (SELECT COUNT(*) FROM cases WHERE workspace_id = p_workspace_id),
    'members_total',   (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = p_workspace_id),
    'journals_total',  (SELECT COUNT(*) FROM journals WHERE workspace_id = p_workspace_id AND status = 'published')
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- STORAGE BUCKETS (run in Supabase dashboard or via CLI)
-- ============================================================
-- NOTE: These are declarative — run separately via Supabase CLI:
--
-- supabase storage create note-attachments --public=false
-- supabase storage create case-imaging --public=false
-- supabase storage create journal-covers --public=true
-- supabase storage create journal-pdfs --public=true
-- supabase storage create workspace-assets --public=true
-- supabase storage create avatars --public=true
