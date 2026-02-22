import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Plus } from 'lucide-react'
import { BrowseClient } from './browse-client'
import type { BrowseWorkspace, RequestStatus } from './browse-client'

// Row shapes for Supabase query returns
type WsRow = {
  id: string; name: string; slug: string; description: string | null
  logo_url: string | null; primary_color: string; specialties: string[]
}
type ReqRow = { id: string; workspace_id: string; status: string }
type ProfileRow = { full_name: string | null; email: string; avatar_url: string | null }

export default async function BrowseWorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; specialty?: string }>
}) {
  const { q: rawQ, specialty: rawSpecialty } = await searchParams
  const query = rawQ?.trim() ?? ''
  const specialty = rawSpecialty?.trim() ?? ''

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Fetch user's profile for the nav ────────────────────────
  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url')
    .eq('id', user.id)
    .single()
    .returns<ProfileRow>()

  const profile = profileData ?? { full_name: null, email: user.email ?? '', avatar_url: null }

  // ── Fetch workspaces (filtered) ──────────────────────────────
  let wsQuery = supabase
    .from('workspaces')
    .select('id, name, slug, description, logo_url, primary_color, specialties')
    .order('name')
    .limit(100)

  if (query.length >= 2) {
    wsQuery = wsQuery.or(`name.ilike.%${query}%,slug.ilike.%${query}%,description.ilike.%${query}%`)
  }

  if (specialty && specialty !== 'all') {
    wsQuery = wsQuery.contains('specialties', [specialty])
  }

  const { data: wsData } = await wsQuery.returns<WsRow[]>()
  const workspaces: BrowseWorkspace[] = wsData ?? []

  // ── Fetch user's memberships ─────────────────────────────────
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .returns<{ workspace_id: string }[]>()

  const memberIds = new Set((memberships ?? []).map((m) => m.workspace_id))

  // ── Fetch user's join requests (all statuses) ────────────────
  const { data: requestsRaw } = await (supabase.from('workspace_join_requests') as any)
    .select('id, workspace_id, status')
    .eq('user_id', user.id)
  const requests = (requestsRaw ?? []) as ReqRow[]

  const statusMap: Record<string, { status: RequestStatus; requestId: string }> = {}
  for (const req of requests ?? []) {
    statusMap[req.workspace_id] = {
      status: req.status as RequestStatus,
      requestId: req.id,
    }
  }

  // ── Collect all unique specialties for the filter ────────────
  const { data: allWs } = await supabase
    .from('workspaces')
    .select('specialties')
    .returns<{ specialties: string[] }[]>()

  const specialtySet = new Set<string>()
  for (const ws of allWs ?? []) {
    for (const s of ws.specialties ?? []) {
      if (s) specialtySet.add(s)
    }
  }
  const allSpecialties = Array.from(specialtySet).sort()

  // ── Nav helpers ──────────────────────────────────────────────
  const displayName = profile.full_name ?? profile.email.split('@')[0]
  const initials = (profile.full_name ?? profile.email)
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/home" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="IlmStack" width={26} height={26} className="rounded" />
            <span className="font-semibold text-sm hidden sm:block">IlmStack Health</span>
          </Link>

          <div className="flex items-center gap-3">
            <Button asChild size="sm" className="h-8 text-xs">
              <Link href="/workspace/new">
                <Plus className="h-3.5 w-3.5 mr-1" /> New Workspace
              </Link>
            </Button>
            <Avatar className="h-7 w-7">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </nav>

      {/* ── Page header ── */}
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Browse Workspaces</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Find a clinical workspace to join — search by hospital, clinic, or specialty.
          </p>
        </div>

        {/* ── Client component (search + results) ── */}
        <div className="space-y-5 pb-12">
          <BrowseClient
            initialWorkspaces={workspaces}
            statusMap={statusMap}
            memberIds={memberIds}
            initialQuery={query}
            initialSpecialty={specialty}
            allSpecialties={allSpecialties}
          />
        </div>
      </div>
    </div>
  )
}
