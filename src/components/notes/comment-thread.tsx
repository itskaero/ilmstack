'use client'

import { useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Reply, CheckCheck, Trash2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { addCommentAction, deleteCommentAction, resolveCommentAction } from '@/app/(dashboard)/[workspace]/notes/actions'
import type { NoteComment, Profile } from '@/types/database'

interface CommentThreadProps {
  comments: NoteComment[]
  noteId: string
  workspaceId: string
  workspaceSlug: string
  currentUser: Profile
}

export function CommentThread({
  comments: initialComments,
  noteId,
  workspaceId,
  workspaceSlug,
  currentUser,
}: CommentThreadProps) {
  const [comments, setComments] = useState(initialComments)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<NoteComment | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    startTransition(async () => {
      const fd = new FormData()
      fd.set('content', newComment.trim())
      fd.set('comment_type', 'general')
      if (replyTo) fd.set('parent_id', replyTo.id)

      const result = await addCommentAction(noteId, workspaceId, workspaceSlug, fd)
      if (result.error) {
        toast.error(result.error)
        return
      }

      // Optimistic update
      const optimistic: NoteComment = {
        id: crypto.randomUUID(),
        note_id: noteId,
        workspace_id: workspaceId,
        author_id: currentUser.id,
        author: currentUser,
        parent_id: replyTo?.id ?? null,
        comment_type: 'general',
        content: newComment.trim(),
        resolved: false,
        resolved_by: null,
        resolved_at: null,
        anchor_ref: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (replyTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTo.id
              ? { ...c, replies: [...(c.replies ?? []), optimistic] }
              : c
          )
        )
      } else {
        setComments((prev) => [...prev, { ...optimistic, replies: [] }])
      }

      setNewComment('')
      setReplyTo(null)
    })
  }

  const handleResolve = (commentId: string) => {
    startTransition(async () => {
      const result = await resolveCommentAction(commentId, workspaceId, noteId, workspaceSlug)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, resolved: true } : c
        )
      )
    })
  }

  const handleDelete = (commentId: string, parentId?: string) => {
    startTransition(async () => {
      const result = await deleteCommentAction(commentId, workspaceId, noteId, workspaceSlug)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: (c.replies ?? []).filter((r) => r.id !== commentId) }
              : c
          )
        )
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId))
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No comments yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start the discussion below.
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUser.id}
                onReply={() => setReplyTo(comment)}
                onResolve={() => handleResolve(comment.id)}
                onDelete={(id) => handleDelete(id, undefined)}
                onDeleteReply={(id) => handleDelete(id, comment.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Compose area */}
      <div className="border-t border-border p-3 shrink-0">
        {replyTo && (
          <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
            <Reply className="h-3 w-3" />
            <span>
              Replying to{' '}
              <span className="font-medium text-foreground">
                {replyTo.author?.full_name ?? replyTo.author?.email}
              </span>
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="ml-auto hover:text-foreground"
            >
              ×
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment…"
            className="min-h-[72px] text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent)
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Ctrl+Enter to send</span>
            <Button type="submit" size="sm" disabled={isPending || !newComment.trim()}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {replyTo ? 'Reply' : 'Comment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface CommentItemProps {
  comment: NoteComment
  currentUserId: string
  onReply: () => void
  onResolve: () => void
  onDelete: (id: string) => void
  onDeleteReply: (id: string) => void
}

function CommentItem({
  comment,
  currentUserId,
  onReply,
  onResolve,
  onDelete,
  onDeleteReply,
}: CommentItemProps) {
  const authorName =
    comment.author?.full_name ?? comment.author?.email ?? 'Unknown'
  const initials = authorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const isOwn = comment.author_id === currentUserId

  return (
    <div className={cn('rounded-lg p-3', comment.resolved ? 'opacity-60' : '')}>
      <div className="flex items-start gap-2.5">
        <Avatar className="h-6 w-6 mt-0.5 shrink-0">
          <AvatarImage src={comment.author?.avatar_url ?? undefined} />
          <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium">{authorName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {comment.resolved && (
              <Badge variant="outline" className="text-[10px] h-4 px-1 border-green-300 text-green-600">
                <CheckCheck className="h-2.5 w-2.5 mr-0.5" />
                Resolved
              </Badge>
            )}
          </div>
          <p className="text-sm mt-1 leading-relaxed whitespace-pre-wrap break-words">
            {comment.content}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <button
              onClick={onReply}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
            >
              <Reply className="h-3 w-3" />
              Reply
            </button>
            {!comment.resolved && isOwn && (
              <button
                onClick={onResolve}
                className="text-xs text-muted-foreground hover:text-green-600 flex items-center gap-0.5"
              >
                <CheckCheck className="h-3 w-3" />
                Resolve
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-0.5"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {(comment.replies ?? []).length > 0 && (
        <div className="mt-3 ml-8 space-y-3 border-l-2 border-border/50 pl-3">
          {(comment.replies ?? []).map((reply) => {
            const replyAuthor =
              reply.author?.full_name ?? reply.author?.email ?? 'Unknown'
            const replyInitials = replyAuthor
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
            return (
              <div key={reply.id} className="flex items-start gap-2">
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarImage src={reply.author?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[8px]">{replyInitials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium">{replyAuthor}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5 leading-relaxed whitespace-pre-wrap break-words">
                    {reply.content}
                  </p>
                  {reply.author_id === currentUserId && (
                    <button
                      onClick={() => onDeleteReply(reply.id)}
                      className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-0.5 mt-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
