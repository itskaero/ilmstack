import { Badge } from '@/components/ui/badge'
import type { JournalStatus } from '@/types/database'

const STATUS_CONFIG: Record<JournalStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  generating: { label: 'Generating', variant: 'outline' },
  draft: { label: 'Draft', variant: 'secondary' },
  published: { label: 'Published', variant: 'default' },
  archived: { label: 'Archived', variant: 'destructive' },
}

export function JournalStatusBadge({ status }: { status: JournalStatus }) {
  const config = STATUS_CONFIG[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
