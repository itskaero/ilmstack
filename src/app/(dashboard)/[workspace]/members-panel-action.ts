'use server'

import { createClient } from '@/lib/supabase/server'
import type { WorkspaceRole } from '@/types/database'

export interface MemberStat {
  user_id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  role: WorkspaceRole
  specialty: string | null
  cases_added: number
  notes_added: number
  last_activity: string | null
}

export async function getWorkspaceMemberStats(workspaceId: string): Promise<MemberStat[]> {
  const supabase = await createClient()

  const [membersResult, casesResult, notesResult] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('user_id, role, profile:profiles!workspace_members_user_id_fkey(id, full_name, email, avatar_url, specialty)')
      .eq('workspace_id', workspaceId),
    supabase
      .from('cases')
      .select('author_id, updated_at')
      .eq('workspace_id', workspaceId),
    supabase
      .from('notes')
      .select('author_id, updated_at')
      .eq('workspace_id', workspaceId),
  ])

  const members = (membersResult.data ?? []) as Array<{
    user_id: string
    role: WorkspaceRole
    profile: { id: string; full_name: string | null; email: string; avatar_url: string | null; specialty: string | null } | null
  }>

  const cases = (casesResult.data ?? []) as Array<{ author_id: string; updated_at: string }>
  const notes = (notesResult.data ?? []) as Array<{ author_id: string; updated_at: string }>

  const casesCount = new Map<string, number>()
  const casesLatest = new Map<string, string>()
  for (const c of cases) {
    casesCount.set(c.author_id, (casesCount.get(c.author_id) ?? 0) + 1)
    const prev = casesLatest.get(c.author_id)
    if (!prev || c.updated_at > prev) casesLatest.set(c.author_id, c.updated_at)
  }

  const notesCount = new Map<string, number>()
  const notesLatest = new Map<string, string>()
  for (const n of notes) {
    notesCount.set(n.author_id, (notesCount.get(n.author_id) ?? 0) + 1)
    const prev = notesLatest.get(n.author_id)
    if (!prev || n.updated_at > prev) notesLatest.set(n.author_id, n.updated_at)
  }

  const roleOrder: Record<WorkspaceRole, number> = { admin: 0, editor: 1, contributor: 2, viewer: 3 }

  return members
    .filter((m) => m.profile !== null)
    .map((m) => {
      const p = m.profile!
      const cl = casesLatest.get(m.user_id) ?? null
      const nl = notesLatest.get(m.user_id) ?? null
      const last_activity = cl && nl ? (cl > nl ? cl : nl) : cl ?? nl

      return {
        user_id: m.user_id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url,
        role: m.role,
        specialty: p.specialty,
        cases_added: casesCount.get(m.user_id) ?? 0,
        notes_added: notesCount.get(m.user_id) ?? 0,
        last_activity,
      }
    })
    .sort((a, b) => {
      const rd = roleOrder[a.role] - roleOrder[b.role]
      if (rd !== 0) return rd
      return (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email)
    })
}
