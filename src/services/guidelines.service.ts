// ============================================================
// ILMSTACK HEALTH — Guidelines Service
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  GuidelineRow,
  GuidelineVersionRow,
  GuidelineWithAuthor,
  GuidelineVersionWithAuthor,
  GuidelineStatus,
  ClinicalRole,
  GuidelineMinEditRole,
  CreateGuidelineInput,
  UpdateGuidelineInput,
} from '@/types/database'

// ── Permission Helper ─────────────────────────────────────────

/**
 * Checks if a user's clinical role meets the minimum required for editing a guideline.
 * Workspace admins should bypass this check entirely.
 */
export function hasRequiredClinicalRole(
  clinicalRole: ClinicalRole,
  residentYear: number | null,
  minRole: GuidelineMinEditRole
): boolean {
  if (minRole === 'any_editor') return true

  const roleRank: Record<ClinicalRole, number> = {
    intern: 0,
    other: 0,
    resident: residentYear ?? 1, // R1=1, R2=2, R3=3, R4=4, R5=5
    senior_registrar: 8,
    consultant: 9,
    specialist: 10,
  }

  const minRank: Record<GuidelineMinEditRole, number> = {
    any_editor: 0,
    r3_resident_plus: 3,
    senior_registrar: 8,
    consultant_only: 9,
  }

  return (roleRank[clinicalRole] ?? 0) >= (minRank[minRole] ?? 0)
}

// ── Guideline Filters ─────────────────────────────────────────

export interface GuidelineFilters {
  status?: GuidelineStatus | null
  category?: string | null
  specialty?: string | null
  search?: string | null
}

// ── Read Operations ───────────────────────────────────────────

export async function getGuidelines(
  supabase: SupabaseClient,
  workspaceId: string,
  filters: GuidelineFilters = {},
  page = 1,
  perPage = 20
): Promise<{ guidelines: GuidelineWithAuthor[]; total: number }> {
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('guidelines')
    .select(
      `*, author:profiles!guidelines_created_by_fkey(id,full_name,avatar_url,clinical_role,resident_year), updater:profiles!guidelines_updated_by_fkey(id,full_name,avatar_url,clinical_role,resident_year)`,
      { count: 'exact' }
    )
    .eq('workspace_id', workspaceId)

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.specialty) query = query.eq('specialty', filters.specialty)
  if (filters.search) query = query.ilike('title', `%${filters.search}%`)

  query = query.order('updated_at', { ascending: false }).range(from, to)

  const { data, count, error } = await query
  if (error) {
    console.error('[Guidelines] getGuidelines error:', error)
    return { guidelines: [], total: 0 }
  }

  return { guidelines: (data ?? []) as GuidelineWithAuthor[], total: count ?? 0 }
}

export async function getGuidelineById(
  supabase: SupabaseClient,
  guidelineId: string,
  workspaceId: string
): Promise<GuidelineWithAuthor | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('guidelines')
    .select(
      `*, author:profiles!guidelines_created_by_fkey(id,full_name,avatar_url,email,clinical_role,resident_year,title,specialty), updater:profiles!guidelines_updated_by_fkey(id,full_name,avatar_url,email,clinical_role,resident_year,title,specialty)`
    )
    .eq('id', guidelineId)
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !data) return null
  return data as GuidelineWithAuthor
}

export async function getGuidelineVersions(
  supabase: SupabaseClient,
  guidelineId: string
): Promise<GuidelineVersionWithAuthor[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('guideline_versions')
    .select(`*, changed_by_profile:profiles!guideline_versions_changed_by_fkey(id,full_name,avatar_url,clinical_role,resident_year)`)
    .eq('guideline_id', guidelineId)
    .order('version_number', { ascending: false })

  if (error) {
    console.error('[Guidelines] getGuidelineVersions error:', error)
    return []
  }

  return (data ?? []) as GuidelineVersionWithAuthor[]
}

// ── Write Operations ──────────────────────────────────────────

export async function createGuideline(
  supabase: SupabaseClient,
  workspaceId: string,
  authorId: string,
  input: CreateGuidelineInput
): Promise<GuidelineRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: guideline, error } = await (supabase as any)
    .from('guidelines')
    .insert({
      workspace_id: workspaceId,
      title: input.title,
      content: input.content ?? '',
      category: input.category ?? 'general',
      specialty: input.specialty ?? null,
      min_edit_clinical_role: input.min_edit_clinical_role ?? 'any_editor',
      status: 'draft',
      version: 1,
      created_by: authorId,
      updated_by: authorId,
    })
    .select()
    .single()

  if (error || !guideline) {
    console.error('[Guidelines] createGuideline error:', error)
    return null
  }

  // Insert initial version record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('guideline_versions').insert({
    guideline_id: guideline.id,
    version_number: 1,
    title: guideline.title,
    content: guideline.content,
    change_note: 'Initial version',
    changed_by: authorId,
  })

  return guideline as GuidelineRow
}

export async function updateGuideline(
  supabase: SupabaseClient,
  guidelineId: string,
  workspaceId: string,
  userId: string,
  input: UpdateGuidelineInput
): Promise<{ error: string | null }> {
  // Fetch current version number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await (supabase as any)
    .from('guidelines')
    .select('version, title, content')
    .eq('id', guidelineId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!current) return { error: 'Guideline not found' }

  const newVersion = current.version + 1
  const newTitle = input.title ?? current.title
  const newContent = input.content ?? current.content

  // Update guideline
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('guidelines')
    .update({
      title: newTitle,
      content: newContent,
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.specialty !== undefined ? { specialty: input.specialty } : {}),
      ...(input.min_edit_clinical_role !== undefined ? { min_edit_clinical_role: input.min_edit_clinical_role } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      version: newVersion,
      updated_by: userId,
    })
    .eq('id', guidelineId)
    .eq('workspace_id', workspaceId)

  if (updateError) {
    console.error('[Guidelines] updateGuideline error:', updateError)
    return { error: updateError.message }
  }

  // Insert version record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('guideline_versions').insert({
    guideline_id: guidelineId,
    version_number: newVersion,
    title: newTitle,
    content: newContent,
    change_note: input.change_note ?? null,
    changed_by: userId,
  })

  return { error: null }
}

export async function updateGuidelineStatus(
  supabase: SupabaseClient,
  guidelineId: string,
  workspaceId: string,
  status: GuidelineStatus,
  userId: string
): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('guidelines')
    .update({ status, updated_by: userId })
    .eq('id', guidelineId)
    .eq('workspace_id', workspaceId)

  if (error) {
    console.error('[Guidelines] updateGuidelineStatus error:', error)
    return { error: error.message }
  }

  return { error: null }
}
