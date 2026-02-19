'use server'

// ============================================================
// ILMSTACK HEALTH — Guidelines Server Actions
// ============================================================

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createGuidelineSchema, updateGuidelineSchema } from '@/lib/validations/guideline'
import {
  createGuideline,
  updateGuideline,
  updateGuidelineStatus,
  getGuidelineById,
  hasRequiredClinicalRole,
} from '@/services/guidelines.service'
import { ROUTES } from '@/config/app'
import type { GuidelineStatus } from '@/types/database'

export async function createGuidelineAction(
  workspaceId: string,
  workspaceSlug: string,
  formData: FormData
): Promise<{ guidelineId: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { guidelineId: null, error: 'Not authenticated' }

  const raw = {
    title: (formData.get('title') as string) ?? '',
    content: (formData.get('content') as string) ?? '',
    category: (formData.get('category') as string) || 'general',
    specialty: (formData.get('specialty') as string) || null,
    min_edit_clinical_role: (formData.get('min_edit_clinical_role') as string) || 'any_editor',
  }

  const parsed = createGuidelineSchema.safeParse(raw)
  if (!parsed.success) {
    return { guidelineId: null, error: parsed.error.issues[0].message }
  }

  const guideline = await createGuideline(supabase, workspaceId, user.id, parsed.data)
  if (!guideline) return { guidelineId: null, error: 'Failed to create guideline' }

  revalidatePath(ROUTES.guidelines(workspaceSlug))
  return { guidelineId: guideline.id, error: null }
}

export async function updateGuidelineAction(
  guidelineId: string,
  workspaceId: string,
  workspaceSlug: string,
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get workspace role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memberData } = await (supabase as any)
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  const workspaceRole = memberData?.role as string | undefined

  // Non-admin editors must pass the clinical role check
  if (workspaceRole !== 'admin') {
    const guideline = await getGuidelineById(supabase, guidelineId, workspaceId)
    if (!guideline) return { error: 'Guideline not found' }

    // Fetch user's clinical profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profileData } = await (supabase as any)
      .from('profiles')
      .select('clinical_role, resident_year')
      .eq('id', user.id)
      .single()

    if (profileData) {
      const permitted = hasRequiredClinicalRole(
        profileData.clinical_role,
        profileData.resident_year,
        guideline.min_edit_clinical_role
      )
      if (!permitted) {
        return { error: `This guideline requires ${guideline.min_edit_clinical_role.replace(/_/g, ' ')} to edit` }
      }
    }
  }

  const raw = {
    title: (formData.get('title') as string) || undefined,
    content: (formData.get('content') as string) || undefined,
    category: (formData.get('category') as string) || undefined,
    specialty: (formData.get('specialty') as string) || null,
    min_edit_clinical_role: (formData.get('min_edit_clinical_role') as string) || undefined,
    change_note: (formData.get('change_note') as string) || null,
  }

  const parsed = updateGuidelineSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const result = await updateGuideline(supabase, guidelineId, workspaceId, user.id, parsed.data)

  if (result.error) return { error: result.error }

  revalidatePath(ROUTES.guidelineDetail(workspaceSlug, guidelineId))
  revalidatePath(ROUTES.guidelines(workspaceSlug))
  return { error: null }
}

export async function updateGuidelineStatusAction(
  guidelineId: string,
  workspaceId: string,
  workspaceSlug: string,
  status: GuidelineStatus
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const result = await updateGuidelineStatus(supabase, guidelineId, workspaceId, status, user.id)

  if (result.error) return { error: result.error }

  revalidatePath(ROUTES.guidelineDetail(workspaceSlug, guidelineId))
  revalidatePath(ROUTES.guidelines(workspaceSlug))
  return { error: null }
}
