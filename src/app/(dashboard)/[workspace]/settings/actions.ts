'use server'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  updateWorkspace,
  getWorkspaceMembers,
  removeMember,
  updateMemberRole,
  logAuditEvent,
} from '@/services/workspace.service'
import { updateWorkspaceSchema, inviteMemberSchema } from '@/lib/validations/workspace'
import { sendInvitationEmail } from '@/lib/email'
import type { WorkspaceRole, WorkspaceMember, WorkspaceInvitationRow, AuditLogRow, Profile } from '@/types'

// ── Helpers ──────────────────────────────────────────────────

async function requireAdmin(workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || (member as any).role !== 'admin') {
    throw new Error('Admin access required')
  }

  return { supabase, user }
}

async function requireEditorPlus(workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  const role = (member as any)?.role
  if (!role || !['admin', 'editor'].includes(role)) {
    throw new Error('Editor or admin access required')
  }

  return { supabase, user, role: role as WorkspaceRole }
}

// ── General Settings ─────────────────────────────────────────

export async function updateWorkspaceAction(
  workspaceId: string,
  slug: string,
  formData: FormData
): Promise<{ error: string | null }> {
  const { supabase, user } = await requireAdmin(workspaceId)

  const raw: Record<string, unknown> = {
    name: formData.get('name') as string,
  }
  if (formData.has('description')) raw.description = formData.get('description') as string || undefined
  if (formData.has('primary_color')) raw.primary_color = formData.get('primary_color') as string

  const parsed = updateWorkspaceSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const result = await updateWorkspace(supabase, workspaceId, parsed.data)

  if (!result.error) {
    await logAuditEvent(supabase, {
      workspaceId,
      actorId: user.id,
      action: 'workspace.updated',
      resourceType: 'workspace',
      resourceId: workspaceId,
    })
    revalidatePath(`/${slug}/settings`)
  }

  return result
}

// ── Members ──────────────────────────────────────────────────

export async function getMembersAction(
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const { supabase } = await requireEditorPlus(workspaceId)
  return getWorkspaceMembers(supabase, workspaceId)
}

export async function updateMemberRoleAction(
  workspaceId: string,
  slug: string,
  targetUserId: string,
  newRole: WorkspaceRole
): Promise<{ error: string | null }> {
  const { supabase, user } = await requireAdmin(workspaceId)

  if (targetUserId === user.id) {
    return { error: 'You cannot change your own role.' }
  }

  const result = await updateMemberRole(supabase, workspaceId, targetUserId, newRole)

  if (!result.error) {
    await logAuditEvent(supabase, {
      workspaceId,
      actorId: user.id,
      action: 'member.role_changed',
      resourceType: 'workspace_member',
      resourceId: targetUserId,
      metadata: { new_role: newRole },
    })
    revalidatePath(`/${slug}/settings/members`)
  }

  return result
}

export async function removeMemberAction(
  workspaceId: string,
  slug: string,
  targetUserId: string
): Promise<{ error: string | null }> {
  const { supabase, user } = await requireAdmin(workspaceId)

  if (targetUserId === user.id) {
    return { error: 'You cannot remove yourself from the workspace.' }
  }

  const result = await removeMember(supabase, workspaceId, targetUserId)

  if (!result.error) {
    await logAuditEvent(supabase, {
      workspaceId,
      actorId: user.id,
      action: 'member.removed',
      resourceType: 'workspace_member',
      resourceId: targetUserId,
    })
    revalidatePath(`/${slug}/settings/members`)
  }

  return result
}

// ── Invitations ──────────────────────────────────────────────

export async function getInvitationsAction(
  workspaceId: string
): Promise<WorkspaceInvitationRow[]> {
  const { supabase } = await requireEditorPlus(workspaceId)

  const { data } = await supabase
    .from('workspace_invitations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending' as any)
    .order('created_at', { ascending: false })
    .returns<WorkspaceInvitationRow[]>()

  return data ?? []
}

export async function inviteMemberAction(
  workspaceId: string,
  slug: string,
  formData: FormData
): Promise<{ error: string | null }> {
  const { supabase, user } = await requireAdmin(workspaceId)

  const raw = {
    email: formData.get('email') as string,
    role: formData.get('role') as string,
  }

  const parsed = inviteMemberSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // Check if already a member
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', parsed.data.email)
    .single()

  if (existingProfile) {
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', (existingProfile as any).id)
      .single()

    if (existingMember) {
      return { error: 'This user is already a member of this workspace.' }
    }
  }

  // Check if already invited
  const { data: existingInvite } = await supabase
    .from('workspace_invitations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('email', parsed.data.email)
    .eq('status', 'pending' as any)
    .single()

  if (existingInvite) {
    return { error: 'An invitation has already been sent to this email.' }
  }

  // Use admin client to insert invitation (bypasses RLS) and get the token back
  const adminClient = createAdminClient()
  const { data: invData, error } = await (adminClient.from('workspace_invitations') as any)
    .insert({
      workspace_id: workspaceId,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: user.id,
      status: 'pending',
    })
    .select('token')
    .single()

  if (error) {
    console.error('[Settings] Invite error:', error)
    return { error: 'Failed to create invitation.' }
  }

  // Fetch workspace name and inviter display name for the email
  const [wsResult, inviterResult] = await Promise.all([
    supabase.from('workspaces').select('name').eq('id', workspaceId).single(),
    supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
  ])

  const workspaceName = (wsResult.data as any)?.name ?? 'IlmStack Health Workspace'
  const inviterProfile = inviterResult.data as any
  const inviterName = inviterProfile?.full_name ?? inviterProfile?.email ?? 'A workspace admin'

  const { error: emailError } = await sendInvitationEmail({
    to: parsed.data.email,
    inviterName,
    workspaceName,
    role: parsed.data.role,
    token: invData.token,
  })

  if (emailError) {
    console.error('[Settings] Email send error:', emailError)
    // Don't fail the action — invitation is saved, admin can share link manually
  }

  await logAuditEvent(supabase, {
    workspaceId,
    actorId: user.id,
    action: 'member.invited',
    resourceType: 'workspace_invitation',
    metadata: { email: parsed.data.email, role: parsed.data.role },
  })

  revalidatePath(`/${slug}/settings/members`)
  return { error: null }
}

export async function revokeInvitationAction(
  workspaceId: string,
  slug: string,
  invitationId: string
): Promise<{ error: string | null }> {
  const { supabase, user } = await requireAdmin(workspaceId)

  const adminClient = createAdminClient()
  const { error } = await (adminClient.from('workspace_invitations') as any)
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .eq('workspace_id', workspaceId)

  if (error) {
    return { error: 'Failed to revoke invitation.' }
  }

  await logAuditEvent(supabase, {
    workspaceId,
    actorId: user.id,
    action: 'invitation.revoked',
    resourceType: 'workspace_invitation',
    resourceId: invitationId,
  })

  revalidatePath(`/${slug}/settings/members`)
  return { error: null }
}

// ── Workspace Logo Upload ─────────────────────────────────────

export async function uploadWorkspaceLogoAction(
  workspaceId: string,
  slug: string,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const { supabase } = await requireAdmin(workspaceId)

  const file = formData.get('logo') as File | null
  if (!file || file.size === 0) return { error: 'No file provided' }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) return { error: 'Only JPEG, PNG or WebP images are allowed' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Image must be smaller than 2 MB' }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${workspaceId}/${Date.now()}.${ext}`

  // Delete existing logo files for this workspace
  const { data: existing } = await supabase.storage.from('workspace-logos').list(workspaceId)
  if (existing && existing.length > 0) {
    await supabase.storage.from('workspace-logos').remove(existing.map((f) => `${workspaceId}/${f.name}`))
  }

  const { error: uploadError } = await supabase.storage
    .from('workspace-logos')
    .upload(storagePath, file, { contentType: file.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('workspace-logos').getPublicUrl(storagePath)

  const { error: dbError } = await (supabase as any)
    .from('workspaces')
    .update({ logo_url: publicUrl })
    .eq('id', workspaceId)

  if (dbError) return { error: dbError.message }

  revalidatePath(`/${slug}/settings/branding`)
  revalidatePath(`/${slug}`)
  return { url: publicUrl }
}

// ── Workspace Specialties ─────────────────────────────────────

export async function updateWorkspaceSpecialtiesAction(
  workspaceId: string,
  slug: string,
  specialties: string[]
): Promise<{ error: string | null }> {
  const { supabase } = await requireAdmin(workspaceId)

  const { error } = await (supabase as any)
    .from('workspaces')
    .update({ specialties })
    .eq('id', workspaceId)

  if (error) return { error: error.message }

  revalidatePath(`/${slug}/settings`)
  return { error: null }
}

// ── Audit Log ────────────────────────────────────────────────

export interface AuditLogEntry extends AuditLogRow {
  actor: Pick<Profile, 'id' | 'email' | 'full_name' | 'avatar_url'> | null
}

export async function getAuditLogsAction(
  workspaceId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const { supabase } = await requireAdmin(workspaceId)

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, count } = await supabase
    .from('audit_logs')
    .select(
      '*, actor:profiles!audit_logs_actor_id_fkey(id, email, full_name, avatar_url)',
      { count: 'exact' }
    )
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(from, to)

  return {
    logs: (data ?? []) as unknown as AuditLogEntry[],
    total: count ?? 0,
  }
}
