'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  UserCheck,
  RefreshCw,
  Calendar,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReviewStatusBadge, ReviewPriorityBadge } from '@/components/review/review-status-badge'
import { ReviewerSelect } from '@/components/review/reviewer-select'
import { ReviewActionPanel } from '@/components/review/review-action-panel'
import { ROUTES } from '@/config/app'
import type {
  ReviewRequest,
  ReviewAction,
  WorkspaceMember,
  WorkspaceRole,
  Profile,
  ReviewActionType,
} from '@/types/database'

const MDPreview = dynamic(() => import('@uiw/react-markdown-preview'), { ssr: false })

const ACTION_ICONS: Partial<Record<ReviewActionType, React.ReactNode>> = {
  submitted: <Send className="h-3.5 w-3.5 text-blue-500" />,
  assigned: <UserCheck className="h-3.5 w-3.5 text-primary" />,
  approved: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  rejected: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  changes_requested: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  comment_added: <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />,
  revision_submitted: <RefreshCw className="h-3.5 w-3.5 text-blue-500" />,
  reopened: <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />,
}

const ACTION_LABELS: Record<ReviewActionType, string> = {
  submitted: 'submitted for review',
  assigned: 'assigned a reviewer',
  approved: 'approved the note',
  rejected: 'rejected the note',
  changes_requested: 'requested changes',
  comment_added: 'commented',
  revision_submitted: 'submitted a revision',
  reopened: 'reopened the review',
}

interface ReviewDetailClientProps {
  request: ReviewRequest
  actions: ReviewAction[]
  members: WorkspaceMember[]
  workspaceSlug: string
  workspaceId: string
  currentUser: Profile
  role: WorkspaceRole
}

export function ReviewDetailClient({
  request,
  actions,
  members,
  workspaceSlug,
  workspaceId,
  currentUser,
  role,
}: ReviewDetailClientProps) {
  const isAdminOrEditor = role === 'admin' || role === 'editor'

  const reviewerName = request.reviewer
    ? (request.reviewer.full_name ?? request.reviewer.email)
    : null

  const reviewerInitials = reviewerName
    ? reviewerName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  const requesterName =
    request.requester?.full_name ?? request.requester?.email ?? 'Unknown'
  const requesterInitials = requesterName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border shrink-0">
        <Button variant="ghost" size="sm" asChild>
          <Link href={ROUTES.review(workspaceSlug)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Review Queue
          </Link>
        </Button>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground truncate flex-1 max-w-sm">
          {request.note?.title ?? 'Review'}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <ReviewStatusBadge status={request.status} />
          {request.priority !== 'normal' && (
            <ReviewPriorityBadge priority={request.priority} />
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Note content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-r border-border">
          <div className="px-6 py-3 border-b border-border bg-muted/30 shrink-0">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="text-xs h-7" asChild>
                <Link href={ROUTES.noteDetail(workspaceSlug, request.note_id)}>
                  Open note →
                </Link>
              </Button>
              <span className="text-xs text-muted-foreground">Read-only preview</span>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="px-8 py-6">
              <h1 className="text-xl font-bold mb-4">
                {request.note?.title ?? 'Untitled Note'}
              </h1>
              {request.note && 'content' in request.note ? (
                <div data-color-mode="auto" className="prose-clinical">
                  <MDPreview source={(request.note as any).content} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Note content not loaded. Open the full note to read it.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Sidebar */}
        <aside className="w-72 shrink-0 flex flex-col">
          <Tabs defaultValue="actions" className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b border-border h-10 px-2 bg-background shrink-0">
              <TabsTrigger value="actions" className="flex-1 text-xs">
                Actions
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex-1 text-xs">
                Timeline
              </TabsTrigger>
            </TabsList>

            {/* Actions tab */}
            <TabsContent value="actions" className="flex-1 mt-0 overflow-y-auto p-4 space-y-4">
              {/* Review meta */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Submitted by</span>
                  <span className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={request.requester?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[8px]">{requesterInitials}</AvatarFallback>
                    </Avatar>
                    {requesterName}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reviewer</span>
                  {reviewerName ? (
                    <span className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={request.reviewer?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[8px]">{reviewerInitials}</AvatarFallback>
                      </Avatar>
                      {reviewerName}
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-1">
                      Unassigned
                    </span>
                  )}
                </div>

                {request.due_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Due date</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(request.due_date), 'PP')}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Assign reviewer */}
              {isAdminOrEditor && (
                <ReviewerSelect
                  requestId={request.id}
                  workspaceId={workspaceId}
                  workspaceSlug={workspaceSlug}
                  noteId={request.note_id}
                  members={members}
                  currentReviewerId={request.reviewer_id}
                />
              )}

              <Separator />

              {/* Review action panel */}
              <ReviewActionPanel
                requestId={request.id}
                workspaceId={workspaceId}
                workspaceSlug={workspaceSlug}
                noteId={request.note_id}
                reviewStatus={request.status}
                currentUserId={currentUser.id}
                reviewerId={request.reviewer_id}
                role={role}
              />
            </TabsContent>

            {/* Timeline tab */}
            <TabsContent value="timeline" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-0">
                  {actions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No activity yet.
                    </p>
                  ) : (
                    <div className="relative">
                      {/* Vertical line */}
                      <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />

                      <div className="space-y-4">
                        {actions.map((action) => {
                          const actorName =
                            action.actor?.full_name ?? action.actor?.email ?? 'Unknown'
                          const actorInitials = actorName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)

                          return (
                            <div key={action.id} className="flex gap-3 relative">
                              <div className="h-7 w-7 rounded-full bg-background border border-border flex items-center justify-center shrink-0 z-10">
                                {ACTION_ICONS[action.action] ?? (
                                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Avatar className="h-4 w-4">
                                    <AvatarImage src={action.actor?.avatar_url ?? undefined} />
                                    <AvatarFallback className="text-[8px]">
                                      {actorInitials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs font-medium">{actorName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {ACTION_LABELS[action.action]}
                                  </span>
                                </div>
                                {action.note && (
                                  <div className="mt-1.5 rounded bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground whitespace-pre-wrap border border-border/50">
                                    &ldquo;{action.note}&rdquo;
                                  </div>
                                )}
                                <p className="text-[11px] text-muted-foreground/70 mt-1">
                                  {formatDistanceToNow(new Date(action.created_at), {
                                    addSuffix: true,
                                  })}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  )
}
