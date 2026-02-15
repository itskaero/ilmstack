import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AcceptInvitationForm } from './accept-invitation-form'
import type { WorkspaceInvitationRow, WorkspaceRow } from '@/types'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function AcceptInvitationPage({ searchParams }: Props) {
  const { token } = await searchParams
  if (!token) notFound()

  const supabase = await createClient()

  const { data: invData } = await supabase
    .from('workspace_invitations')
    .select('id, email, role, status, expires_at, workspace_id')
    .eq('token', token)
    .limit(1)
    .returns<Pick<WorkspaceInvitationRow, 'id' | 'email' | 'role' | 'status' | 'expires_at' | 'workspace_id'>[]>()

  const invitation = (invData as any)?.[0]

  if (!invitation || invitation.status !== 'pending') {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">Invalid invitation</h1>
        <p className="text-muted-foreground text-sm">
          This invitation link is invalid, has already been used, or has expired.
        </p>
      </div>
    )
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">Invitation expired</h1>
        <p className="text-muted-foreground text-sm">
          This invitation expired on{' '}
          {new Date(invitation.expires_at).toLocaleDateString()}. Ask your admin to send a new one.
        </p>
      </div>
    )
  }

  const { data: wsData } = await supabase
    .from('workspaces')
    .select('name, logo_url')
    .eq('id', invitation.workspace_id)
    .limit(1)
    .returns<Pick<WorkspaceRow, 'name' | 'logo_url'>[]>()

  const workspace = (wsData as any)?.[0]
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <AcceptInvitationForm
      token={token}
      invitation={{ email: invitation.email, role: invitation.role }}
      workspace={{ name: workspace?.name ?? 'Unknown Workspace', logo_url: workspace?.logo_url ?? null }}
      isLoggedIn={!!user}
      currentUserEmail={user?.email ?? null}
    />
  )
}
