'use client'

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import {
  CalendarDays, Building2, LogOut, FlaskConical, ScanLine,
  Stethoscope, Activity, Scissors, ArrowLeftRight, FileText,
  Plus, Trash2, Loader2, type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { addFollowUpAction, deleteFollowUpAction } from '@/app/(dashboard)/[workspace]/cases/actions'
import type { CaseFollowUp, CaseFollowUpType } from '@/types/database'

// ── Entry type metadata ────────────────────────────────────────

type EntryMeta = {
  label: string
  icon: LucideIcon
  color: string
  bg: string
  dot: string
}

const ENTRY_META: Record<CaseFollowUpType, EntryMeta> = {
  follow_up:        { label: 'Follow-up Visit',   icon: CalendarDays,    color: 'text-blue-500',    bg: 'bg-blue-500/10',    dot: 'bg-blue-500'    },
  admission:        { label: 'Re-admission',       icon: Building2,       color: 'text-rose-500',    bg: 'bg-rose-500/10',    dot: 'bg-rose-500'    },
  discharge:        { label: 'Discharge',          icon: LogOut,          color: 'text-emerald-500', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  labs:             { label: 'Labs / Investigations', icon: FlaskConical, color: 'text-amber-500',   bg: 'bg-amber-500/10',   dot: 'bg-amber-500'   },
  imaging:          { label: 'Imaging',            icon: ScanLine,        color: 'text-cyan-500',    bg: 'bg-cyan-500/10',    dot: 'bg-cyan-500'    },
  diagnosis_change: { label: 'Diagnosis Change',   icon: Stethoscope,     color: 'text-violet-500',  bg: 'bg-violet-500/10',  dot: 'bg-violet-500'  },
  treatment_change: { label: 'Treatment Change',   icon: Activity,        color: 'text-orange-500',  bg: 'bg-orange-500/10',  dot: 'bg-orange-500'  },
  procedure:        { label: 'Procedure',          icon: Scissors,        color: 'text-indigo-500',  bg: 'bg-indigo-500/10',  dot: 'bg-indigo-500'  },
  referral:         { label: 'Referral',           icon: ArrowLeftRight,  color: 'text-teal-500',    bg: 'bg-teal-500/10',    dot: 'bg-teal-500'    },
  note:             { label: 'General Note',       icon: FileText,        color: 'text-muted-foreground', bg: 'bg-muted', dot: 'bg-muted-foreground' },
}

const ENTRY_TYPES = Object.entries(ENTRY_META) as [CaseFollowUpType, EntryMeta][]

// ── Add entry dialog ───────────────────────────────────────────

function AddEntryDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (entry: CaseFollowUp) => void
}) {
  const [entryType, setEntryType] = useState<CaseFollowUpType>('follow_up')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [occurredAt, setOccurredAt] = useState(
    () => new Date().toISOString().slice(0, 10)
  )
  const [isPending, startTransition] = useTransition()

  function reset() {
    setEntryType('follow_up')
    setTitle('')
    setContent('')
    setOccurredAt(new Date().toISOString().slice(0, 10))
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { toast.error('Title is required'); return }

    startTransition(async () => {
      // Actions are bound externally; this component receives caseId via
      // the parent calling addFollowUpAction directly in onAdd.
      // We return the form data upward so the parent can call the action.
      onAdd({ entryType, title: title.trim(), content: content.trim() || null, occurredAt } as any)
      handleClose()
    })
  }

  const meta = ENTRY_META[entryType]
  const Icon = meta.icon

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.bg}`}>
              <Icon className={`h-4 w-4 ${meta.color}`} />
            </div>
            Add Timeline Entry
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Entry Type</Label>
            <Select value={entryType} onValueChange={(v) => setEntryType(v as CaseFollowUpType)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTRY_TYPES.map(([type, m]) => {
                  const I = m.icon
                  return (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        <I className={`h-3.5 w-3.5 ${m.color}`} />
                        {m.label}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="h-9 text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Summary <span className="text-destructive">*</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                entryType === 'diagnosis_change' ? 'e.g. Revised to septic arthritis' :
                entryType === 'labs'             ? 'e.g. CBC, CRP — results awaited' :
                entryType === 'admission'        ? 'e.g. Re-admitted for fever' :
                entryType === 'follow_up'        ? 'e.g. OPD review — improving' :
                'Brief summary…'
              }
              className="h-9 text-sm"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Details <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Additional clinical details, lab values, dosing changes…"
              rows={3}
              maxLength={2000}
              className="text-sm resize-y"
            />
            <p className="text-[11px] text-muted-foreground text-right">{content.length}/2000</p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending || !title.trim()}>
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Add Entry
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ─────────────────────────────────────────────

interface CaseFollowUpTimelineProps {
  initialEntries: CaseFollowUp[]
  caseId: string
  workspaceId: string
  workspaceSlug: string
  currentUserId: string
  canEdit: boolean
}

export function CaseFollowUpTimeline({
  initialEntries,
  caseId,
  workspaceId,
  workspaceSlug,
  currentUserId,
  canEdit,
}: CaseFollowUpTimelineProps) {
  const [entries, setEntries] = useState<CaseFollowUp[]>(initialEntries)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAdd(raw: any) {
    const result = await addFollowUpAction(caseId, workspaceId, workspaceSlug, {
      entry_type: raw.entryType,
      title: raw.title,
      content: raw.content,
      occurred_at: new Date(raw.occurredAt).toISOString(),
    })
    if (result.error) { toast.error(result.error); return }
    setEntries((prev) =>
      [...prev, result.entry!].sort(
        (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
      )
    )
    toast.success('Entry added')
  }

  async function handleDelete(entryId: string) {
    setDeletingId(entryId)
    const result = await deleteFollowUpAction(entryId, caseId, workspaceSlug)
    setDeletingId(null)
    if (result.error) { toast.error(result.error); return }
    setEntries((prev) => prev.filter((e) => e.id !== entryId))
    toast.success('Entry removed')
  }

  if (entries.length === 0 && !canEdit) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No follow-up entries recorded yet.
      </p>
    )
  }

  return (
    <div className="space-y-0">
      {/* Add button */}
      {canEdit && (
        <div className="mb-6">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialogOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Timeline Entry
          </Button>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <CalendarDays className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No follow-up entries yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add follow-up visits, re-admissions, lab results, or diagnosis changes.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[22px] top-4 bottom-4 w-px bg-border" />

          <div className="space-y-0">
            {entries.map((entry, i) => {
              const meta = ENTRY_META[entry.entry_type]
              const Icon = meta.icon
              const authorName = entry.author?.full_name ?? entry.author?.email ?? 'Unknown'
              const authorInitials = authorName
                .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
              const isDeleting = deletingId === entry.id
              const canDelete = canEdit || entry.author_id === currentUserId

              return (
                <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* Icon dot */}
                  <div className="relative z-10 shrink-0">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 border-background ${meta.bg}`}>
                      <Icon className={`h-4.5 w-4.5 ${meta.color}`} style={{ height: '1.125rem', width: '1.125rem' }} />
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex-1 min-w-0 rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                          <span className={`text-[11px] font-medium ${meta.color}`}>{meta.label}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {format(parseISO(entry.occurred_at), 'dd MMM yyyy')}
                          </span>
                        </div>
                        <p className="text-sm font-semibold leading-snug">{entry.title}</p>
                      </div>

                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0 -mt-0.5"
                          onClick={() => handleDelete(entry.id)}
                          disabled={isDeleting}
                          aria-label="Delete entry"
                        >
                          {isDeleting
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>

                    {entry.content && (
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mt-2">
                        {entry.content}
                      </p>
                    )}

                    {/* Author */}
                    <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-border/60">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={entry.author?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[8px]">{authorInitials}</AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] text-muted-foreground">{authorName}</span>
                      <span className="text-[11px] text-muted-foreground ml-auto">
                        Added {format(parseISO(entry.created_at), 'dd MMM')}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <AddEntryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  )
}
