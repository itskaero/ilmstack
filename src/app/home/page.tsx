import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HomePage } from '../home-page'
import type { HomeProfile, WorkspaceWithRole, ActivityItem } from '../home-types'
import type { WorkspaceRole } from '@/types'

// Local row shapes for Supabase query returns
type WsRow = { id: string; name: string; slug: string; description: string | null; logo_url: string | null; primary_color: string; specialties: string[] }
type NoteRow = { id: string; title: string; workspace_id: string; updated_at: string; status: string }
type CaseRow = { id: string; title: string; workspace_id: string; created_at: string; specialty: string | null }
type GuidelineRow = { id: string; title: string; workspace_id: string; updated_at: string; status: string }

export default async function HomeDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ── Fetch profile ──────────────────────────────────────────────────
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, email, title')
    .eq('id', user.id)
    .single()
    .returns<HomeProfile>()

  const profile: HomeProfile = profileData ?? {
    id: user.id,
    full_name: null,
    avatar_url: null,
    email: user.email ?? '',
    title: null,
  }

  // ── Fetch all workspace memberships ───────────────────────────────
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .returns<{ workspace_id: string; role: WorkspaceRole }[]>()

  const membershipMap = new Map(
    (memberships ?? []).map((m) => [m.workspace_id, m.role])
  )
  const workspaceIds = Array.from(membershipMap.keys())

  let workspaces: WorkspaceWithRole[] = []

  if (workspaceIds.length > 0) {
    const { data: wsData } = await supabase
      .from('workspaces')
      .select('id, name, slug, description, logo_url, primary_color, specialties')
      .in('id', workspaceIds)
      .order('name')
      .returns<WsRow[]>()

    workspaces = (wsData ?? []).map((ws) => ({
      ...ws,
      role: membershipMap.get(ws.id) ?? 'viewer',
    }))
  }

  // ── Fetch recent activity across all workspaces ───────────────────
  let activity: ActivityItem[] = []

  if (workspaceIds.length > 0) {
    const slugMap = new Map(workspaces.map((w) => [w.id, { slug: w.slug, name: w.name }]))

    const [notesRes, casesRes, guidelinesRes] = await Promise.all([
      supabase
        .from('notes')
        .select('id, title, workspace_id, updated_at, status')
        .in('workspace_id', workspaceIds)
        .order('updated_at', { ascending: false })
        .limit(10)
        .returns<NoteRow[]>(),

      supabase
        .from('cases')
        .select('id, title, workspace_id, created_at, specialty')
        .in('workspace_id', workspaceIds)
        .order('created_at', { ascending: false })
        .limit(10)
        .returns<CaseRow[]>(),

      supabase
        .from('guidelines')
        .select('id, title, workspace_id, updated_at, status')
        .in('workspace_id', workspaceIds)
        .order('updated_at', { ascending: false })
        .limit(10)
        .returns<GuidelineRow[]>(),
    ])

    const noteItems: ActivityItem[] = (notesRes.data ?? []).map((n) => ({
      id: n.id,
      type: 'note',
      title: n.title,
      workspaceId: n.workspace_id,
      workspaceSlug: slugMap.get(n.workspace_id)?.slug ?? '',
      workspaceName: slugMap.get(n.workspace_id)?.name ?? '',
      date: n.updated_at,
      status: n.status,
    }))

    const caseItems: ActivityItem[] = (casesRes.data ?? []).map((c) => ({
      id: c.id,
      type: 'case',
      title: c.title,
      workspaceId: c.workspace_id,
      workspaceSlug: slugMap.get(c.workspace_id)?.slug ?? '',
      workspaceName: slugMap.get(c.workspace_id)?.name ?? '',
      date: c.created_at,
      specialty: c.specialty,
    }))

    const guidelineItems: ActivityItem[] = (guidelinesRes.data ?? []).map((g) => ({
      id: g.id,
      type: 'guideline',
      title: g.title,
      workspaceId: g.workspace_id,
      workspaceSlug: slugMap.get(g.workspace_id)?.slug ?? '',
      workspaceName: slugMap.get(g.workspace_id)?.name ?? '',
      date: g.updated_at,
      status: g.status,
    }))

    activity = [...noteItems, ...caseItems, ...guidelineItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20)
  }

  return <HomePage profile={profile} workspaces={workspaces} activity={activity} />
}
