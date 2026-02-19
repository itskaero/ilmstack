'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit2,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
  LockOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateGuidelineAction, updateGuidelineStatusAction } from '../actions'
import { ROUTES, GUIDELINE_CATEGORIES, GUIDELINE_MIN_EDIT_ROLES, MEDICAL_SPECIALTIES } from '@/config/app'
import type { GuidelineWithAuthor, GuidelineVersionWithAuthor, GuidelineStatus } from '@/types/database'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full rounded-md" />,
})

const MarkdownPreview = dynamic(() => import('@uiw/react-markdown-preview'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-md" />,
})

interface Props {
  guideline: GuidelineWithAuthor
  versions: GuidelineVersionWithAuthor[]
  workspaceSlug: string
  workspaceId: string
  canEdit: boolean
  canChangeStatus: boolean
}

const STATUS_CONFIG: Record<GuidelineStatus, { label: string; next: GuidelineStatus | null; nextLabel: string; color: string }> = {
  draft: { label: 'Draft', next: 'active', nextLabel: 'Publish', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  active: { label: 'Active', next: 'archived', nextLabel: 'Archive', color: 'bg-green-100 text-green-800 border-green-200' },
  archived: { label: 'Archived', next: 'draft', nextLabel: 'Restore to Draft', color: 'bg-gray-100 text-gray-700 border-gray-200' },
}

function getInitials(name: string | null, email?: string): string {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  return (email ?? '?')[0].toUpperCase()
}

export function GuidelineDetailClient({
  guideline: initialGuideline,
  versions: initialVersions,
  workspaceSlug,
  workspaceId,
  canEdit,
  canChangeStatus,
}: Props) {
  const [guideline, setGuideline] = useState(initialGuideline)
  const [versions, setVersions] = useState(initialVersions)
  const [isEditing, setIsEditing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Edit form state
  const [editTitle, setEditTitle] = useState(guideline.title)
  const [editContent, setEditContent] = useState(guideline.content)
  const [editCategory, setEditCategory] = useState(guideline.category)
  const [editSpecialty, setEditSpecialty] = useState(guideline.specialty ?? 'none')
  const [editMinRole, setEditMinRole] = useState<string>(guideline.min_edit_clinical_role)
  const [changeNote, setChangeNote] = useState('')

  const statusConfig = STATUS_CONFIG[guideline.status]
  const catLabel = GUIDELINE_CATEGORIES.find((c) => c.value === guideline.category)?.label ?? guideline.category
  const isRestricted = guideline.min_edit_clinical_role !== 'any_editor'

  function startEdit() {
    setEditTitle(guideline.title)
    setEditContent(guideline.content)
    setEditCategory(guideline.category)
    setEditSpecialty(guideline.specialty ?? 'none')
    setEditMinRole(guideline.min_edit_clinical_role)
    setChangeNote('')
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
  }

  function handleSave() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('title', editTitle)
      fd.set('content', editContent)
      fd.set('category', editCategory)
      if (editSpecialty && editSpecialty !== 'none') fd.set('specialty', editSpecialty)
      fd.set('min_edit_clinical_role', editMinRole)
      if (changeNote) fd.set('change_note', changeNote)

      const result = await updateGuidelineAction(guideline.id, workspaceId, workspaceSlug, fd)
      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Guideline updated')
      // Optimistically update local state
      setGuideline((prev) => ({
        ...prev,
        title: editTitle,
        content: editContent,
        category: editCategory,
        specialty: (editSpecialty && editSpecialty !== 'none') ? editSpecialty : null,
        min_edit_clinical_role: editMinRole as typeof prev.min_edit_clinical_role,
        version: prev.version + 1,
        updated_at: new Date().toISOString(),
      }))
      setIsEditing(false)
    })
  }

  function handleStatusChange(newStatus: GuidelineStatus) {
    startTransition(async () => {
      const result = await updateGuidelineStatusAction(guideline.id, workspaceId, workspaceSlug, newStatus)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setGuideline((prev) => ({ ...prev, status: newStatus }))
      toast.success(`Guideline ${newStatus === 'active' ? 'published' : newStatus}`)
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
            <Link href={ROUTES.guidelines(workspaceSlug)}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusConfig.color}`}
              >
                {statusConfig.label}
              </span>
              <Badge variant="outline" className="text-xs font-normal">{catLabel}</Badge>
              {guideline.specialty && (
                <Badge variant="outline" className="text-xs font-normal">{guideline.specialty}</Badge>
              )}
              <span className="text-xs text-muted-foreground">v{guideline.version}</span>
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                {isRestricted ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                {GUIDELINE_MIN_EDIT_ROLES.find((r) => r.value === guideline.min_edit_clinical_role)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canChangeStatus && statusConfig.next && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(statusConfig.next!)}
                disabled={isPending}
              >
                {statusConfig.nextLabel}
              </Button>
            )}
            {canEdit && !isEditing && (
              <Button size="sm" onClick={startEdit} disabled={isPending}>
                <Edit2 className="h-4 w-4 mr-1.5" />
                Edit
              </Button>
            )}
            {isEditing && (
              <>
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isPending}>
                  <X className="h-4 w-4 mr-1.5" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isPending}>
                  <Save className="h-4 w-4 mr-1.5" />
                  {isPending ? 'Saving…' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {isEditing ? (
            /* ── Edit mode ── */
            <div className="space-y-6">
              <div className="space-y-1.5">
                <Label className="text-xs">Title</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-base font-medium"
                  disabled={isPending}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Select value={editCategory} onValueChange={setEditCategory} disabled={isPending}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GUIDELINE_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Specialty</Label>
                  <Select value={editSpecialty} onValueChange={setEditSpecialty} disabled={isPending}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="All specialties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All specialties</SelectItem>
                      {MEDICAL_SPECIALTIES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Min. edit clinical role</Label>
                  <Select value={editMinRole} onValueChange={setEditMinRole} disabled={isPending}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GUIDELINE_MIN_EDIT_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Content</Label>
                <div data-color-mode="light" className="dark:hidden">
                  <MDEditor
                    value={editContent}
                    onChange={(val) => setEditContent(val ?? '')}
                    height={480}
                    preview="live"
                    visibleDragbar={false}
                  />
                </div>
                <div data-color-mode="dark" className="hidden dark:block">
                  <MDEditor
                    value={editContent}
                    onChange={(val) => setEditContent(val ?? '')}
                    height={480}
                    preview="live"
                    visibleDragbar={false}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Change note <span className="text-muted-foreground">(optional — describe what was changed)</span></Label>
                <Textarea
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  placeholder="e.g. Updated antibiotic doses per 2026 WHO guidelines"
                  className="resize-none text-sm"
                  rows={2}
                  disabled={isPending}
                />
              </div>
            </div>
          ) : (
            /* ── View mode ── */
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{guideline.title}</h1>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={guideline.updater?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[9px]">
                      {getInitials(guideline.updater?.full_name ?? null)}
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    Last updated by <strong>{guideline.updater?.full_name ?? 'Unknown'}</strong>{' '}
                    on {new Date(guideline.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>

              <div
                data-color-mode="light"
                className="prose prose-sm max-w-none dark:hidden [&_.wmde-markdown]:bg-transparent"
              >
                <MarkdownPreview source={guideline.content} />
              </div>
              <div
                data-color-mode="dark"
                className="prose prose-sm max-w-none hidden dark:block [&_.wmde-markdown]:bg-transparent"
              >
                <MarkdownPreview source={guideline.content} />
              </div>
            </div>
          )}

          {/* Version history */}
          {!isEditing && (
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Version history ({versions.length})
                </span>
                {showHistory ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {showHistory && (
                <div className="border-t border-border divide-y divide-border">
                  {versions.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-4 py-3">No version history yet.</p>
                  ) : (
                    versions.map((v) => (
                      <div key={v.id} className="px-4 py-3 flex items-start gap-3">
                        <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                          <AvatarImage src={v.changed_by_profile?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(v.changed_by_profile?.full_name ?? null)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold">v{v.version_number}</span>
                            <span className="text-xs text-muted-foreground">
                              {v.changed_by_profile?.full_name ?? 'Unknown'} ·{' '}
                              {new Date(v.created_at).toLocaleDateString(undefined, {
                                year: 'numeric', month: 'short', day: 'numeric',
                              })}
                            </span>
                          </div>
                          {v.change_note && (
                            <p className="text-xs text-muted-foreground mt-0.5">{v.change_note}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div className="pb-12" />
        </div>
      </div>
    </div>
  )
}
