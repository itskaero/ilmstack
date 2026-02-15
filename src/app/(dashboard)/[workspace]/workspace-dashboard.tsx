'use client'

import Link from 'next/link'
import {
  FileText,
  Stethoscope,
  ClipboardCheck,
  BookOpen,
  Users,
  ArrowRight,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useWorkspace } from '@/contexts/workspace-context'
import { ROUTES, NOTE_STATUS_LABELS } from '@/config/app'
import { formatRelativeTime, truncate } from '@/lib/utils'
import type { WorkspaceRow, NoteRow, CaseRow, ReviewRequestRow } from '@/types'
import type { WorkspaceStats } from '@/services/workspace.service'

interface Props {
  workspace: WorkspaceRow
  stats: WorkspaceStats
  recentNotes: Pick<NoteRow, 'id' | 'title' | 'status' | 'created_at' | 'updated_at' | 'author_id'>[]
  recentCases: Pick<CaseRow, 'id' | 'title' | 'status' | 'specialty' | 'diagnosis' | 'created_at'>[]
  pendingReviews: Pick<ReviewRequestRow, 'id' | 'note_id' | 'status' | 'priority' | 'created_at' | 'reviewer_id'>[]
}

const STATUS_BADGE_MAP: Record<string, Parameters<typeof Badge>[0]['variant']> = {
  draft: 'draft',
  under_review: 'under_review',
  approved: 'approved',
  published: 'published',
  archived: 'archived',
}

export function WorkspaceDashboard({
  workspace,
  stats,
  recentNotes,
  recentCases,
  pendingReviews,
}: Props) {
  const { profile, role } = useWorkspace()
  const slug = workspace.slug
  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  const statCards = [
    {
      title: 'Total Notes',
      value: stats.notes_total,
      sub: `${stats.notes_published} published`,
      icon: FileText,
      href: ROUTES.notes(slug),
      color: 'text-sky-500',
    },
    {
      title: 'Pending Review',
      value: stats.notes_pending,
      sub: 'awaiting reviewer',
      icon: ClipboardCheck,
      href: ROUTES.review(slug),
      color: 'text-amber-500',
    },
    {
      title: 'Case Library',
      value: stats.cases_total,
      sub: 'structured cases',
      icon: Stethoscope,
      href: ROUTES.cases(slug),
      color: 'text-emerald-500',
    },
    {
      title: 'Journals',
      value: stats.journals_total,
      sub: 'published issues',
      icon: BookOpen,
      href: ROUTES.journal(slug),
      color: 'text-violet-500',
    },
    {
      title: 'Members',
      value: stats.members_total,
      sub: 'team members',
      icon: Users,
      href: ROUTES.settingsMembers(slug),
      color: 'text-rose-500',
    },
  ]

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Good day, {profile.title ? `${profile.title} ${firstName}` : firstName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of{' '}
          <span className="font-medium text-foreground">{workspace.name}</span>
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={ROUTES.newNote(slug)}>
            <FileText className="w-4 h-4" />
            New note
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={ROUTES.newCase(slug)}>
            <Stethoscope className="w-4 h-4" />
            New case
          </Link>
        </Button>
        {(role === 'admin' || role === 'editor') && (
          <Button asChild size="sm" variant="outline">
            <Link href={ROUTES.journal(slug)}>
              <BookOpen className="w-4 h-4" />
              Generate journal
            </Link>
          </Button>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href} className="block group">
            <Card className="hover:border-primary/40 transition-colors h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                  <TrendingUp className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                <p className="text-xs font-medium mt-1 text-foreground">{card.title}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent activity grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent notes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Recent Notes</CardTitle>
            <Link
              href={ROUTES.notes(slug)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {recentNotes.length === 0 ? (
              <EmptyState
                icon={FileText}
                message="No notes yet"
                action={
                  <Link href={ROUTES.newNote(slug)} className="text-primary text-sm hover:underline">
                    Create your first note
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-border">
                {recentNotes.map((note) => (
                  <Link
                    key={note.id}
                    href={ROUTES.noteDetail(slug, note.id)}
                    className="flex items-start justify-between py-2.5 gap-3 hover:bg-accent -mx-1 px-1 rounded transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{note.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(note.updated_at)}
                      </p>
                    </div>
                    <Badge
                      variant={STATUS_BADGE_MAP[note.status] ?? 'outline'}
                      className="flex-shrink-0 text-[10px]"
                    >
                      {NOTE_STATUS_LABELS[note.status]}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent cases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Recent Cases</CardTitle>
            <Link
              href={ROUTES.cases(slug)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {recentCases.length === 0 ? (
              <EmptyState
                icon={Stethoscope}
                message="No cases yet"
                action={
                  <Link href={ROUTES.newCase(slug)} className="text-primary text-sm hover:underline">
                    Add your first case
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-border">
                {recentCases.map((c) => (
                  <Link
                    key={c.id}
                    href={ROUTES.caseDetail(slug, c.id)}
                    className="flex items-start justify-between py-2.5 gap-3 hover:bg-accent -mx-1 px-1 rounded transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[c.specialty, c.diagnosis ? truncate(c.diagnosis, 24) : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <Badge
                      variant={c.status === 'published' ? 'published' : 'draft'}
                      className="flex-shrink-0 text-[10px]"
                    >
                      {c.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending reviews */}
        {(role === 'admin' || role === 'editor') && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Pending Reviews
                {pendingReviews.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
                    {pendingReviews.length}
                  </span>
                )}
              </CardTitle>
              <Link
                href={ROUTES.review(slug)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {pendingReviews.length === 0 ? (
                <EmptyState
                  icon={ClipboardCheck}
                  message="No pending reviews — you&apos;re all caught up!"
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pendingReviews.map((review) => (
                    <Link
                      key={review.id}
                      href={ROUTES.review(slug)}
                      className="flex items-center gap-2 p-2 rounded-md border border-border hover:border-primary/40 transition-colors"
                    >
                      <ClipboardCheck className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">Note #{review.note_id.slice(0, 8)}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          Priority: {review.priority}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  message,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  message: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
      <Icon className="w-8 h-8 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && action}
    </div>
  )
}
