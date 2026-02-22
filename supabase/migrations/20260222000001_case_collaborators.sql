-- ============================================================
-- ILMSTACK HEALTH — Case Collaborators
-- Case authors and admins can assign workspace members as
-- collaborators. Collaborators gain edit access to that case
-- regardless of their workspace role.
-- ============================================================

CREATE TABLE case_collaborators (
  case_id   UUID        NOT NULL REFERENCES cases(id)    ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_by  UUID        NOT NULL REFERENCES profiles(id),
  added_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, user_id)
);

CREATE INDEX case_collaborators_case_idx ON case_collaborators (case_id);
CREATE INDEX case_collaborators_user_idx ON case_collaborators (user_id);

-- ── Row-Level Security ────────────────────────────────────────
ALTER TABLE case_collaborators ENABLE ROW LEVEL SECURITY;

-- Workspace members can view collaborators on cases in their workspace
CREATE POLICY "members can view case collaborators"
  ON case_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      JOIN workspace_members wm
        ON wm.workspace_id = c.workspace_id AND wm.user_id = auth.uid()
      WHERE c.id = case_collaborators.case_id
    )
  );

-- Case author or workspace admin/editor can add collaborators
CREATE POLICY "author or admin can add case collaborators"
  ON case_collaborators FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c
      JOIN workspace_members wm
        ON wm.workspace_id = c.workspace_id AND wm.user_id = auth.uid()
      WHERE c.id = case_collaborators.case_id
        AND (c.author_id = auth.uid() OR wm.role IN ('admin', 'editor'))
    )
  );

-- Case author, workspace admin/editor, or the collaborator themselves can remove
CREATE POLICY "author or admin or self can remove case collaborators"
  ON case_collaborators FOR DELETE
  USING (
    case_collaborators.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM cases c
      JOIN workspace_members wm
        ON wm.workspace_id = c.workspace_id AND wm.user_id = auth.uid()
      WHERE c.id = case_collaborators.case_id
        AND (c.author_id = auth.uid() OR wm.role IN ('admin', 'editor'))
    )
  );
