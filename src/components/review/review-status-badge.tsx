import { Badge } from '@/components/ui/badge'
import type { ReviewStatus, ReviewPriority } from '@/types/database'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<ReviewStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className:
      'bg-muted text-muted-foreground border-border',
  },
  in_review: {
    label: 'In Review',
    className:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  },
  approved: {
    label: 'Approved',
    className:
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  },
  changes_requested: {
    label: 'Changes Requested',
    className:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  },
  rejected: {
    label: 'Rejected',
    className:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  },
}

const PRIORITY_CONFIG: Record<ReviewPriority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-muted text-muted-foreground border-border' },
  normal: { label: 'Normal', className: 'bg-muted text-muted-foreground border-border' },
  high: {
    label: 'High',
    className:
      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  },
  urgent: {
    label: 'Urgent',
    className:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  },
}

interface ReviewStatusBadgeProps {
  status: ReviewStatus
  className?: string
}

export function ReviewStatusBadge({ status, className }: ReviewStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}

interface ReviewPriorityBadgeProps {
  priority: ReviewPriority
  className?: string
}

export function ReviewPriorityBadge({ priority, className }: ReviewPriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority]
  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
