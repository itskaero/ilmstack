'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NoteEditorAdaptive } from '@/components/notes/note-editor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { createGuidelineAction } from '../actions'
import { ROUTES, GUIDELINE_CATEGORIES, GUIDELINE_MIN_EDIT_ROLES, MEDICAL_SPECIALTIES } from '@/config/app'

interface Props {
  workspaceId: string
  workspaceSlug: string
}

export function NewGuidelineForm({ workspaceId, workspaceSlug }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('general')
  const [specialty, setSpecialty] = useState('')
  const [minEditRole, setMinEditRole] = useState('any_editor')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Title is required'); return }

    startTransition(async () => {
      const fd = new FormData()
      fd.set('title', title)
      fd.set('content', content)
      fd.set('category', category)
      if (specialty && specialty !== 'none') fd.set('specialty', specialty)
      fd.set('min_edit_clinical_role', minEditRole)

      const result = await createGuidelineAction(workspaceId, workspaceSlug, fd)
      if (result.error) { toast.error(result.error); return }

      toast.success('Guideline created')
      router.push(ROUTES.guidelineDetail(workspaceSlug, result.guidelineId!))
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.push(ROUTES.guidelines(workspaceSlug))}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-semibold flex-1">New Guideline</h1>
        <Button type="submit" size="sm" disabled={isPending}>
          <Save className="h-4 w-4 mr-1.5" />
          {isPending ? 'Saving…' : 'Save as Draft'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Antibiotic Escalation Protocol — Paediatrics"
              className="text-base font-medium"
              disabled={isPending}
            />
          </div>

          {/* Metadata row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={isPending}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GUIDELINE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Specialty (optional)</Label>
              <Select value={specialty} onValueChange={setSpecialty} disabled={isPending}>
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
              <Label className="text-xs">Minimum clinical role to edit</Label>
              <Select value={minEditRole} onValueChange={setMinEditRole} disabled={isPending}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GUIDELINE_MIN_EDIT_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Content editor */}
          <div className="space-y-1.5">
            <Label className="text-xs">Content</Label>
            <NoteEditorAdaptive
              value={content}
              onChange={setContent}
              placeholder="Start with an Overview, then Indications, Protocol, and References…"
              height={500}
            />
          </div>

          <div className="pb-12" />
        </div>
      </div>
    </form>
  )
}
