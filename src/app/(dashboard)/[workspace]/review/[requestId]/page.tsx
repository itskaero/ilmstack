import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getMemberRole, getWorkspaceMembers } from '@/services/workspace.service'
import { getReviewRequestById, getReviewActions } from '@/services/review.service'
import { ReviewDetailClient } from './review-detail-client'

interface PageProps {
  params: Promise<{ workspace: string; requestId: string }>
}

export default async function ReviewDetailPage({ params }: PageProps) {
  const { workspace: slug, requestId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const workspace = await getWorkspaceBySlug(supabase, slug)
  if (!workspace) notFound()

  const role = await getMemberRole(supabase, workspace.id, user.id)
  if (!role) notFound()

  const [request, actions, members, profileData] = await Promise.all([
    getReviewRequestById(supabase, requestId, workspace.id),
    getReviewActions(supabase, requestId, workspace.id),
    getWorkspaceMembers(supabase, workspace.id),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  if (!request) notFound()

  return (
    <ReviewDetailClient
      request={request}
      actions={actions}
      members={members}
      workspaceSlug={slug}
      workspaceId={workspace.id}
      currentUser={profileData.data!}
      role={role}
    />
  )
}
