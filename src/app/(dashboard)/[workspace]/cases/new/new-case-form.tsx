'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Save, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { TagSelector } from '@/components/notes/tag-selector'
import { TopicSelector } from '@/components/notes/topic-selector'
import { ManagementTimelineEditor } from '@/components/cases/management-timeline-editor'
import { createCaseAction, createTagAction, createTopicAction } from '../actions'
import type { Topic, Tag, ManagementTimelineEntry, PatientGender } from '@/types/database'
import { ROUTES } from '@/config/app'

interface NewCaseFormProps {
  workspaceId: string
  workspaceSlug: string
  topics: Topic[]
  tags: Tag[]
}

export function NewCaseForm({
  workspaceId,
  workspaceSlug,
  topics: initialTopics,
  tags: initialTags,
}: NewCaseFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Overview
  const [title, setTitle] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [patientAgeRange, setPatientAgeRange] = useState('')
  const [patientGender, setPatientGender] = useState<PatientGender | ''>('')
  const [icdCodes, setIcdCodes] = useState<string[]>([])
  const [icdInput, setIcdInput] = useState('')
  const [topicId, setTopicId] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [topics, setTopics] = useState(initialTopics)
  const [allTags, setAllTags] = useState(initialTags)

  // Clinical sections
  const [presentation, setPresentation] = useState('')
  const [history, setHistory] = useState('')
  const [examination, setExamination] = useState('')
  const [investigations, setInvestigations] = useState('')
  const [managementTimeline, setManagementTimeline] = useState<ManagementTimelineEntry[]>([])
  const [outcome, setOutcome] = useState('')
  const [learningPoints, setLearningPoints] = useState('')

  const handleCreateTag = async (name: string) => {
    const result = await createTagAction(workspaceId, workspaceSlug, name)
    if (result.error) { toast.error(result.error); return null }
    const newTag: Tag = { id: result.tagId!, name, color: '#6366f1', workspace_id: workspaceId, created_by: '', created_at: new Date().toISOString() }
    setAllTags((prev) => [...prev, newTag])
    return newTag
  }

  const handleCreateTopic = async (name: string) => {
    const result = await createTopicAction(workspaceId, workspaceSlug, name)
    if (result.error) { toast.error(result.error); return null }
    const newTopic: Topic = { id: result.topicId!, name, slug: name.toLowerCase().replace(/\s+/g, '-'), workspace_id: workspaceId, parent_id: null, description: null, color: null, icon: null, sort_order: 0, created_by: '', created_at: new Date().toISOString() }
    setTopics((prev) => [...prev, newTopic])
    return newTopic
  }

  const addIcdCode = () => {
    const code = icdInput.trim().toUpperCase()
    if (code && !icdCodes.includes(code)) {
      setIcdCodes((prev) => [...prev, code])
      setIcdInput('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Title is required'); return }

    startTransition(async () => {
      const fd = new FormData()
      fd.set('title', title)
      if (specialty) fd.set('specialty', specialty)
      if (diagnosis) fd.set('diagnosis', diagnosis)
      if (patientAgeRange) fd.set('patient_age_range', patientAgeRange)
      if (patientGender) fd.set('patient_gender', patientGender)
      fd.set('icd_codes', JSON.stringify(icdCodes))
      if (topicId) fd.set('topic_id', topicId)
      selectedTagIds.forEach((id) => fd.append('tag_ids', id))
      if (presentation) fd.set('presentation', presentation)
      if (history) fd.set('history', history)
      if (examination) fd.set('examination', examination)
      if (investigations) fd.set('investigations', investigations)
      fd.set('management_timeline', JSON.stringify(managementTimeline))
      if (outcome) fd.set('outcome', outcome)
      if (learningPoints) fd.set('learning_points', learningPoints)

      const result = await createCaseAction(workspaceId, workspaceSlug, fd)
      if (result.error) { toast.error(result.error); return }
      toast.success('Case created')
      router.push(ROUTES.caseDetail(workspaceSlug, result.caseId!))
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push(ROUTES.cases(workspaceSlug))}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          <Save className="h-4 w-4 mr-1.5" />
          {isPending ? 'Saving…' : 'Save Draft'}
        </Button>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-8">

          {/* Title */}
          <div className="space-y-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Case title…"
              className="text-xl font-semibold border-0 border-b border-border rounded-none px-0 h-auto py-2 focus-visible:ring-0 focus-visible:border-primary"
              required
            />
          </div>

          {/* ── SECTION: Overview ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Overview</h2>
              <Separator className="flex-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Specialty</Label>
                <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Cardiology" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Diagnosis</Label>
                <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Primary diagnosis" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Patient Age Range</Label>
                <Input value={patientAgeRange} onChange={(e) => setPatientAgeRange(e.target.value)} placeholder="e.g. 45-50" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Patient Gender</Label>
                <Select value={patientGender} onValueChange={(v) => setPatientGender(v as PatientGender)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Not specified" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="not_disclosed">Not disclosed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ICD codes */}
            <div className="space-y-1.5">
              <Label className="text-xs">ICD Codes</Label>
              <div className="flex gap-2">
                <Input value={icdInput} onChange={(e) => setIcdInput(e.target.value)} placeholder="e.g. I21.0" className="h-8 text-sm flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIcdCode() } }} />
                <Button type="button" variant="outline" size="sm" className="h-8" onClick={addIcdCode}>Add</Button>
              </div>
              {icdCodes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {icdCodes.map((code) => (
                    <span key={code} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded border border-border">
                      {code}
                      <button type="button" onClick={() => setIcdCodes((p) => p.filter((c) => c !== code))}><X className="h-3 w-3 text-muted-foreground hover:text-destructive" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Topic & Tags */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Topic</Label>
                <TopicSelector topics={topics} value={topicId} onChange={setTopicId} onCreateTopic={handleCreateTopic} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tags</Label>
                <TagSelector tags={allTags} selectedIds={selectedTagIds} onChange={setSelectedTagIds} onCreateTag={handleCreateTag} />
              </div>
            </div>
          </section>

          {/* ── SECTION: Clinical ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Clinical Details</h2>
              <Separator className="flex-1" />
            </div>
            {[
              { label: 'Presentation', value: presentation, setter: setPresentation, placeholder: 'Chief complaint and initial presentation…' },
              { label: 'History', value: history, setter: setHistory, placeholder: 'History of presenting illness, past medical history…' },
              { label: 'Examination', value: examination, setter: setExamination, placeholder: 'Vital signs, physical examination findings…' },
              { label: 'Investigations', value: investigations, setter: setInvestigations, placeholder: 'Lab results, imaging, ECG, other investigations…' },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Textarea value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} className="min-h-[100px] text-sm resize-y" />
              </div>
            ))}
          </section>

          {/* ── SECTION: Management Timeline ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Management Timeline</h2>
              <Separator className="flex-1" />
            </div>
            <ManagementTimelineEditor entries={managementTimeline} onChange={setManagementTimeline} />
          </section>

          {/* ── SECTION: Outcome ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Outcome & Learning</h2>
              <Separator className="flex-1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Outcome</Label>
              <Textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Patient outcome and discharge status…" className="min-h-[80px] text-sm resize-y" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Learning Points</Label>
              <Textarea value={learningPoints} onChange={(e) => setLearningPoints(e.target.value)} placeholder="Key takeaways, diagnostic pitfalls, management pearls…" className="min-h-[80px] text-sm resize-y" />
            </div>
          </section>

          <div className="pb-12" />
        </div>
      </div>
    </form>
  )
}
