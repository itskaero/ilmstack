'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  assignReviewerSchema,
  createReviewRequestSchema,
} from '@/lib/validations/review'
import {
  createReviewRequest,
  updateReviewRequestStatus,
  assignReviewer,
  addReviewAction,
  submitVerdictAndUpdateNote,
} from '@/services/review.service'
import { ROUTES } from '@/config/app'
import type { ReviewPriority } from '@/types/database'

// ── Assign Reviewer ───────────────────────────────────────────

export async function assignReviewerAction(
  requestId: string,
  workspaceId: string,
  workspaceSlug: string,
  noteId: string,
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = {
    reviewer_id: formData.get('reviewer_id') as string,
    priority: (formData.get('priority') as ReviewPriority) || undefined,
    due_date: (formData.get('due_date') as string) || null,
  }

  const parsed = assignReviewerSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  await assignReviewer(
    supabase,
    requestId,
    workspaceId,
    parsed.data.reviewer_id,
    parsed.data.priority,
    parsed.data.due_date
  )

  await addReviewAction(
    supabase,
    requestId,
    workspaceId,
    user.id,
    'assigned',
    null,
    { reviewer_id: parsed.data.reviewer_id }
  )

  revalidatePath(ROUTES.review(workspaceSlug))
  revalidatePath(`${ROUTES.review(workspaceSlug)}/${requestId}`)
  return { error: null }
}

// ── Submit Verdict ────────────────────────────────────────────

export async function submitVerdictAction(
  requestId: string,
  workspaceId: string,
  workspaceSlug: string,
  noteId: string,
  verdict: 'approved' | 'rejected' | 'changes_requested',
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const reviewNote = (formData.get('note') as string) || null

  await submitVerdictAndUpdateNote(
    supabase,
    requestId,
    workspaceId,
    user.id,
    verdict,
    noteId,
    reviewNote
  )

  revalidatePath(ROUTES.review(workspaceSlug))
  revalidatePath(`${ROUTES.review(workspaceSlug)}/${requestId}`)
  revalidatePath(ROUTES.noteDetail(workspaceSlug, noteId))
  return { error: null }
}

// ── Add Review Comment ────────────────────────────────────────

export async function addReviewCommentAction(
  requestId: string,
  workspaceId: string,
  workspaceSlug: string,
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const note = formData.get('note') as string
  if (!note?.trim()) return { error: 'Comment cannot be empty' }

  await addReviewAction(
    supabase,
    requestId,
    workspaceId,
    user.id,
    'comment_added',
    note.trim()
  )

  revalidatePath(`${ROUTES.review(workspaceSlug)}/${requestId}`)
  return { error: null }
}

// ── Reopen Review ─────────────────────────────────────────────

export async function reopenReviewAction(
  requestId: string,
  workspaceId: string,
  workspaceSlug: string,
  noteId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await updateReviewRequestStatus(supabase, requestId, workspaceId, 'pending')

  // Reset note to under_review
  await (supabase.from('notes') as any)
    .update({ status: 'under_review' })
    .eq('id', noteId)
    .eq('workspace_id', workspaceId)

  await addReviewAction(supabase, requestId, workspaceId, user.id, 'reopened')

  revalidatePath(ROUTES.review(workspaceSlug))
  revalidatePath(`${ROUTES.review(workspaceSlug)}/${requestId}`)
  revalidatePath(ROUTES.noteDetail(workspaceSlug, noteId))
  return { error: null }
}
