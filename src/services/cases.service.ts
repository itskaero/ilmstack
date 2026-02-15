import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CaseRow,
  CaseWithRelations,
  CaseImagingRow,
  Topic,
  Tag,
  CreateCaseInput,
  UpdateCaseInput,
  CaseStatus,
} from '@/types/database'

export type CaseFilters = {
  status?: CaseStatus | null
  topic_id?: string | null
  tag_id?: string | null
  search?: string | null
  author_id?: string | null
  specialty?: string | null
}

export type CasesPage = {
  cases: CaseWithRelations[]
  total: number
}

const CASE_SELECT = `
  *,
  author:profiles!cases_author_id_fkey(*),
  topic:topics(*),
  case_tags(tag:tags(*))
`

// ── Queries ───────────────────────────────────────────────────

export async function getCases(
  supabase: SupabaseClient,
  workspaceId: string,
  filters: CaseFilters = {},
  page = 1,
  perPage = 20
): Promise<CasesPage> {
  let query = supabase
    .from('cases')
    .select(CASE_SELECT, { count: 'exact' })
    .eq('workspace_id', workspaceId)

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.topic_id) query = query.eq('topic_id', filters.topic_id)
  if (filters.author_id) query = query.eq('author_id', filters.author_id)
  if (filters.specialty) query = query.ilike('specialty', `%${filters.specialty}%`)
  if (filters.search) query = query.ilike('title', `%${filters.search}%`)

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data, count } = await query
    .order('updated_at', { ascending: false })
    .range(from, to)

  const cases: CaseWithRelations[] = (data ?? []).map((c: any) => ({
    ...c,
    tags: (c.case_tags ?? []).map((ct: any) => ct.tag).filter(Boolean),
    imaging: [],
  }))

  return { cases, total: count ?? 0 }
}

export async function getCaseById(
  supabase: SupabaseClient,
  caseId: string,
  workspaceId: string
): Promise<CaseWithRelations | null> {
  const { data } = await supabase
    .from('cases')
    .select(CASE_SELECT)
    .eq('id', caseId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!data) return null

  const imaging = await getCaseImaging(supabase, caseId, workspaceId)

  return {
    ...(data as any),
    tags: ((data as any).case_tags ?? []).map((ct: any) => ct.tag).filter(Boolean),
    imaging,
  } as CaseWithRelations
}

// ── Mutations ─────────────────────────────────────────────────

export async function createCase(
  supabase: SupabaseClient,
  workspaceId: string,
  authorId: string,
  input: CreateCaseInput
): Promise<CaseRow | null> {
  const { tag_ids, ...caseData } = input

  const { data: caseRow } = await (supabase.from('cases') as any)
    .insert({
      workspace_id: workspaceId,
      author_id: authorId,
      status: 'draft',
      ...caseData,
      management_timeline: caseData.management_timeline ?? [],
      icd_codes: caseData.icd_codes ?? [],
    })
    .select()
    .single()

  if (!caseRow) return null

  if (tag_ids && tag_ids.length > 0) {
    await (supabase.from('case_tags') as any).insert(
      tag_ids.map((tag_id: string) => ({ case_id: caseRow.id, tag_id }))
    )
  }

  return caseRow as CaseRow
}

export async function updateCase(
  supabase: SupabaseClient,
  caseId: string,
  workspaceId: string,
  input: UpdateCaseInput
): Promise<CaseRow | null> {
  const { tag_ids, ...caseData } = input

  const updates: Record<string, unknown> = {}
  const fields = [
    'title', 'topic_id', 'presentation', 'history', 'examination',
    'investigations', 'management_timeline', 'outcome', 'learning_points',
    'patient_age_range', 'patient_gender', 'specialty', 'diagnosis', 'icd_codes',
  ] as const
  for (const field of fields) {
    if (caseData[field] !== undefined) updates[field] = caseData[field]
  }
  if (caseData.status !== undefined) {
    updates.status = caseData.status
    if (caseData.status === 'published') updates.published_at = new Date().toISOString()
  }

  const { data: caseRow } = await (supabase.from('cases') as any)
    .update(updates)
    .eq('id', caseId)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (!caseRow) return null

  if (tag_ids !== undefined) {
    await supabase.from('case_tags').delete().eq('case_id', caseId)
    if (tag_ids.length > 0) {
      await (supabase.from('case_tags') as any).insert(
        tag_ids.map((tag_id: string) => ({ case_id: caseId, tag_id }))
      )
    }
  }

  return caseRow as CaseRow
}

export async function deleteCase(
  supabase: SupabaseClient,
  caseId: string,
  workspaceId: string
): Promise<void> {
  await supabase.from('cases').delete().eq('id', caseId).eq('workspace_id', workspaceId)
}

export async function updateCaseStatus(
  supabase: SupabaseClient,
  caseId: string,
  workspaceId: string,
  status: CaseStatus
): Promise<void> {
  const updates: Record<string, unknown> = { status }
  if (status === 'published') updates.published_at = new Date().toISOString()
  await (supabase.from('cases') as any)
    .update(updates)
    .eq('id', caseId)
    .eq('workspace_id', workspaceId)
}

// ── Imaging ───────────────────────────────────────────────────

export async function getCaseImaging(
  supabase: SupabaseClient,
  caseId: string,
  workspaceId: string
): Promise<CaseImagingRow[]> {
  const { data } = await supabase
    .from('case_imaging')
    .select('*')
    .eq('case_id', caseId)
    .eq('workspace_id', workspaceId)
    .order('sort_order', { ascending: true })
  return (data ?? []) as CaseImagingRow[]
}

export async function addCaseImage(
  supabase: SupabaseClient,
  caseId: string,
  workspaceId: string,
  uploaderId: string,
  data: {
    file_url: string
    storage_path: string
    file_name: string
    file_size: number
    caption?: string | null
    modality?: string | null
    sort_order?: number
  }
): Promise<CaseImagingRow | null> {
  const { data: row } = await (supabase.from('case_imaging') as any)
    .insert({
      case_id: caseId,
      workspace_id: workspaceId,
      uploader_id: uploaderId,
      sort_order: data.sort_order ?? 0,
      ...data,
    })
    .select()
    .single()
  return row as CaseImagingRow | null
}

export async function deleteCaseImage(
  supabase: SupabaseClient,
  imageId: string,
  workspaceId: string
): Promise<void> {
  await supabase
    .from('case_imaging')
    .delete()
    .eq('id', imageId)
    .eq('workspace_id', workspaceId)
}

// ── Specialties (distinct) ────────────────────────────────────

export async function getSpecialties(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('cases')
    .select('specialty')
    .eq('workspace_id', workspaceId)
    .not('specialty', 'is', null)
  const seen = new Set<string>()
  for (const row of data ?? []) {
    if (row.specialty) seen.add(row.specialty)
  }
  return [...seen].sort()
}
