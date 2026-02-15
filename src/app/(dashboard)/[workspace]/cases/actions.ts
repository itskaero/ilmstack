'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createCaseSchema, updateCaseSchema } from '@/lib/validations/case'
import {
  createCase,
  updateCase,
  deleteCase,
  updateCaseStatus,
  addCaseImage,
  deleteCaseImage,
} from '@/services/cases.service'
import { createTopic, createTag } from '@/services/notes.service'
import type { CaseStatus } from '@/types/database'
import { ROUTES, STORAGE_BUCKETS } from '@/config/app'

// ── Re-export topic/tag creation (shared with notes) ──────────

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
  return { topicId: topic.id, error: null }
}

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
  return { tagId: tag.id, error: null }
}

// ── Create Case ───────────────────────────────────────────────

export async function createCaseAction(
  workspaceId: string,
  workspaceSlug: string,
  formData: FormData
): Promise<{ caseId: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { caseId: null, error: 'Not authenticated' }

  const raw = {
    title: formData.get('title') as string,
    topic_id: (formData.get('topic_id') as string) || null,
    tag_ids: formData.getAll('tag_ids') as string[],
    presentation: (formData.get('presentation') as string) || null,
    history: (formData.get('history') as string) || null,
    examination: (formData.get('examination') as string) || null,
    investigations: (formData.get('investigations') as string) || null,
    management_timeline: JSON.parse((formData.get('management_timeline') as string) || '[]'),
    outcome: (formData.get('outcome') as string) || null,
    learning_points: (formData.get('learning_points') as string) || null,
    patient_age_range: (formData.get('patient_age_range') as string) || null,
    patient_gender: (formData.get('patient_gender') as string) || null,
    specialty: (formData.get('specialty') as string) || null,
    diagnosis: (formData.get('diagnosis') as string) || null,
    icd_codes: JSON.parse((formData.get('icd_codes') as string) || '[]'),
  }

  const parsed = createCaseSchema.safeParse(raw)
  if (!parsed.success) return { caseId: null, error: parsed.error.issues[0].message }

  const caseRow = await createCase(supabase, workspaceId, user.id, parsed.data as any)
  if (!caseRow) return { caseId: null, error: 'Failed to create case' }

  revalidatePath(ROUTES.cases(workspaceSlug))
  return { caseId: caseRow.id, error: null }
}

// ── Update Case ───────────────────────────────────────────────

export async function updateCaseAction(
  caseId: string,
  workspaceId: string,
  workspaceSlug: string,
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = {
    title: formData.get('title') as string,
    topic_id: (formData.get('topic_id') as string) || null,
    tag_ids: formData.getAll('tag_ids') as string[],
    presentation: (formData.get('presentation') as string) || null,
    history: (formData.get('history') as string) || null,
    examination: (formData.get('examination') as string) || null,
    investigations: (formData.get('investigations') as string) || null,
    management_timeline: JSON.parse((formData.get('management_timeline') as string) || '[]'),
    outcome: (formData.get('outcome') as string) || null,
    learning_points: (formData.get('learning_points') as string) || null,
    patient_age_range: (formData.get('patient_age_range') as string) || null,
    patient_gender: (formData.get('patient_gender') as string) || null,
    specialty: (formData.get('specialty') as string) || null,
    diagnosis: (formData.get('diagnosis') as string) || null,
    icd_codes: JSON.parse((formData.get('icd_codes') as string) || '[]'),
  }

  const parsed = updateCaseSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const caseRow = await updateCase(supabase, caseId, workspaceId, parsed.data as any)
  if (!caseRow) return { error: 'Failed to update case' }

  revalidatePath(ROUTES.caseDetail(workspaceSlug, caseId))
  revalidatePath(ROUTES.cases(workspaceSlug))
  return { error: null }
}

// ── Delete Case ───────────────────────────────────────────────

export async function deleteCaseAction(
  caseId: string,
  workspaceId: string,
  workspaceSlug: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  await deleteCase(supabase, caseId, workspaceId)
  revalidatePath(ROUTES.cases(workspaceSlug))
  redirect(ROUTES.cases(workspaceSlug))
}

// ── Update Status ─────────────────────────────────────────────

export async function updateCaseStatusAction(
  caseId: string,
  workspaceId: string,
  workspaceSlug: string,
  status: CaseStatus
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await updateCaseStatus(supabase, caseId, workspaceId, status)
  revalidatePath(ROUTES.caseDetail(workspaceSlug, caseId))
  revalidatePath(ROUTES.cases(workspaceSlug))
  return { error: null }
}

// ── Upload Case Image ─────────────────────────────────────────

export async function uploadCaseImageAction(
  caseId: string,
  workspaceId: string,
  workspaceSlug: string,
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  const maxSize = 10 * 1024 * 1024 // 10 MB
  if (file.size > maxSize) return { error: 'File size must be under 10MB' }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Only JPEG, PNG, WebP and GIF images are allowed' }
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const storagePath = `${workspaceId}/${caseId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.caseImaging)
    .upload(storagePath, file, { contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKETS.caseImaging)
    .getPublicUrl(storagePath)

  const caption = (formData.get('caption') as string) || null
  const modality = (formData.get('modality') as string) || null

  await addCaseImage(supabase, caseId, workspaceId, user.id, {
    file_url: urlData.publicUrl,
    storage_path: storagePath,
    file_name: file.name,
    file_size: file.size,
    caption,
    modality,
  })

  revalidatePath(ROUTES.caseDetail(workspaceSlug, caseId))
  return { error: null }
}

// ── Delete Case Image ─────────────────────────────────────────

export async function deleteCaseImageAction(
  imageId: string,
  storagePath: string,
  workspaceId: string,
  caseId: string,
  workspaceSlug: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase.storage.from(STORAGE_BUCKETS.caseImaging).remove([storagePath])
  await deleteCaseImage(supabase, imageId, workspaceId)

  revalidatePath(ROUTES.caseDetail(workspaceSlug, caseId))
  return { error: null }
}
