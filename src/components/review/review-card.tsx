import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { User, Calendar, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ReviewStatusBadge, ReviewPriorityBadge } from './review-status-badge'
import type { ReviewRequest } from '@/types/database'

interface ReviewCardProps {
  request: ReviewRequest
  workspaceSlug: string
  currentUserId: string
}

export function ReviewCard({ request, workspaceSlug, currentUserId }: ReviewCardProps) {
  const requesterName =
    request.requester?.full_name ?? request.requester?.email ?? 'Unknown'
  const requesterInitials = requesterName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const reviewerName = request.reviewer
    ? (request.reviewer.full_name ?? request.reviewer.email)
    : null

  const isAssignedToMe = request.reviewer_id === currentUserId

  const isOverdue =
    request.due_date && new Date(request.due_date) < new Date()

  return (
    <Card className="group hover:shadow-md transition-all duration-200 hover:border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/${workspaceSlug}/review/${request.id}`}
            className="flex-1 min-w-0"
          >
            <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {request.note?.title ?? 'Untitled Note'}
            </h3>
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            {isAssignedToMe && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Assigned to you
              </span>
            )}
            <ReviewStatusBadge status={request.status} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {/* Requester */}
          <span className="flex items-center gap-1">
            <Avatar className="h-4 w-4">
              <AvatarImage src={request.requester?.avatar_url ?? undefined} />
              <AvatarFallback className="text-[8px]">{requesterInitials}</AvatarFallback>
            </Avatar>
            {requesterName}
          </span>

          {/* Reviewer */}
          {reviewerName ? (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {reviewerName}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="h-3 w-3" />
              Unassigned
            </span>
          )}

          {/* Due date */}
          {request.due_date && (
            <span
              className={`flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : ''}`}
            >
              <Calendar className="h-3 w-3" />
              {isOverdue ? 'Overdue · ' : 'Due '}
              {formatDistanceToNow(new Date(request.due_date), { addSuffix: true })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {request.priority !== 'normal' && (
            <ReviewPriorityBadge priority={request.priority} />
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
