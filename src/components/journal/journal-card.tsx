import Link from 'next/link'
import { Calendar, FileText, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JournalStatusBadge } from './journal-status-badge'
import { ROUTES } from '@/config/app'
import type { JournalRow } from '@/types/database'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface Props {
  journal: JournalRow
  workspaceSlug: string
  entryCount?: number
}

export function JournalCard({ journal, workspaceSlug, entryCount }: Props) {
  const monthName = MONTH_NAMES[journal.period_month - 1]

  return (
    <Link href={ROUTES.journalDetail(workspaceSlug, journal.id)}>
      <Card className="hover:border-primary/50 transition-colors h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {monthName} {journal.period_year}
            </div>
            <JournalStatusBadge status={journal.status} />
          </div>
          <CardTitle className="text-base line-clamp-2 mt-1">{journal.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {journal.editorial_note && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {journal.editorial_note}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {entryCount != null && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {entryCount} article{entryCount !== 1 ? 's' : ''}
              </span>
            )}
            {journal.published_at && (
              <span>
                Published {new Date(journal.published_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
