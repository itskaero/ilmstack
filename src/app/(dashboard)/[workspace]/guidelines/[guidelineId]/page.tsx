import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getMemberRole } from '@/services/workspace.service'
import {
  getGuidelineById,
  getGuidelineVersions,
  hasRequiredClinicalRole,
} from '@/services/guidelines.service'
import { GuidelineDetailClient } from './guideline-detail-client'
import type { ClinicalRole } from '@/types/database'

interface PageProps {
  params: Promise<{ workspace: string; guidelineId: string }>
}

export default async function GuidelineDetailPage({ params }: PageProps) {
  const { workspace: slug, guidelineId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const workspace = await getWorkspaceBySlug(supabase, slug)
  if (!workspace) notFound()

  const role = await getMemberRole(supabase, workspace.id, user.id)
  if (!role) notFound()

  const [guideline, versions, profileResult] = await Promise.all([
    getGuidelineById(supabase, guidelineId, workspace.id),
    getGuidelineVersions(supabase, guidelineId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('profiles')
      .select('clinical_role, resident_year')
      .eq('id', user.id)
      .single(),
  ])

  if (!guideline) notFound()

  const userProfile = profileResult.data as { clinical_role: ClinicalRole; resident_year: number | null } | null

  // Compute edit permission
  const canEdit =
    role === 'admin' ||
    (role === 'editor' &&
      hasRequiredClinicalRole(
        userProfile?.clinical_role ?? 'other',
        userProfile?.resident_year ?? null,
        guideline.min_edit_clinical_role
      ))

  const canChangeStatus = role === 'admin' || role === 'editor'

  return (
    <GuidelineDetailClient
      guideline={guideline}
      versions={versions}
      workspaceSlug={slug}
      workspaceId={workspace.id}
      canEdit={canEdit}
      canChangeStatus={canChangeStatus}
    />
  )
}
