'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { generateJournalAction } from '@/app/(dashboard)/[workspace]/journal/actions'
import { ROUTES } from '@/config/app'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface Props {
  workspaceId: string
  workspaceSlug: string
}

export function GenerateJournalDialog({ workspaceId, workspaceSlug }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [title, setTitle] = useState('')
  const [editorialNote, setEditorialNote] = useState('')

  const defaultTitle = `${MONTH_NAMES[month - 1]} ${year} Clinical Journal`

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await generateJournalAction(workspaceId, workspaceSlug, {
        title: title.trim() || defaultTitle,
        period_year: year,
        period_month: month,
        editorial_note: editorialNote.trim() || undefined,
        auto_collect: true,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      setOpen(false)
      if (result.journalId) {
        router.push(ROUTES.journalDetail(workspaceSlug, result.journalId))
      }
    })
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Sparkles className="h-4 w-4 mr-1.5" />
          Generate Journal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Monthly Journal</DialogTitle>
          <DialogDescription>
            Auto-collect published notes flagged for journal inclusion during the selected month.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Period selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Month</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Year</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              className="mt-1"
              placeholder={defaultTitle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Editorial note */}
          <div>
            <Label className="text-xs">Editorial Note (optional)</Label>
            <Textarea
              className="mt-1"
              placeholder="Write a brief editorial introduction for this issue..."
              rows={3}
              value={editorialNote}
              onChange={(e) => setEditorialNote(e.target.value)}
              disabled={isPending}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Generate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
