'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CheckCircle, XCircle, AlertTriangle, MessageSquare, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  submitVerdictAction,
  addReviewCommentAction,
  reopenReviewAction,
} from '@/app/(dashboard)/[workspace]/review/actions'
import type { ReviewStatus, WorkspaceRole } from '@/types/database'

interface ReviewActionPanelProps {
  requestId: string
  workspaceId: string
  workspaceSlug: string
  noteId: string
  reviewStatus: ReviewStatus
  currentUserId: string
  reviewerId: string | null
  role: WorkspaceRole
}

type VerdictType = 'approved' | 'rejected' | 'changes_requested'

const VERDICT_CONFIG: Record<
  VerdictType,
  { label: string; icon: React.ReactNode; variant: 'default' | 'destructive' | 'outline'; description: string }
> = {
  approved: {
    label: 'Approve',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    variant: 'default',
    description: 'Mark this note as approved and update its status to "Approved".',
  },
  changes_requested: {
    label: 'Request Changes',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    variant: 'outline',
    description: 'Return the note to draft and ask the author to revise it.',
  },
  rejected: {
    label: 'Reject',
    icon: <XCircle className="h-3.5 w-3.5" />,
    variant: 'destructive',
    description: 'Reject this note and return it to draft.',
  },
}

export function ReviewActionPanel({
  requestId,
  workspaceId,
  workspaceSlug,
  noteId,
  reviewStatus,
  currentUserId,
  reviewerId,
  role,
}: ReviewActionPanelProps) {
  const [selectedVerdict, setSelectedVerdict] = useState<VerdictType | null>(null)
  const [verdictNote, setVerdictNote] = useState('')
  const [commentText, setCommentText] = useState('')
  const [isPending, startTransition] = useTransition()

  const isReviewer = reviewerId === currentUserId
  const canAct =
    isReviewer || role === 'admin' || role === 'editor'
  const isActive = reviewStatus === 'pending' || reviewStatus === 'in_review'
  const isClosed =
    reviewStatus === 'approved' ||
    reviewStatus === 'rejected' ||
    reviewStatus === 'changes_requested'

  const handleVerdict = () => {
    if (!selectedVerdict) return
    startTransition(async () => {
      const fd = new FormData()
      if (verdictNote.trim()) fd.set('note', verdictNote.trim())

      const result = await submitVerdictAction(
        requestId,
        workspaceId,
        workspaceSlug,
        noteId,
        selectedVerdict,
        fd
      )
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Review ${selectedVerdict.replace('_', ' ')}`)
      setSelectedVerdict(null)
      setVerdictNote('')
    })
  }

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('note', commentText.trim())
      const result = await addReviewCommentAction(
        requestId,
        workspaceId,
        workspaceSlug,
        fd
      )
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Comment added')
      setCommentText('')
    })
  }

  const handleReopen = () => {
    if (role !== 'admin' && role !== 'editor') return
    startTransition(async () => {
      const result = await reopenReviewAction(
        requestId,
        workspaceId,
        workspaceSlug,
        noteId
      )
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Review reopened')
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Verdict actions */}
      {canAct && isActive && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Review Decision</p>
          <div className="flex flex-col gap-2">
            {(Object.entries(VERDICT_CONFIG) as [VerdictType, typeof VERDICT_CONFIG[VerdictType]][]).map(
              ([verdict, config]) => (
                <Button
                  key={verdict}
                  variant={config.variant}
                  size="sm"
                  className="justify-start gap-2 h-8 text-xs"
                  onClick={() => setSelectedVerdict(verdict)}
                  disabled={isPending}
                >
                  {config.icon}
                  {config.label}
                </Button>
              )
            )}
          </div>
        </div>
      )}

      {/* Reopen closed review */}
      {isClosed && (role === 'admin' || role === 'editor') && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleReopen}
          disabled={isPending}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reopen Review
        </Button>
      )}

      {/* Comment form */}
      <form onSubmit={handleComment} className="space-y-2">
        <Label className="text-xs font-medium">Add Comment</Label>
        <Textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Leave a review comment…"
          className="min-h-[72px] text-sm resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              handleComment(e as unknown as React.FormEvent)
            }
          }}
        />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs w-full"
          disabled={isPending || !commentText.trim()}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Comment
        </Button>
      </form>

      {/* Verdict confirmation dialog */}
      <Dialog
        open={!!selectedVerdict}
        onOpenChange={(o) => { if (!o) setSelectedVerdict(null) }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {selectedVerdict && VERDICT_CONFIG[selectedVerdict].label}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {selectedVerdict && (
              <p className="text-sm text-muted-foreground">
                {VERDICT_CONFIG[selectedVerdict].description}
              </p>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Note (optional)</Label>
              <Textarea
                value={verdictNote}
                onChange={(e) => setVerdictNote(e.target.value)}
                placeholder="Add a note for the author…"
                className="min-h-[80px] text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedVerdict(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={selectedVerdict ? VERDICT_CONFIG[selectedVerdict].variant : 'default'}
              onClick={handleVerdict}
              disabled={isPending}
            >
              {isPending ? 'Submitting…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
