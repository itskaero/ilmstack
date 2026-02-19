-- ============================================================
-- Fix: Change guidelines FK references from auth.users → profiles
-- PostgREST can only auto-join via profiles if the FK targets profiles(id)
-- ============================================================

-- ── guidelines ───────────────────────────────────────────────

ALTER TABLE guidelines
  DROP CONSTRAINT IF EXISTS guidelines_created_by_fkey,
  DROP CONSTRAINT IF EXISTS guidelines_updated_by_fkey;

ALTER TABLE guidelines
  ADD CONSTRAINT guidelines_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT guidelines_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ── guideline_versions ────────────────────────────────────────

ALTER TABLE guideline_versions
  DROP CONSTRAINT IF EXISTS guideline_versions_changed_by_fkey;

ALTER TABLE guideline_versions
  ADD CONSTRAINT guideline_versions_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES profiles(id) ON DELETE SET NULL;
