'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { assignReviewerAction } from '@/app/(dashboard)/[workspace]/review/actions'
import type { WorkspaceMember, ReviewPriority } from '@/types/database'

interface ReviewerSelectProps {
  requestId: string
  workspaceId: string
  workspaceSlug: string
  noteId: string
  members: WorkspaceMember[]
  currentReviewerId?: string | null
}

export function ReviewerSelect({
  requestId,
  workspaceId,
  workspaceSlug,
  noteId,
  members,
  currentReviewerId,
}: ReviewerSelectProps) {
  const [open, setOpen] = useState(false)
  const [reviewerId, setReviewerId] = useState(currentReviewerId ?? '')
  const [priority, setPriority] = useState<ReviewPriority>('normal')
  const [dueDate, setDueDate] = useState('')
  const [isPending, startTransition] = useTransition()

  // Only show editors and admins as potential reviewers
  const eligibleMembers = members.filter((m) =>
    m.role === 'admin' || m.role === 'editor'
  )

  const handleAssign = () => {
    if (!reviewerId) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set('reviewer_id', reviewerId)
      fd.set('priority', priority)
      if (dueDate) fd.set('due_date', dueDate)

      const result = await assignReviewerAction(
        requestId,
        workspaceId,
        workspaceSlug,
        noteId,
        fd
      )
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Reviewer assigned')
      setOpen(false)
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={() => setOpen(true)}
      >
        <UserCheck className="h-3.5 w-3.5" />
        {currentReviewerId ? 'Reassign' : 'Assign Reviewer'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Reviewer</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Reviewer</Label>
              <Select value={reviewerId} onValueChange={setReviewerId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select reviewer…" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleMembers.map((m) => {
                    const name = m.profile?.full_name ?? m.profile?.email ?? 'Unknown'
                    const initials = name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                    return (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        <span className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                          </Avatar>
                          <span>{name}</span>
                          <span className="text-muted-foreground text-xs capitalize">
                            ({m.role})
                          </span>
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as ReviewPriority)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Due Date (optional)</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 text-sm"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAssign}
              disabled={!reviewerId || isPending}
            >
              {isPending ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
