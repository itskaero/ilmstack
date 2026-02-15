'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createNoteSchema, updateNoteSchema, noteCommentSchema } from '@/lib/validations/note'
import {
  createNote,
  updateNote,
  deleteNote,
  updateNoteStatus,
  addComment,
  deleteComment,
  resolveComment,
  createTopic,
  createTag,
} from '@/services/notes.service'
import {
  createReviewRequest,
  addReviewAction,
} from '@/services/review.service'
import type { NoteStatus } from '@/types/database'
import { ROUTES } from '@/config/app'

// ── Create Note ───────────────────────────────────────────────

export async function createNoteAction(
  workspaceId: string,
  workspaceSlug: string,
  formData: FormData
): Promise<{ noteId: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { noteId: null, error: 'Not authenticated' }

  const raw = {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
    topic_id: (formData.get('topic_id') as string) || null,
    tag_ids: formData.getAll('tag_ids') as string[],
    recommend_for_journal: formData.get('recommend_for_journal') === 'true',
  }

  const parsed = createNoteSchema.safeParse(raw)
  if (!parsed.success) {
    return { noteId: null, error: parsed.error.issues[0].message }
  }

  const note = await createNote(supabase, workspaceId, user.id, parsed.data)
  if (!note) return { noteId: null, error: 'Failed to create note' }

  revalidatePath(ROUTES.notes(workspaceSlug))
  return { noteId: note.id, error: null }
}

// ── Update Note ───────────────────────────────────────────────

export async function updateNoteAction(
  noteId: string,
  workspaceId: string,
  workspaceSlug: string,
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
    topic_id: (formData.get('topic_id') as string) || null,
    tag_ids: formData.getAll('tag_ids') as string[],
    recommend_for_journal: formData.get('recommend_for_journal') === 'true',
  }

  const parsed = updateNoteSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const note = await updateNote(supabase, noteId, workspaceId, parsed.data)
  if (!note) return { error: 'Failed to update note' }

  revalidatePath(ROUTES.noteDetail(workspaceSlug, noteId))
  revalidatePath(ROUTES.notes(workspaceSlug))
  return { error: null }
}

// ── Delete Note ───────────────────────────────────────────────

export async function deleteNoteAction(
  noteId: string,
  workspaceId: string,
  workspaceSlug: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  await deleteNote(supabase, noteId, workspaceId)
  revalidatePath(ROUTES.notes(workspaceSlug))
  redirect(ROUTES.notes(workspaceSlug))
}

// ── Update Note Status ────────────────────────────────────────

export async function updateNoteStatusAction(
  noteId: string,
  workspaceId: string,
  workspaceSlug: string,
  status: NoteStatus
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await updateNoteStatus(supabase, noteId, workspaceId, status)
  revalidatePath(ROUTES.noteDetail(workspaceSlug, noteId))
  revalidatePath(ROUTES.notes(workspaceSlug))
  return { error: null }
}

// ── Toggle Journal Recommendation ────────────────────────────

export async function toggleJournalRecommendAction(
  noteId: string,
  workspaceId: string,
  workspaceSlug: string,
  current: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await updateNote(supabase, noteId, workspaceId, {
    recommend_for_journal: !current,
  })
  revalidatePath(ROUTES.noteDetail(workspaceSlug, noteId))
  return { error: null }
}

// ── Add Comment ───────────────────────────────────────────────

export async function addCommentAction(
  noteId: string,
  workspaceId: string,
  workspaceSlug: string,
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = {
    content: formData.get('content') as string,
    comment_type: (formData.get('comment_type') as string) || 'general',
    parent_id: (formData.get('parent_id') as string) || null,
    anchor_ref: (formData.get('anchor_ref') as string) || null,
  }

  const parsed = noteCommentSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const comment = await addComment(supabase, workspaceId, user.id, {
    note_id: noteId,
    content: parsed.data.content,
    comment_type: parsed.data.comment_type,
    parent_id: parsed.data.parent_id ?? undefined,
    anchor_ref: parsed.data.anchor_ref ?? undefined,
  })
  if (!comment) return { error: 'Failed to add comment' }

  revalidatePath(ROUTES.noteDetail(workspaceSlug, noteId))
  return { error: null }
}

// ── Delete Comment ────────────────────────────────────────────

export async function deleteCommentAction(
  commentId: string,
  workspaceId: string,
  noteId: string,
  workspaceSlug: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await deleteComment(supabase, commentId, workspaceId)
  revalidatePath(ROUTES.noteDetail(workspaceSlug, noteId))
  return { error: null }
}

// ── Resolve Comment ───────────────────────────────────────────

export async function resolveCommentAction(
  commentId: string,
  workspaceId: string,
  noteId: string,
  workspaceSlug: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await resolveComment(supabase, commentId, workspaceId, user.id)
  revalidatePath(ROUTES.noteDetail(workspaceSlug, noteId))
  return { error: null }
}

// ── Create Topic ──────────────────────────────────────────────

export async function createTopicAction(
  workspaceId: string,
  workspaceSlug: string,
  name: string
): Promise<{ topicId: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { topicId: null, error: 'Not authenticated' }

  const topic = await createTopic(supabase, workspaceId, user.id, name)
  if (!topic) return { topicId: null, error: 'Failed to create topic' }

  revalidatePath(ROUTES.notes(workspaceSlug))
  return { topicId: topic.id, error: null }
}

// ── Create Tag ────────────────────────────────────────────────

export async function createTagAction(
  workspaceId: string,
  workspaceSlug: string,
  name: string,
  color?: string
): Promise<{ tagId: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { tagId: null, error: 'Not authenticated' }

  const tag = await createTag(supabase, workspaceId, user.id, name, color)
  if (!tag) return { tagId: null, error: 'Failed to create tag' }

  revalidatePath(ROUTES.notes(workspaceSlug))
  return { tagId: tag.id, error: null }
}

// ── Submit for Review ─────────────────────────────────────────
// Creates a review_request AND sets note status to under_review

export async function submitForReviewAction(
  noteId: string,
  workspaceId: string,
  workspaceSlug: string
): Promise<{ requestId: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { requestId: null, error: 'Not authenticated' }

  // Update note status
  await updateNoteStatus(supabase, noteId, workspaceId, 'under_review')

  // Create review request
  const request = await createReviewRequest(supabase, workspaceId, user.id, noteId)
  if (!request) return { requestId: null, error: 'Failed to create review request' }

  // Log submitted action
  await addReviewAction(supabase, request.id, workspaceId, user.id, 'submitted')

  revalidatePath(ROUTES.noteDetail(workspaceSlug, noteId))
  revalidatePath(ROUTES.notes(workspaceSlug))
  revalidatePath(ROUTES.review(workspaceSlug))
  return { requestId: request.id, error: null }
}
