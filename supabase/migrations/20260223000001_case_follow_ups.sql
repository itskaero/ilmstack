-- ============================================================
-- Case Follow-up Timeline
-- Tracks events that happen after the initial case is documented:
-- follow-up visits, re-admissions, lab results, diagnosis changes, etc.
-- ============================================================

CREATE TABLE case_follow_ups (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       uuid        NOT NULL REFERENCES cases(id)    ON DELETE CASCADE,
  author_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_type    text        NOT NULL CHECK (entry_type IN (
                              'follow_up', 'admission', 'discharge',
                              'labs', 'imaging', 'diagnosis_change',
                              'treatment_change', 'procedure', 'referral', 'note'
                            )),
  title         text        NOT NULL,
  content       text,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_follow_ups_case_id      ON case_follow_ups (case_id);
CREATE INDEX idx_case_follow_ups_occurred_at  ON case_follow_ups (case_id, occurred_at DESC);

ALTER TABLE case_follow_ups ENABLE ROW LEVEL SECURITY;

-- Workspace members can read follow-ups for cases in their workspace
CREATE POLICY "members_read_case_follow_ups"
  ON case_follow_ups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = case_follow_ups.case_id
        AND wm.user_id = auth.uid()
    )
  );

-- Contributors, editors, and admins can add follow-up entries
CREATE POLICY "contributors_insert_case_follow_ups"
  ON case_follow_ups FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM cases c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = case_follow_ups.case_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'editor', 'contributor')
    )
  );

-- Authors can delete their own entries; admins/editors can delete any
CREATE POLICY "delete_own_or_admin_case_follow_ups"
  ON case_follow_ups FOR DELETE
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM cases c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = case_follow_ups.case_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'editor')
    )
  );
