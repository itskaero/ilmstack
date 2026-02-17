import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getMemberRole } from '@/services/workspace.service'
import { getNotes } from '@/services/notes.service'
import { getCases } from '@/services/cases.service'
import type { Profile, WorkspaceRole } from '@/types'
import { ProfileClient } from './profile-client'

interface Props {
  params: Promise<{ workspace: string; userId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { userId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single()
  const profile = data as { full_name: string | null; email: string } | null

  return { title: profile?.full_name ?? profile?.email ?? 'Profile' }
}

export interface WorkspaceContributions {
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
  role: WorkspaceRole
  recentNotes: Awaited<ReturnType<typeof getNotes>>['notes']
  recentCases: Awaited<ReturnType<typeof getCases>>['cases']
  totalNotes: number
  totalCases: number
}

export default async function ProfilePage({ params }: Props) {
  const { workspace: slug, userId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const workspace = await getWorkspaceBySlug(supabase, slug)
  if (!workspace) notFound()

  const role = await getMemberRole(supabase, workspace.id, user.id)
  if (!role) notFound()

  // Fetch the viewed profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
    .returns<Profile>()

  if (!profileData) notFound()

  // Get all workspaces where viewed user is a member
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', userId)
    .returns<{ workspace_id: string; role: WorkspaceRole }[]>()

  // Also get the viewer's memberships to filter only shared workspaces
  const { data: viewerMemberships } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .returns<{ workspace_id: string }[]>()

  const viewerWorkspaceIds = new Set((viewerMemberships ?? []).map((m) => m.workspace_id))

  // Only show workspaces that the viewer also has access to
  const sharedMemberships = (memberships ?? []).filter((m) => viewerWorkspaceIds.has(m.workspace_id))

  if (sharedMemberships.length === 0) notFound()

  // Fetch workspace details for all shared workspaces
  const sharedIds = sharedMemberships.map((m) => m.workspace_id)
  const { data: workspacesData } = await supabase
    .from('workspaces')
    .select('id, name, slug')
    .in('id', sharedIds)
    .returns<{ id: string; name: string; slug: string }[]>()

  const workspacesMap = new Map((workspacesData ?? []).map((w) => [w.id, w]))
  const rolesMap = new Map(sharedMemberships.map((m) => [m.workspace_id, m.role]))

  // Fetch notes/cases for all shared workspaces in parallel
  const contributions: WorkspaceContributions[] = await Promise.all(
    sharedIds.map(async (wsId) => {
      const ws = workspacesMap.get(wsId)!
      const [notesResult, casesResult, { count: totalNotes }, { count: totalCases }] = await Promise.all([
        getNotes(supabase, wsId, { author_id: userId }, 1, 5),
        getCases(supabase, wsId, { author_id: userId }, 1, 5),
        supabase.from('notes').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('author_id', userId),
        supabase.from('cases').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId).eq('author_id', userId),
      ])
      return {
        workspaceId: wsId,
        workspaceName: ws.name,
        workspaceSlug: ws.slug,
        role: rolesMap.get(wsId)!,
        recentNotes: notesResult.notes,
        recentCases: casesResult.cases,
        totalNotes: totalNotes ?? 0,
        totalCases: totalCases ?? 0,
      }
    })
  )

  const isOwnProfile = user.id === userId

  return (
    <ProfileClient
      profile={profileData}
      isOwnProfile={isOwnProfile}
      contributions={contributions}
      currentWorkspaceSlug={slug}
    />
  )
}
