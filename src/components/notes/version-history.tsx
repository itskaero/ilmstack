'use client'

import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { NoteVersion } from '@/types/database'

interface VersionHistoryProps {
  versions: NoteVersion[]
  currentVersion: number
  onRestoreVersion?: (version: NoteVersion) => void
}

export function VersionHistory({
  versions,
  currentVersion,
  onRestoreVersion,
}: VersionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No version history yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Versions are created automatically when content changes.
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-1">
        {versions.map((v) => {
          const isCurrent = v.version_number === currentVersion
          const isExpanded = expandedId === v.id
          const authorName =
            v.changed_by_profile?.full_name ??
            v.changed_by_profile?.email ??
            'Unknown'
          const initials = authorName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)

          return (
            <div
              key={v.id}
              className={cn(
                'rounded-lg border border-border p-3 transition-colors',
                isCurrent && 'border-primary/40 bg-primary/5'
              )}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : v.id)}
                  className="mt-0.5 text-muted-foreground hover:text-foreground"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium">v{v.version_number}</span>
                    {isCurrent && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary/40 text-primary">
                        Current
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {v.title}
                  </p>

                  {v.change_summary && (
                    <p className="text-xs text-muted-foreground/80 mt-0.5 italic line-clamp-1">
                      &ldquo;{v.change_summary}&rdquo;
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={v.changed_by_profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {authorName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expanded preview */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Saved:</span>{' '}
                    {format(new Date(v.created_at), 'PPpp')}
                  </div>
                  <div className="rounded bg-muted/50 p-2 max-h-32 overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words text-muted-foreground line-clamp-6">
                      {v.content.slice(0, 500)}
                      {v.content.length > 500 && '…'}
                    </pre>
                  </div>
                  {onRestoreVersion && !isCurrent && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => onRestoreVersion(v)}
                    >
                      Restore this version
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
