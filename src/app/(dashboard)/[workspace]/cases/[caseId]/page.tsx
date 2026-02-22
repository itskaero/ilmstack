import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getMemberRole, getWorkspaceMembers } from '@/services/workspace.service'
import { getCaseById } from '@/services/cases.service'
import { getTopics, getTags } from '@/services/notes.service'
import { CaseDetailClient } from './case-detail-client'

interface PageProps {
  params: Promise<{ workspace: string; caseId: string }>
}

export default async function CaseDetailPage({ params }: PageProps) {
  const { workspace: slug, caseId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const workspace = await getWorkspaceBySlug(supabase, slug)
  if (!workspace) notFound()

  const role = await getMemberRole(supabase, workspace.id, user.id)
  if (!role) notFound()

  const [caseData, topics, tags, profileData, workspaceMembers] = await Promise.all([
    getCaseById(supabase, caseId, workspace.id),
    getTopics(supabase, workspace.id),
    getTags(supabase, workspace.id),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    getWorkspaceMembers(supabase, workspace.id),
  ])

  if (!caseData) notFound()

  // Increment view count (fire and forget)
  ;(supabase.rpc as any)('increment_case_views', { p_case_id: caseId }).then(() => {})

  return (
    <CaseDetailClient
      caseData={caseData}
      topics={topics}
      tags={tags}
      workspaceSlug={slug}
      workspaceId={workspace.id}
      currentUser={profileData.data!}
      role={role}
      workspaceMembers={workspaceMembers}
    />
  )
}
