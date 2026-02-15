import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { User, Stethoscope, Tag, Folder } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CaseStatusBadge } from './case-status-badge'
import type { CaseWithRelations } from '@/types/database'
import { ROUTES } from '@/config/app'

const GENDER_LABELS = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  not_disclosed: 'Not disclosed',
}

interface CaseCardProps {
  caseData: CaseWithRelations
  workspaceSlug: string
}

export function CaseCard({ caseData, workspaceSlug }: CaseCardProps) {
  const authorName = caseData.author?.full_name ?? caseData.author?.email ?? 'Unknown'
  const initials = authorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const preview = caseData.presentation ?? caseData.history ?? caseData.outcome ?? ''
  const previewText = preview
    .replace(/[#*`_~\[\]]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 130)

  return (
    <Card className="group hover:shadow-md transition-all duration-200 hover:border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={ROUTES.caseDetail(workspaceSlug, caseData.id)}
            className="flex-1 min-w-0"
          >
            <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {caseData.title}
            </h3>
          </Link>
          <CaseStatusBadge status={caseData.status} className="shrink-0" />
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-2">
        {/* Patient / Specialty row */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {caseData.specialty && (
            <span className="flex items-center gap-1">
              <Stethoscope className="h-3 w-3" />
              {caseData.specialty}
            </span>
          )}
          {(caseData.patient_age_range || caseData.patient_gender) && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {[
                caseData.patient_age_range ? `${caseData.patient_age_range} yrs` : null,
                caseData.patient_gender
                  ? GENDER_LABELS[caseData.patient_gender]
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
          {caseData.diagnosis && (
            <span className="font-medium text-foreground/80 truncate">
              {caseData.diagnosis}
            </span>
          )}
        </div>

        {previewText && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {previewText}
            {preview.length > 130 && '…'}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {caseData.topic && (
            <Badge variant="secondary" className="text-xs gap-1 h-5 px-1.5">
              <Folder className="h-2.5 w-2.5" />
              {caseData.topic.name}
            </Badge>
          )}
          {caseData.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="text-xs h-5 px-1.5"
              style={{ borderColor: tag.color + '40', color: tag.color }}
            >
              {tag.name}
            </Badge>
          ))}
          {caseData.tags.length > 3 && (
            <Badge variant="outline" className="text-xs h-5 px-1.5">
              +{caseData.tags.length - 3}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5">
            <AvatarImage src={caseData.author?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{authorName}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(caseData.updated_at), { addSuffix: true })}
        </span>
      </CardFooter>
    </Card>
  )
}
