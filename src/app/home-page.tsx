'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import {
  Plus, Search, FileText, Stethoscope, BookOpen,
  ChevronRight, LogOut, Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import type { HomeProfile, WorkspaceWithRole, ActivityItem } from './home-types'

// ── Re-export types for consumers ──────────────────────────────────────
export type { HomeProfile, WorkspaceWithRole, ActivityItem }

// ── Small helpers ──────────────────────────────────────────────────────

type WorkspaceRole = WorkspaceWithRole['role']

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  contributor: 'Contributor',
  viewer: 'Viewer',
}

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  editor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  contributor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  viewer: 'bg-muted text-muted-foreground',
}

function initials(name: string | null, email: string) {
  if (name) return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

function displayName(profile: HomeProfile) {
  if (profile.full_name) return profile.full_name
  return profile.email.split('@')[0]
}

function firstName(profile: HomeProfile) {
  if (profile.full_name) return profile.full_name.split(' ')[0]
  return profile.email.split('@')[0]
}

// ── Workspace Card ──────────────────────────────────────────────────────

function WorkspaceCard({ workspace }: { workspace: WorkspaceWithRole }) {
  const router = useRouter()
  return (
    <div
      onClick={() => router.push(`/${workspace.slug}`)}
      className="rounded-lg border border-border bg-card p-4 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-3">
        {workspace.logo_url ? (
          <Image
            src={workspace.logo_url}
            alt={workspace.name}
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: workspace.primary_color }}
          >
            {workspace.name.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
              {workspace.name}
            </h3>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${ROLE_COLORS[workspace.role]}`}>
              {ROLE_LABELS[workspace.role]}
            </span>
          </div>

          {workspace.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {workspace.description}
            </p>
          )}

          {workspace.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {workspace.specialties.slice(0, 3).map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                  {s}
                </Badge>
              ))}
              {workspace.specialties.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{workspace.specialties.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  )
}

// ── Activity Feed ───────────────────────────────────────────────────────

const ACTIVITY_ICONS = {
  note: FileText,
  case: Stethoscope,
  guideline: BookOpen,
}

const ACTIVITY_LABELS = {
  note: 'Note',
  case: 'Case',
  guideline: 'Guideline',
}

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">No recent activity yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Activity will appear here once content is created in your workspaces.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
      {items.map((item) => {
        const Icon = ACTIVITY_ICONS[item.type]
        const href = item.type === 'note'
          ? `/${item.workspaceSlug}/notes/${item.id}`
          : item.type === 'case'
          ? `/${item.workspaceSlug}/cases/${item.id}`
          : `/${item.workspaceSlug}/guidelines/${item.id}`

        return (
          <Link
            key={`${item.type}-${item.id}`}
            href={href}
            className="flex items-start gap-3 p-3.5 hover:bg-accent/50 transition-colors"
          >
            <div className="mt-0.5 h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug line-clamp-1">{item.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {ACTIVITY_LABELS[item.type]}
                </span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground truncate">{item.workspaceName}</span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                </span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ── Main Home Page ─────────────────────────────────────────────────────

interface HomePageProps {
  profile: HomeProfile
  workspaces: WorkspaceWithRole[]
  activity: ActivityItem[]
}

export function HomePage({ profile, workspaces, activity }: HomePageProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top navigation ── */}
      <nav className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="IlmStack" width={28} height={28} className="rounded" />
            <span className="font-semibold text-sm hidden sm:block">IlmStack Health</span>
          </Link>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <Avatar className="h-8 w-8">
                  {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback className="text-xs">
                    {initials(profile.full_name, profile.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:block">{displayName(profile)}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{displayName(profile)}</p>
                <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
              </div>
              <DropdownMenuSeparator />
              {workspaces.length > 0 && (
                <>
                  {workspaces.slice(0, 3).map((ws) => (
                    <DropdownMenuItem key={ws.id} onClick={() => router.push(`/${ws.slug}`)}>
                      <Building2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      <span className="truncate">{ws.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="h-3.5 w-3.5 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {firstName(profile)}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {profile.title ? `${profile.title} · ` : ''}Your clinical workspaces and recent activity
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Workspaces column (2/3 width) ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                My Workspaces
              </h2>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                  <Link href="/workspaces">
                    <Search className="h-3 w-3 mr-1.5" />
                    Browse Workspaces
                  </Link>
                </Button>
                <Button size="sm" className="h-8 text-xs" asChild>
                  <Link href="/workspace/new">
                    <Plus className="h-3 w-3 mr-1.5" />
                    New Workspace
                  </Link>
                </Button>
              </div>
            </div>

            {workspaces.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center">
                <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No workspaces yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Create a workspace for your hospital or clinic, or find an existing one to join.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button size="sm" asChild>
                    <Link href="/workspace/new">
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Create Workspace
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/workspaces">
                      <Search className="h-3.5 w-3.5 mr-1.5" />
                      Browse Workspaces
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {workspaces.map((ws) => (
                  <WorkspaceCard key={ws.id} workspace={ws} />
                ))}
              </div>
            )}
          </div>

          {/* ── Activity column (1/3 width) ── */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Recent Activity
            </h2>
            <ActivityFeed items={activity} />
          </div>
        </div>
      </main>

    </div>
  )
}
