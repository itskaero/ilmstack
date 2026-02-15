import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ReviewRequestRow,
  ReviewActionRow,
  ReviewRequest,
  ReviewAction,
  ReviewStatus,
  ReviewActionType,
  ReviewPriority,
  Json,
} from '@/types/database'

export type ReviewFilters = {
  status?: ReviewStatus | null
  reviewer_id?: string | null
  requested_by?: string | null
  priority?: ReviewPriority | null
}

export type ReviewRequestPage = {
  requests: ReviewRequest[]
  total: number
}

const REVIEW_SELECT = `
  *,
  note:notes!review_requests_note_id_fkey(id, title, status, workspace_id),
  requester:profiles!review_requests_requested_by_fkey(*),
  reviewer:profiles!review_requests_reviewer_id_fkey(*)
`

// ── Queries ───────────────────────────────────────────────────

export async function getReviewRequests(
  supabase: SupabaseClient,
  workspaceId: string,
  filters: ReviewFilters = {},
  page = 1,
  perPage = 20
): Promise<ReviewRequestPage> {
  let query = supabase
    .from('review_requests')
    .select(REVIEW_SELECT, { count: 'exact' })
    .eq('workspace_id', workspaceId)

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.reviewer_id) query = query.eq('reviewer_id', filters.reviewer_id)
  if (filters.requested_by) query = query.eq('requested_by', filters.requested_by)
  if (filters.priority) query = query.eq('priority', filters.priority)

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  return {
    requests: (data ?? []) as ReviewRequest[],
    total: count ?? 0,
  }
}

export async function getReviewRequestById(
  supabase: SupabaseClient,
  requestId: string,
  workspaceId: string
): Promise<ReviewRequest | null> {
  const { data } = await supabase
    .from('review_requests')
    .select(REVIEW_SELECT)
    .eq('id', requestId)
    .eq('workspace_id', workspaceId)
    .single()
  return data as ReviewRequest | null
}

export async function getReviewActions(
  supabase: SupabaseClient,
  requestId: string,
  _workspaceId: string
): Promise<ReviewAction[]> {
  const { data } = await supabase
    .from('review_actions')
    .select('*, actor:profiles!review_actions_actor_id_fkey(*)')
    .eq('review_request_id', requestId)
    .order('created_at', { ascending: true })
  return (data ?? []) as ReviewAction[]
}

export async function getMyAssignedReviews(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<ReviewRequest[]> {
  const { data } = await supabase
    .from('review_requests')
    .select(REVIEW_SELECT)
    .eq('workspace_id', workspaceId)
    .eq('reviewer_id', userId)
    .in('status', ['pending', 'in_review'])
    .order('created_at', { ascending: false })
  return (data ?? []) as ReviewRequest[]
}

export async function getPendingReviews(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<ReviewRequest[]> {
  const { data } = await supabase
    .from('review_requests')
    .select(REVIEW_SELECT)
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .is('reviewer_id', null)
    .order('created_at', { ascending: false })
  return (data ?? []) as ReviewRequest[]
}

// ── Mutations ─────────────────────────────────────────────────

export async function createReviewRequest(
  supabase: SupabaseClient,
  workspaceId: string,
  requestedBy: string,
  noteId: string,
  reviewerId?: string | null,
  priority: ReviewPriority = 'normal',
  dueDate?: string | null
): Promise<ReviewRequestRow | null> {
  const { data } = await (supabase.from('review_requests') as any)
    .insert({
      workspace_id: workspaceId,
      note_id: noteId,
      requested_by: requestedBy,
      reviewer_id: reviewerId ?? null,
      status: 'pending',
      priority,
      due_date: dueDate ?? null,
    })
    .select()
    .single()
  return data as ReviewRequestRow | null
}

export async function updateReviewRequestStatus(
  supabase: SupabaseClient,
  requestId: string,
  workspaceId: string,
  status: ReviewStatus
): Promise<void> {
  await (supabase.from('review_requests') as any)
    .update({ status })
    .eq('id', requestId)
    .eq('workspace_id', workspaceId)
}

export async function assignReviewer(
  supabase: SupabaseClient,
  requestId: string,
  workspaceId: string,
  reviewerId: string,
  priority?: ReviewPriority,
  dueDate?: string | null
): Promise<void> {
  const updates: Record<string, unknown> = {
    reviewer_id: reviewerId,
    status: 'in_review',
  }
  if (priority) updates.priority = priority
  if (dueDate !== undefined) updates.due_date = dueDate

  await (supabase.from('review_requests') as any)
    .update(updates)
    .eq('id', requestId)
    .eq('workspace_id', workspaceId)
}

export async function addReviewAction(
  supabase: SupabaseClient,
  requestId: string,
  workspaceId: string,
  actorId: string,
  action: ReviewActionType,
  note?: string | null,
  metadata: Json = {}
): Promise<ReviewActionRow | null> {
  const { data } = await (supabase.from('review_actions') as any)
    .insert({
      review_request_id: requestId,
      workspace_id: workspaceId,
      actor_id: actorId,
      action,
      note: note ?? null,
      metadata,
    })
    .select()
    .single()
  return data as ReviewActionRow | null
}

export async function submitVerdictAndUpdateNote(
  supabase: SupabaseClient,
  requestId: string,
  workspaceId: string,
  actorId: string,
  verdict: 'approved' | 'rejected' | 'changes_requested',
  noteId: string,
  reviewNote?: string | null
): Promise<void> {
  // Map verdict to note status
  const noteStatusMap = {
    approved: 'approved',
    rejected: 'draft',
    changes_requested: 'draft',
  } as const

  // Update review request status
  await updateReviewRequestStatus(supabase, requestId, workspaceId, verdict)

  // Update note status
  await (supabase.from('notes') as any)
    .update({ status: noteStatusMap[verdict] })
    .eq('id', noteId)
    .eq('workspace_id', workspaceId)

  // Log review action
  await addReviewAction(supabase, requestId, workspaceId, actorId, verdict, reviewNote)
}
