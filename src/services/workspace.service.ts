// ============================================================
// ILMSTACK HEALTH — Workspace Service
// ============================================================
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, WorkspaceRow, WorkspaceMember, WorkspaceRole } from '@/types'
import { slugify } from '@/lib/utils'
import { createAdminClient } from '@/lib/supabase/server'

type Supabase = SupabaseClient<Database>

export interface CreateWorkspaceParams {
  name: string
  slug: string
  description?: string
  userId: string
}

export async function createWorkspace(
  supabase: Supabase,
  params: CreateWorkspaceParams
): Promise<{ workspace: WorkspaceRow; error: null } | { workspace: null; error: string }> {
  const { name, description, userId } = params
  const slug = slugify(params.slug)

  if (!slug) return { workspace: null, error: 'Invalid workspace slug.' }

  // Use admin client for workspace + member creation to bypass RLS chicken-and-egg:
  // 1. Workspace INSERT policy requires created_by = auth.uid(), but server-side client
  //    may not always carry the user session correctly.
  // 2. Member INSERT requires admin role, but user isn't a member yet.
  const adminClient = createAdminClient()

  const { data: existing } = await adminClient
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .limit(1)

  if (existing && (existing as any[]).length > 0) {
    return { workspace: null, error: 'This URL is already taken. Please choose another.' }
  }

  const { data: insertData, error: wsError } = await adminClient
    .from('workspaces')
    .insert({ name: name.trim(), slug, description: description?.trim() ?? null, created_by: userId } as any)
    .select()
    .limit(1)
    .returns<WorkspaceRow[]>()

  const ws = (insertData as WorkspaceRow[] | null)?.[0]

  if (wsError || !ws) {
    console.error('[WorkspaceService] Create error:', wsError)
    return { workspace: null, error: 'Failed to create workspace.' }
  }
  const { error: memberError } = await adminClient
    .from('workspace_members')
    .insert({ workspace_id: ws.id, user_id: userId, role: 'admin' } as any)

  if (memberError) {
    console.error('[WorkspaceService] Add member error:', memberError)
    await adminClient.from('workspaces').delete().eq('id', ws.id)
    return { workspace: null, error: 'Failed to set up workspace membership.' }
  }

  return { workspace: ws, error: null }
}

export async function getWorkspaceBySlug(
  supabase: Supabase,
  slug: string
): Promise<WorkspaceRow | null> {
  const { data } = await supabase
    .from('workspaces')
    .select('*')
    .eq('slug', slug)
    .limit(1)
    .returns<WorkspaceRow[]>()

  return (data as WorkspaceRow[] | null)?.[0] ?? null
}

export async function getMemberRole(
  supabase: Supabase,
  workspaceId: string,
  userId: string
): Promise<WorkspaceRole | null> {
  const { data } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .limit(1)
    .returns<{ role: WorkspaceRole }[]>()

  return (data as { role: WorkspaceRole }[] | null)?.[0]?.role ?? null
}

export async function getWorkspaceMembers(
  supabase: Supabase,
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const { data } = await supabase
    .from('workspace_members')
    .select('id, workspace_id, user_id, role, invited_by, joined_at, profile:profiles\!workspace_members_user_id_fkey(id, email, full_name, avatar_url, specialty, title, bio, created_at, updated_at)')
    .eq('workspace_id', workspaceId)
    .order('joined_at', { ascending: true })

  return (data ?? []) as unknown as WorkspaceMember[]
}

export async function updateWorkspace(
  supabase: Supabase,
  workspaceId: string,
  updates: Partial<Pick<WorkspaceRow, 'name' | 'description' | 'logo_url' | 'primary_color'>>
): Promise<{ error: string | null }> {
  const { error } = await (supabase.from('workspaces') as any).update(updates).eq('id', workspaceId)
  return { error: error?.message ?? null }
}

export async function removeMember(
  supabase: Supabase,
  workspaceId: string,
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
  return { error: error?.message ?? null }
}

export async function updateMemberRole(
  supabase: Supabase,
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<{ error: string | null }> {
  const { error } = await (supabase.from('workspace_members') as any)
    .update({ role })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
  return { error: error?.message ?? null }
}

export interface WorkspaceStats {
  notes_total: number
  notes_published: number
  notes_pending: number
  cases_total: number
  members_total: number
  journals_total: number
}

export async function getWorkspaceStats(
  supabase: Supabase,
  workspaceId: string
): Promise<WorkspaceStats> {
  const [notes, published, pending, cases, members, journals] = await Promise.all([
    supabase.from('notes').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('notes').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'published' as any),
    supabase.from('notes').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'under_review' as any),
    supabase.from('cases').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('workspace_members').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('journals').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'published' as any),
  ])

  return {
    notes_total: notes.count ?? 0,
    notes_published: published.count ?? 0,
    notes_pending: pending.count ?? 0,
    cases_total: cases.count ?? 0,
    members_total: members.count ?? 0,
    journals_total: journals.count ?? 0,
  }
}

export async function logAuditEvent(
  supabase: Supabase,
  params: {
    workspaceId: string
    actorId: string
    action: string
    resourceType: string
    resourceId?: string
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  await supabase.from('audit_logs').insert({
    workspace_id: params.workspaceId,
    actor_id: params.actorId,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId ?? null,
    metadata: params.metadata ?? {},
  } as any)
}
