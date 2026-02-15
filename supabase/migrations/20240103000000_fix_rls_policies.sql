-- ============================================================
-- FIX: RLS Policy adjustments for proper access control
-- ============================================================

-- 1) Allow contributors to create topics (needed for inline topic creation in note/case forms)
--    Previously: only admin/editor could create topics
DROP POLICY IF EXISTS "topics_insert_editor_or_admin" ON topics;
CREATE POLICY "topics_insert_contributor_plus"
  ON topics FOR INSERT
  TO authenticated
  WITH CHECK (
    has_workspace_role(workspace_id, ARRAY['admin', 'editor', 'contributor']::workspace_role[])
    AND created_by = auth.uid()
  );

-- 2) Allow contributors to insert review actions (needed for 'submitted' action)
--    Previously: only admin/editor could insert review actions
--    Contributors submit notes for review → need to log the 'submitted' action
DROP POLICY IF EXISTS "review_actions_insert_editor_plus" ON review_actions;
CREATE POLICY "review_actions_insert_contributor_plus"
  ON review_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    has_workspace_role(workspace_id, ARRAY['admin', 'editor', 'contributor']::workspace_role[])
    AND actor_id = auth.uid()
  );

-- 3) Allow workspace creators to add themselves as the first member
--    This fixes the chicken-and-egg problem with workspace creation.
--    (The app code now uses admin client, but this is a safety net.)
CREATE POLICY "workspace_members_insert_creator"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_id AND w.created_by = auth.uid()
    )
  );

-- 4) Fix case_tags: ensure contributors (case authors) can manage their own case tags
--    Check the existing policy works for FOR ALL
DROP POLICY IF EXISTS "case_tags_manage_author_or_editor" ON case_tags;
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id AND (
        has_workspace_role(c.workspace_id, ARRAY['admin', 'editor']::workspace_role[])
        OR c.author_id = auth.uid()
      )
    )
  );

-- 5) Fix note_tags: add explicit WITH CHECK for INSERT operations
DROP POLICY IF EXISTS "note_tags_manage_author_or_editor" ON note_tags;
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = note_id AND (
        has_workspace_role(n.workspace_id, ARRAY['admin', 'editor']::workspace_role[])
        OR n.author_id = auth.uid()
      )
    )
  );
