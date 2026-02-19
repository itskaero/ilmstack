-- ============================================================
-- ILMSTACK HEALTH — Avatars, Workspace Logos & Workspace Specialties
-- ============================================================

-- ── 1. Workspace specialties (tag only) ──────────────────────

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS specialties TEXT[] NOT NULL DEFAULT '{}';

-- ── 2. Storage buckets ───────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('workspace-logos', 'workspace-logos', true)
ON CONFLICT (id) DO NOTHING;

-- ── 3. RLS — avatars ─────────────────────────────────────────

CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_auth_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_auth_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_auth_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 4. RLS — workspace-logos ──────────────────────────────────

CREATE POLICY "ws_logos_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'workspace-logos');

CREATE POLICY "ws_logos_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'workspace-logos'
    AND has_workspace_role(
      (storage.foldername(name))[1]::uuid,
      ARRAY['admin']::workspace_role[]
    )
  );

CREATE POLICY "ws_logos_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'workspace-logos'
    AND has_workspace_role(
      (storage.foldername(name))[1]::uuid,
      ARRAY['admin']::workspace_role[]
    )
  );

CREATE POLICY "ws_logos_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'workspace-logos'
    AND has_workspace_role(
      (storage.foldername(name))[1]::uuid,
      ARRAY['admin']::workspace_role[]
    )
  );
