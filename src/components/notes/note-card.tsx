import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, BookMarked, Tag, Folder } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { NoteStatusBadge } from './note-status-badge'
import type { NoteWithRelations } from '@/types/database'
import { ROUTES } from '@/config/app'

interface NoteCardProps {
  note: NoteWithRelations
  workspaceSlug: string
}

export function NoteCard({ note, workspaceSlug }: NoteCardProps) {
  const authorName = note.author?.full_name ?? note.author?.email ?? 'Unknown'
  const initials = authorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const preview = note.content
    .replace(/[#*`_~\[\]]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 140)

  return (
    <Card className="group hover:shadow-md transition-all duration-200 hover:border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={ROUTES.noteDetail(workspaceSlug, note.id)}
            className="flex-1 min-w-0"
          >
            <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {note.title}
            </h3>
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            {note.recommend_for_journal && (
              <span title="Recommended for journal">
                <BookMarked className="h-3.5 w-3.5 text-amber-500" />
              </span>
            )}
            <NoteStatusBadge status={note.status} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {preview && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
            {preview}
            {note.content.length > 140 && '…'}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {note.topic && (
            <Badge variant="secondary" className="text-xs gap-1 h-5 px-1.5">
              <Folder className="h-2.5 w-2.5" />
              {note.topic.name}
            </Badge>
          )}
          {note.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="text-xs gap-1 h-5 px-1.5"
              style={{ borderColor: tag.color + '40', color: tag.color }}
            >
              <Tag className="h-2.5 w-2.5" />
              {tag.name}
            </Badge>
          ))}
          {note.tags.length > 3 && (
            <Badge variant="outline" className="text-xs h-5 px-1.5">
              +{note.tags.length - 3}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5">
            <AvatarImage src={note.author?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{authorName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {(note.comment_count ?? 0) > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />
              {note.comment_count}
            </span>
          )}
          <span>{formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}</span>
        </div>
      </CardFooter>
    </Card>
  )
}
