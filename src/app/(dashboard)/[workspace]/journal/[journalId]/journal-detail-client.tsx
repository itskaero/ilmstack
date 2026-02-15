'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Edit2,
  Trash2,
  Printer,
  Star,
  StarOff,
  Plus,
  X,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Send,
  Archive,
  Loader2,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { JournalStatusBadge } from '@/components/journal/journal-status-badge'
import {
  updateJournalAction,
  updateJournalStatusAction,
  deleteJournalAction,
  addJournalEntryAction,
  removeJournalEntryAction,
  toggleEntryFeaturedAction,
  reorderEntriesAction,
} from '@/app/(dashboard)/[workspace]/journal/actions'
import { ROUTES } from '@/config/app'
import type { JournalWithEntries, WorkspaceRow, WorkspaceRole, NoteWithRelations } from '@/types/database'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface Props {
  journal: JournalWithEntries
  workspace: WorkspaceRow
  role: WorkspaceRole
  availableNotes: NoteWithRelations[]
}

export function JournalDetailClient({ journal, workspace, role, availableNotes }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const canEdit = (role === 'admin' || role === 'editor') && journal.status !== 'archived'

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(journal.title)
  const [editNote, setEditNote] = useState(journal.editorial_note ?? '')

  // Add notes dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false)

  const monthName = MONTH_NAMES[journal.period_month - 1]

  function handleSave() {
    startTransition(async () => {
      await updateJournalAction(journal.id, workspace.id, workspace.slug, {
        title: editTitle.trim(),
        editorial_note: editNote.trim() || undefined,
      })
      setIsEditing(false)
      router.refresh()
    })
  }

  function handlePublish() {
    startTransition(async () => {
      await updateJournalStatusAction(journal.id, workspace.id, workspace.slug, 'published')
      router.refresh()
    })
  }

  function handleArchive() {
    startTransition(async () => {
      await updateJournalStatusAction(journal.id, workspace.id, workspace.slug, 'archived')
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteJournalAction(journal.id, workspace.id, workspace.slug)
      router.push(ROUTES.journal(workspace.slug))
    })
  }

  function handleAddNote(noteId: string) {
    startTransition(async () => {
      await addJournalEntryAction(journal.id, workspace.id, workspace.slug, noteId)
      setAddDialogOpen(false)
      router.refresh()
    })
  }

  function handleRemoveEntry(entryId: string) {
    startTransition(async () => {
      await removeJournalEntryAction(entryId, workspace.id, workspace.slug, journal.id)
      router.refresh()
    })
  }

  function handleToggleFeatured(entryId: string, featured: boolean) {
    startTransition(async () => {
      await toggleEntryFeaturedAction(entryId, workspace.id, workspace.slug, journal.id, featured)
      router.refresh()
    })
  }

  function handleMoveEntry(index: number, direction: 'up' | 'down') {
    const entries = [...journal.entries]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= entries.length) return

    const newEntries = entries.map((e, i) => ({
      id: e.id,
      sort_order: i === index ? swapIndex : i === swapIndex ? index : i,
    }))

    startTransition(async () => {
      await reorderEntriesAction(workspace.id, workspace.slug, journal.id, newEntries)
      router.refresh()
    })
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href={ROUTES.journal(workspace.slug)}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-lg font-semibold h-8"
                />
              ) : (
                <h1 className="text-lg font-semibold truncate">{journal.title}</h1>
              )}
              <JournalStatusBadge status={journal.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {monthName} {journal.period_year} · {journal.entries.length} article{journal.entries.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Print / Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/${workspace.slug}/journal/${journal.id}/print`, '_blank')}
          >
            <Printer className="h-4 w-4 mr-1.5" />
            Print / PDF
          </Button>

          {canEdit && !isEditing && (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-1.5" />
                Edit
              </Button>
              {journal.status === 'draft' && (
                <Button size="sm" onClick={handlePublish} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                  Publish
                </Button>
              )}
              {journal.status === 'published' && (
                <Button variant="outline" size="sm" onClick={handleArchive} disabled={isPending}>
                  <Archive className="h-4 w-4 mr-1.5" />
                  Archive
                </Button>
              )}
            </>
          )}

          {isEditing && (
            <>
              <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setEditTitle(journal.title); setEditNote(journal.editorial_note ?? '') }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Editorial Note */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Editorial Note</h3>
            {isEditing ? (
              <Textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={4}
                placeholder="Write an editorial introduction..."
              />
            ) : journal.editorial_note ? (
              <p className="text-sm leading-relaxed text-foreground/90">{journal.editorial_note}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No editorial note yet.</p>
            )}
          </div>

          <Separator />

          {/* Entries */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Articles ({journal.entries.length})
              </h3>
              {canEdit && (
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add Notes
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Add Notes to Journal</DialogTitle>
                      <DialogDescription>
                        Published notes flagged for journal from {monthName} {journal.period_year}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-80 overflow-y-auto space-y-2 pt-2">
                      {availableNotes.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No eligible notes available. Notes must be published and flagged &quot;Recommend for journal&quot;.
                        </p>
                      ) : (
                        availableNotes.map((note: any) => (
                          <div
                            key={note.id}
                            className="flex items-center justify-between p-3 rounded-md border hover:bg-accent/50 transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{note.title}</p>
                              <p className="text-xs text-muted-foreground">
                                by {note.author?.full_name ?? 'Unknown'}
                                {note.topic && ` · ${note.topic.name}`}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAddNote(note.id)}
                              disabled={isPending}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {journal.entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">No articles in this journal yet.</p>
                {canEdit && availableNotes.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Notes
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {journal.entries.map((entry, index) => (
                  <Card key={entry.id} className={entry.featured ? 'border-primary/50 bg-primary/5' : ''}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start gap-3">
                        {/* Ordering controls */}
                        {canEdit && (
                          <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
                            <button
                              className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                              onClick={() => handleMoveEntry(index, 'up')}
                              disabled={index === 0 || isPending}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                              onClick={() => handleMoveEntry(index, 'down')}
                              disabled={index === journal.entries.length - 1 || isPending}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Link
                                href={ROUTES.noteDetail(workspace.slug, entry.note_id)}
                                className="text-sm font-medium hover:text-primary transition-colors line-clamp-1"
                              >
                                {entry.note?.title ?? 'Untitled Note'}
                              </Link>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {entry.note?.author?.full_name ?? 'Unknown author'}
                                {entry.note?.topic && ` · ${entry.note.topic.name}`}
                              </p>
                            </div>
                            {entry.featured && (
                              <Badge variant="outline" className="text-xs shrink-0">Featured</Badge>
                            )}
                          </div>

                          {/* Tags */}
                          {entry.note?.tags && entry.note.tags.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {entry.note.tags.map((tag: any) => (
                                <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {tag.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {canEdit && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => handleToggleFeatured(entry.id, !entry.featured)}
                              disabled={isPending}
                              title={entry.featured ? 'Remove featured' : 'Mark as featured'}
                            >
                              {entry.featured ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => handleRemoveEntry(entry.id)}
                              disabled={isPending}
                              title="Remove from journal"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Generated by {journal.generator?.full_name ?? 'Unknown'} on {new Date(journal.created_at).toLocaleDateString()}</p>
            {journal.published_at && <p>Published on {new Date(journal.published_at).toLocaleDateString()}</p>}
          </div>

          {/* Delete action */}
          {role === 'admin' && (
            <div className="pt-4">
              <Separator className="mb-4" />
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-destructive">Delete this journal permanently?</p>
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
                    {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    Yes, delete
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete Journal
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
