import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { WorkspaceMemberRow, WorkspaceRow } from '@/types'

/**
 * Root page — redirects authenticated users to their workspace
 * or to the login page if unauthenticated.
 */
export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the first workspace membership
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .limit(1)
    .returns<Pick<WorkspaceMemberRow, 'workspace_id'>[]>()

  if (membership && membership.length > 0) {
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('slug')
      .eq('id', membership[0].workspace_id)
      .returns<Pick<WorkspaceRow, 'slug'>[]>()

    if (workspace && workspace.length > 0) {
      redirect(`/${workspace[0].slug}`)
    }
  }

  // No workspace yet — send to workspace creation
  redirect('/workspace/new')
}
