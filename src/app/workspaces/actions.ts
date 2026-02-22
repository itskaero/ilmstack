'use server'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { WorkspaceRole } from '@/types'

// ── Apply for a workspace ─────────────────────────────────────────────────

export async function applyForWorkspaceAction(
  workspaceId: string,
  message?: string
): Promise<{ error: string | null; requestId?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data, error } = await (supabase.from('workspace_join_requests') as any)
    .insert({ workspace_id: workspaceId, user_id: user.id, message: message ?? null })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505')
      return { error: 'You have already submitted a request for this workspace.' }
    console.error('[JoinRequest] Insert error:', error)
    return { error: 'Failed to submit your request. Please try again.' }
  }

  return { error: null, requestId: (data as any).id }
}

// ── Withdraw (cancel) a pending request ──────────────────────────────────

export async function withdrawJoinRequestAction(
  requestId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await (supabase.from('workspace_join_requests') as any)
    .delete()
    .eq('id', requestId)
    .eq('user_id', user.id)
    .eq('status', 'pending')

  if (error) {
    console.error('[JoinRequest] Withdraw error:', error)
    return { error: 'Failed to withdraw request.' }
  }

  return { error: null }
}

// ── Admin: approve or reject a request ───────────────────────────────────

export async function reviewJoinRequestAction(
  workspaceId: string,
  slug: string,
  requestId: string,
  decision: 'approved' | 'rejected',
  role: WorkspaceRole = 'viewer'
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Verify caller is an admin of this workspace
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || (member as any).role !== 'admin') return { error: 'Not authorised.' }

  // Fetch the request
  const { data: req, error: reqError } = await (supabase
    .from('workspace_join_requests') as any)
    .select('id, user_id, status')
    .eq('id', requestId)
    .eq('workspace_id', workspaceId)
    .single()

  if (reqError || !req) return { error: 'Request not found.' }
  if ((req as any).status !== 'pending') return { error: 'Request is no longer pending.' }

  // Mark request reviewed
  await (supabase.from('workspace_join_requests') as any)
    .update({
      status: decision,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  // If approved → add to workspace_members via admin client (bypasses RLS)
  if (decision === 'approved') {
    const admin = createAdminClient()
    const { error: memberError } = await (admin.from('workspace_members') as any).insert({
      workspace_id: workspaceId,
      user_id: (req as any).user_id,
      role,
      invited_by: user.id,
    })
    if (memberError) {
      console.error('[JoinRequest] Add member error:', memberError)
      return { error: 'Approved but failed to add member — try inviting them manually.' }
    }
  }

  // Revalidate settings page so the list updates without a hard reload
  const { revalidatePath } = await import('next/cache')
  revalidatePath(`/${slug}/settings/members`)

  return { error: null }
}

// ── Admin: fetch pending join requests for a workspace ───────────────────

export async function getJoinRequestsAction(workspaceId: string) {
  const supabase = await createClient()

  const { data } = await (supabase.from('workspace_join_requests') as any)
    .select(
      `id, user_id, message, status, created_at,
       profile:user_id (
         id, full_name, email, avatar_url, specialty, clinical_role
       )`
    )
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  return (data ?? []) as Array<{
    id: string
    user_id: string
    message: string | null
    status: string
    created_at: string
    profile: {
      id: string
      full_name: string | null
      email: string
      avatar_url: string | null
      specialty: string | null
      clinical_role: string
    }
  }>
}
