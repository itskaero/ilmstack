import { Badge } from '@/components/ui/badge'
import type { CaseStatus } from '@/types/database'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<CaseStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground border-border',
  },
  published: {
    label: 'Published',
    className:
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  },
  archived: {
    label: 'Archived',
    className: 'bg-muted text-muted-foreground/60 border-border',
  },
}

export function CaseStatusBadge({
  status,
  className,
}: {
  status: CaseStatus
  className?: string
}) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', config.className, className)}>
      {config.label}
    </Badge>
  )
}
