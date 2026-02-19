-- ============================================================
-- ILMSTACK HEALTH — Guidelines & Clinical Roles Migration
-- ============================================================

-- ── 1. Clinical role fields on profiles ──────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS clinical_role TEXT NOT NULL DEFAULT 'other'
    CHECK (clinical_role IN ('intern','resident','senior_registrar','consultant','specialist','other')),
  ADD COLUMN IF NOT EXISTS resident_year SMALLINT
    CHECK (resident_year IS NULL OR resident_year BETWEEN 1 AND 5);

-- ── 2. guidelines table ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS guidelines (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  content        TEXT        NOT NULL DEFAULT '',
  category       TEXT        NOT NULL DEFAULT 'general',
  specialty      TEXT,
  status         TEXT        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  min_edit_clinical_role TEXT NOT NULL DEFAULT 'any_editor'
    CHECK (min_edit_clinical_role IN ('any_editor', 'r3_resident_plus', 'senior_registrar', 'consultant_only')),
  version        INT         NOT NULL DEFAULT 1,
  created_by     UUID        NOT NULL REFERENCES auth.users(id),
  updated_by     UUID        NOT NULL REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE guidelines ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_guidelines_updated_at
  BEFORE UPDATE ON guidelines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 3. guideline_versions table ──────────────────────────────

CREATE TABLE IF NOT EXISTS guideline_versions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  guideline_id   UUID        NOT NULL REFERENCES guidelines(id) ON DELETE CASCADE,
  version_number INT         NOT NULL,
  title          TEXT        NOT NULL,
  content        TEXT        NOT NULL,
  change_note    TEXT,
  changed_by     UUID        NOT NULL REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE guideline_versions ENABLE ROW LEVEL SECURITY;

-- ── 4. RLS Policies — guidelines ─────────────────────────────

CREATE POLICY "guidelines_select_member"
  ON guidelines FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "guidelines_insert_editor"
  ON guidelines FOR INSERT
  TO authenticated
  WITH CHECK (has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[]));

CREATE POLICY "guidelines_update_editor"
  ON guidelines FOR UPDATE
  TO authenticated
  USING (has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[]));

CREATE POLICY "guidelines_delete_admin"
  ON guidelines FOR DELETE
  TO authenticated
  USING (has_workspace_role(workspace_id, ARRAY['admin']::workspace_role[]));

-- ── 5. RLS Policies — guideline_versions ─────────────────────

CREATE POLICY "guideline_versions_select"
  ON guideline_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guidelines g
      WHERE g.id = guideline_id
        AND is_workspace_member(g.workspace_id)
    )
  );

CREATE POLICY "guideline_versions_insert"
  ON guideline_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guidelines g
      WHERE g.id = guideline_id
        AND has_workspace_role(g.workspace_id, ARRAY['admin', 'editor']::workspace_role[])
    )
  );
