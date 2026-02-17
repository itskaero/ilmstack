-- ============================================================
-- Enhanced Cases: Investigations categories, findings, growth charts
-- ============================================================

-- 1) Add findings and category columns to case_imaging
ALTER TABLE case_imaging ADD COLUMN IF NOT EXISTS findings TEXT;
ALTER TABLE case_imaging ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'radiology';

-- 2) Add growth_data JSONB to cases for pediatric growth charts
ALTER TABLE cases ADD COLUMN IF NOT EXISTS growth_data JSONB;

-- 3) Allow UPDATE on case_imaging (uploader or editor+)
CREATE POLICY "case_imaging_update_contributor_plus"
  ON case_imaging FOR UPDATE
  TO authenticated
  USING (
    uploader_id = auth.uid()
    OR has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[])
  )
  WITH CHECK (
    uploader_id = auth.uid()
    OR has_workspace_role(workspace_id, ARRAY['admin', 'editor']::workspace_role[])
  );
