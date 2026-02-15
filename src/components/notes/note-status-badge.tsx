import { Badge } from '@/components/ui/badge'
import type { NoteStatus } from '@/types/database'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<NoteStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground border-border',
  },
  under_review: {
    label: 'Under Review',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  },
  approved: {
    label: 'Approved',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  },
  published: {
    label: 'Published',
    className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  },
  archived: {
    label: 'Archived',
    className: 'bg-muted text-muted-foreground/60 border-border line-through',
  },
}

interface NoteStatusBadgeProps {
  status: NoteStatus
  className?: string
}

export function NoteStatusBadge({ status, className }: NoteStatusBadgeProps) {
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
