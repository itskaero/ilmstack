-- ============================================================
-- ILMSTACK HEALTH — Workspace Join Requests
-- Users can request to join a workspace; admins approve/reject.
-- ============================================================

CREATE TABLE workspace_join_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES workspaces(id)  ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
  message      TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One active request per user per workspace
  UNIQUE (workspace_id, user_id)
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX workspace_join_requests_workspace_idx ON workspace_join_requests (workspace_id);
CREATE INDEX workspace_join_requests_user_idx      ON workspace_join_requests (user_id);
CREATE INDEX workspace_join_requests_status_idx    ON workspace_join_requests (status);

-- ── Row-Level Security ────────────────────────────────────────
ALTER TABLE workspace_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests (any status)
CREATE POLICY "Users can view own join requests"
  ON workspace_join_requests FOR SELECT
  USING (user_id = auth.uid());

-- Workspace admins can view all requests for their workspace
CREATE POLICY "Admins can view workspace join requests"
  ON workspace_join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_join_requests.workspace_id
        AND workspace_members.user_id      = auth.uid()
        AND workspace_members.role         = 'admin'
    )
  );

-- Authenticated users can submit a request
-- (not already a member, request belongs to them)
CREATE POLICY "Users can submit join requests"
  ON workspace_join_requests FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_join_requests.workspace_id
        AND workspace_members.user_id      = auth.uid()
    )
  );

-- Users can delete their own PENDING request (withdraw)
CREATE POLICY "Users can withdraw pending join requests"
  ON workspace_join_requests FOR DELETE
  USING (user_id = auth.uid() AND status = 'pending');

-- Workspace admins can update status (approve / reject)
CREATE POLICY "Admins can review join requests"
  ON workspace_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_join_requests.workspace_id
        AND workspace_members.user_id      = auth.uid()
        AND workspace_members.role         = 'admin'
    )
  )
  WITH CHECK (status IN ('approved', 'rejected'));
