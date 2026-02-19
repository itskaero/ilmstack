import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getMemberRole } from '@/services/workspace.service'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { DashboardShell } from '@/components/workspace/dashboard-shell'
import type { Profile, WorkspaceRole } from '@/types'

interface Props {
  children: React.ReactNode
  params: Promise<{ workspace: string }>
}

export async function generateMetadata({ params }: Props) {
  const { workspace: slug } = await params
  return {
    title: { template: `%s — ${slug}`, default: slug },
  }
}

export default async function WorkspaceDashboardLayout({ children, params }: Props) {
  const { workspace: slug } = await params

  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch workspace
  const workspace = await getWorkspaceBySlug(supabase, slug)
  if (!workspace) notFound()

  // Verify membership + get role
  const role = await getMemberRole(supabase, workspace.id, user.id)
  if (!role) {
    // User is not a member — redirect to their own workspace or home
    redirect('/')
  }

  // Fetch profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    .returns<Profile>()

  const profile: Profile = profileData ?? {
    id: user.id,
    email: user.email ?? '',
    full_name: null,
    avatar_url: null,
    specialty: null,
    title: null,
    bio: null,
    clinical_role: 'other',
    resident_year: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Fetch all user workspaces for switcher
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .returns<{ workspace_id: string; role: WorkspaceRole }[]>()

  const allWorkspaceIds = (memberships ?? []).map((m) => m.workspace_id)

  const { data: allWorkspaces } = await supabase
    .from('workspaces')
    .select('id, name, slug, logo_url')
    .in('id', allWorkspaceIds.length > 0 ? allWorkspaceIds : ['00000000-0000-0000-0000-000000000000'])
    .returns<Pick<typeof workspace, 'id' | 'name' | 'slug' | 'logo_url'>[]>()

  return (
    <WorkspaceProvider value={{ workspace, role, profile }}>
      <DashboardShell
        workspace={workspace}
        role={role}
        profile={profile}
        allWorkspaces={allWorkspaces ?? []}
        currentMemberships={memberships ?? []}
      >
        {children}
      </DashboardShell>
    </WorkspaceProvider>
  )
}
