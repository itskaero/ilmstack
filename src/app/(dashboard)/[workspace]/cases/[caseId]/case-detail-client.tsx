'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Edit3, Save, X, Trash2, MoreHorizontal,
  ChevronRight, Stethoscope, User, UserPlus, Users,
} from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { CaseStatusBadge } from '@/components/cases/case-status-badge'
import { ManagementTimelineEditor } from '@/components/cases/management-timeline-editor'
import { ImagingGallery } from '@/components/cases/imaging-gallery'
import { TagSelector } from '@/components/notes/tag-selector'
import { TopicSelector } from '@/components/notes/topic-selector'
import {
  updateCaseAction, deleteCaseAction, updateCaseStatusAction,
  createTagAction, createTopicAction, addCollaboratorAction, removeCollaboratorAction,
} from '../actions'
import { GrowthChartEditor } from '@/components/cases/growth-chart-editor'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import type {
  CaseWithRelations, Topic, Tag, CaseStatus,
  WorkspaceRole, Profile, ManagementTimelineEntry, PatientGender, GrowthData,
  WorkspaceMember,
} from '@/types/database'
import { ROUTES } from '@/config/app'

const STATUS_TRANSITIONS: Record<CaseStatus, { next: CaseStatus; label: string }[]> = {
  draft: [{ next: 'published', label: 'Publish' }],
  published: [{ next: 'archived', label: 'Archive' }],
  archived: [{ next: 'draft', label: 'Restore to Draft' }],
}

const GENDER_LABELS: Record<PatientGender, string> = {
  male: 'Male', female: 'Female', other: 'Other', not_disclosed: 'Not disclosed',
}

interface CaseDetailClientProps {
  caseData: CaseWithRelations
  topics: Topic[]
  tags: Tag[]
  workspaceSlug: string
  workspaceId: string
  currentUser: Profile
  role: WorkspaceRole
  workspaceMembers: WorkspaceMember[]
}

export function CaseDetailClient({
  caseData: initialCase,
  topics: initialTopics,
  tags: initialTags,
  workspaceSlug,
  workspaceId,
  currentUser,
  role,
  workspaceMembers,
}: CaseDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [caseData, setCaseData] = useState(initialCase)

  // Edit state — mirror all fields
  const [title, setTitle] = useState(initialCase.title)
  const [specialty, setSpecialty] = useState(initialCase.specialty ?? '')
  const [diagnosis, setDiagnosis] = useState(initialCase.diagnosis ?? '')
  const [patientAgeRange, setPatientAgeRange] = useState(initialCase.patient_age_range ?? '')
  const [patientGender, setPatientGender] = useState<PatientGender | ''>(initialCase.patient_gender ?? '')
  const [topicId, setTopicId] = useState<string | null>(initialCase.topic_id)
  const [selectedTagIds, setSelectedTagIds] = useState(initialCase.tags.map((t) => t.id))
  const [presentation, setPresentation] = useState(initialCase.presentation ?? '')
  const [history, setHistory] = useState(initialCase.history ?? '')
  const [examination, setExamination] = useState(initialCase.examination ?? '')
  const [investigations, setInvestigations] = useState(initialCase.investigations ?? '')
  const [managementTimeline, setManagementTimeline] = useState<ManagementTimelineEntry[]>(initialCase.management_timeline ?? [])
  const [outcome, setOutcome] = useState(initialCase.outcome ?? '')
  const [learningPoints, setLearningPoints] = useState(initialCase.learning_points ?? '')
  const [growthData, setGrowthData] = useState<GrowthData | null>((initialCase.growth_data as GrowthData | null) ?? null)
  const [topics, setTopics] = useState(initialTopics)
  const [allTags, setAllTags] = useState(initialTags)

  const [collaborators, setCollaborators] = useState(initialCase.collaborators ?? [])
  const [addCollabOpen, setAddCollabOpen] = useState(false)

  const isCollaborator = collaborators.some((c) => c.user_id === currentUser.id)
  const canEdit = role === 'admin' || role === 'editor' || isCollaborator ||
    (role === 'contributor' && caseData.author_id === currentUser.id)
  const canManageCollaborators = role === 'admin' || role === 'editor' || caseData.author_id === currentUser.id
  const canChangeStatus = role === 'admin' || role === 'editor'
  const transitions = STATUS_TRANSITIONS[caseData.status] ?? []

  // Members not already collaborators (and not the author)
  const addableMembers = workspaceMembers.filter(
    (m) => m.user_id !== caseData.author_id && !collaborators.some((c) => c.user_id === m.user_id)
  )

  const authorName = caseData.author?.full_name ?? caseData.author?.email ?? 'Unknown'
  const initials = authorName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const handleCreateTag = async (name: string) => {
    const result = await createTagAction(workspaceId, workspaceSlug, name)
    if (result.error) { toast.error(result.error); return null }
    const t: Tag = { id: result.tagId!, name, color: '#6366f1', workspace_id: workspaceId, created_by: currentUser.id, created_at: new Date().toISOString() }
    setAllTags((p) => [...p, t]); return t
  }

  const handleCreateTopic = async (name: string) => {
    const result = await createTopicAction(workspaceId, workspaceSlug, name)
    if (result.error) { toast.error(result.error); return null }
    const t: Topic = { id: result.topicId!, name, slug: name.toLowerCase().replace(/\s+/g, '-'), workspace_id: workspaceId, parent_id: null, description: null, color: null, icon: null, sort_order: 0, created_by: currentUser.id, created_at: new Date().toISOString() }
    setTopics((p) => [...p, t]); return t
  }

  const handleSave = () => {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('title', title)
      if (specialty) fd.set('specialty', specialty)
      if (diagnosis) fd.set('diagnosis', diagnosis)
      if (patientAgeRange) fd.set('patient_age_range', patientAgeRange)
      if (patientGender) fd.set('patient_gender', patientGender)
      fd.set('icd_codes', '[]')
      if (topicId) fd.set('topic_id', topicId)
      selectedTagIds.forEach((id) => fd.append('tag_ids', id))
      if (presentation) fd.set('presentation', presentation)
      if (history) fd.set('history', history)
      if (examination) fd.set('examination', examination)
      if (investigations) fd.set('investigations', investigations)
      fd.set('management_timeline', JSON.stringify(managementTimeline))
      if (outcome) fd.set('outcome', outcome)
      if (learningPoints) fd.set('learning_points', learningPoints)
      fd.set('growth_data', JSON.stringify(growthData))

      const result = await updateCaseAction(caseData.id, workspaceId, workspaceSlug, fd)
      if (result.error) { toast.error(result.error); return }
      toast.success('Case saved')
      setCaseData((prev) => ({
        ...prev, title, specialty: specialty || null, diagnosis: diagnosis || null,
        patient_age_range: patientAgeRange || null, patient_gender: (patientGender || null) as PatientGender | null,
        icd_codes: [], topic_id: topicId, presentation: presentation || null,
        history: history || null, examination: examination || null, investigations: investigations || null,
        management_timeline: managementTimeline, outcome: outcome || null, learning_points: learningPoints || null,
        topic: topics.find((t) => t.id === topicId) ?? null,
        tags: allTags.filter((t) => selectedTagIds.includes(t.id)),
      }))
      setIsEditing(false)
    })
  }

  const handleCancel = () => {
    setTitle(caseData.title); setSpecialty(caseData.specialty ?? ''); setDiagnosis(caseData.diagnosis ?? '')
    setPatientAgeRange(caseData.patient_age_range ?? ''); setPatientGender(caseData.patient_gender ?? '')
    setTopicId(caseData.topic_id); setSelectedTagIds(caseData.tags.map((t) => t.id))
    setPresentation(caseData.presentation ?? ''); setHistory(caseData.history ?? ''); setExamination(caseData.examination ?? '')
    setInvestigations(caseData.investigations ?? ''); setManagementTimeline(caseData.management_timeline ?? [])
    setOutcome(caseData.outcome ?? ''); setLearningPoints(caseData.learning_points ?? ''); setIsEditing(false)
  }

  const handleStatusChange = (status: CaseStatus) => {
    startTransition(async () => {
      const result = await updateCaseStatusAction(caseData.id, workspaceId, workspaceSlug, status)
      if (result.error) { toast.error(result.error); return }
      setCaseData((prev) => ({ ...prev, status }))
      toast.success(`Status updated to ${status}`)
    })
  }

  const handleDelete = () => {
    if (!confirm('Delete this case? This cannot be undone.')) return
    startTransition(async () => { await deleteCaseAction(caseData.id, workspaceId, workspaceSlug) })
  }

  const handleAddCollaborator = async (member: WorkspaceMember) => {
    const result = await addCollaboratorAction(caseData.id, workspaceId, workspaceSlug, member.user_id)
    if (result.error) { toast.error(result.error); return }
    setCollaborators((prev) => [...prev, {
      case_id: caseData.id,
      user_id: member.user_id,
      added_by: currentUser.id,
      added_at: new Date().toISOString(),
      profile: member.profile,
    }])
    setAddCollabOpen(false)
    toast.success(`${member.profile.full_name ?? member.profile.email} added as collaborator`)
  }

  const handleRemoveCollaborator = async (userId: string) => {
    const result = await removeCollaboratorAction(caseData.id, workspaceId, workspaceSlug, userId)
    if (result.error) { toast.error(result.error); return }
    setCollaborators((prev) => prev.filter((c) => c.user_id !== userId))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.cases(workspaceSlug))}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Cases
        </Button>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground truncate flex-1 max-w-sm">{caseData.title}</span>

        <div className="flex items-center gap-2 ml-auto">
          <CaseStatusBadge status={caseData.status} />
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}><X className="h-4 w-4 mr-1" />Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={isPending}><Save className="h-4 w-4 mr-1" />{isPending ? 'Saving…' : 'Save'}</Button>
            </>
          ) : (
            <>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-1" />Edit
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canChangeStatus && transitions.map((t) => (
                    <DropdownMenuItem key={t.next} onClick={() => handleStatusChange(t.next)}>{t.label}</DropdownMenuItem>
                  ))}
                  {canEdit && (<><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete case</DropdownMenuItem></>)}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">

          {/* Title */}
          {isEditing ? (
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-bold border-0 border-b border-border rounded-none px-0 h-auto py-2 focus-visible:ring-0 focus-visible:border-primary mb-4" />
          ) : (
            <h1 className="text-2xl font-bold mb-3 leading-tight">{caseData.title}</h1>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5"><AvatarImage src={caseData.author?.avatar_url ?? undefined} /><AvatarFallback className="text-[9px]">{initials}</AvatarFallback></Avatar>
              {authorName}
            </span>
            <span>·</span>
            <span>{format(new Date(caseData.updated_at), 'PPP')}</span>
            {caseData.specialty && (<><span>·</span><span className="flex items-center gap-1"><Stethoscope className="h-3.5 w-3.5" />{caseData.specialty}</span></>)}
            {caseData.patient_gender && (<><span>·</span><span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{GENDER_LABELS[caseData.patient_gender]}{caseData.patient_age_range && `, ${caseData.patient_age_range} yrs`}</span></>)}
          </div>

          {/* Diagnosis + tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {caseData.diagnosis && <Badge variant="secondary">{caseData.diagnosis}</Badge>}
            {caseData.topic && <Badge variant="secondary">{caseData.topic.name}</Badge>}
            {caseData.tags.map((t) => (
              <Badge key={t.id} variant="outline" className="text-xs" style={{ borderColor: t.color + '60', color: t.color }}>{t.name}</Badge>
            ))}
          </div>

          {/* Collaborators */}
          {(collaborators.length > 0 || canManageCollaborators) && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Users className="h-3.5 w-3.5" />Collaborators
              </span>
              {collaborators.map((c) => {
                const name = c.profile?.full_name ?? c.profile?.email ?? 'Unknown'
                const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                return (
                  <span key={c.user_id} className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5 text-xs">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={c.profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
                    </Avatar>
                    {name}
                    {canManageCollaborators && (
                      <button onClick={() => handleRemoveCollaborator(c.user_id)} className="ml-0.5 text-muted-foreground hover:text-destructive" aria-label="Remove">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                )
              })}
              {canManageCollaborators && addableMembers.length > 0 && (
                <Popover open={addCollabOpen} onOpenChange={setAddCollabOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6 px-2 rounded-full text-xs gap-1">
                      <UserPlus className="h-3 w-3" />Add
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-1" align="start">
                    <p className="text-xs text-muted-foreground px-2 py-1.5 font-medium">Add collaborator</p>
                    {addableMembers.map((m) => {
                      const name = m.profile.full_name ?? m.profile.email
                      const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                      return (
                        <button
                          key={m.user_id}
                          onClick={() => handleAddCollaborator(m)}
                          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={m.profile.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="truncate">{name}</span>
                          <span className="ml-auto text-xs text-muted-foreground shrink-0">{m.role}</span>
                        </button>
                      )
                    })}
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}

          <Separator className="mb-6" />

          {/* Tabs */}
          <Tabs defaultValue="clinical">
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="clinical">Clinical Details</TabsTrigger>
              <TabsTrigger value="investigations">Investigations ({caseData.imaging.length})</TabsTrigger>
              <TabsTrigger value="management">Management</TabsTrigger>
              <TabsTrigger value="outcome">Outcome & Learning</TabsTrigger>
              <TabsTrigger value="growth">Growth Charts</TabsTrigger>
              {isEditing && <TabsTrigger value="meta">Metadata</TabsTrigger>}
            </TabsList>

            {/* Clinical — Presentation, History, Examination */}
            <TabsContent value="clinical" className="space-y-6">
              {isEditing ? (
                <>
                  {[
                    { label: 'Presentation', value: presentation, setter: setPresentation },
                    { label: 'History', value: history, setter: setHistory },
                    { label: 'Examination', value: examination, setter: setExamination },
                  ].map(({ label, value, setter }) => (
                    <div key={label} className="space-y-1.5">
                      <Label className="text-xs">{label}</Label>
                      <Textarea value={value} onChange={(e) => setter(e.target.value)} className="min-h-[100px] text-sm resize-y" />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {[
                    { label: 'Presentation', value: caseData.presentation },
                    { label: 'History', value: caseData.history },
                    { label: 'Examination', value: caseData.examination },
                  ].map(({ label, value }) => value ? (
                    <div key={label}>
                      <h3 className="text-sm font-semibold mb-1.5">{label}</h3>
                      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{value}</p>
                    </div>
                  ) : null)}
                  {!caseData.presentation && !caseData.history && !caseData.examination && (
                    <p className="text-sm text-muted-foreground italic">No clinical details recorded yet.</p>
                  )}
                </>
              )}
            </TabsContent>

            {/* Investigations & Imaging — merged tab */}
            <TabsContent value="investigations" className="space-y-6">
              {/* Investigation notes (text summary) */}
              {isEditing ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Investigation Notes</Label>
                  <Textarea value={investigations} onChange={(e) => setInvestigations(e.target.value)} className="min-h-[80px] text-sm resize-y" placeholder="Summary of investigation findings..." />
                </div>
              ) : (
                caseData.investigations && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1.5">Investigation Notes</h3>
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{caseData.investigations}</p>
                  </div>
                )
              )}
              <Separator />
              {/* Upload gallery with categories */}
              <ImagingGallery
                images={caseData.imaging}
                caseId={caseData.id}
                workspaceId={workspaceId}
                workspaceSlug={workspaceSlug}
                role={role}
                authorId={caseData.author_id}
                currentUserId={currentUser.id}
              />
            </TabsContent>

            {/* Management */}
            <TabsContent value="management">
              <ManagementTimelineEditor entries={isEditing ? managementTimeline : (caseData.management_timeline ?? [])} onChange={setManagementTimeline} readOnly={!isEditing} />
            </TabsContent>

            {/* Outcome */}
            <TabsContent value="outcome" className="space-y-6">
              {isEditing ? (
                <>
                  <div className="space-y-1.5"><Label className="text-xs">Outcome</Label><Textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} className="min-h-[100px] text-sm resize-y" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Learning Points</Label><Textarea value={learningPoints} onChange={(e) => setLearningPoints(e.target.value)} className="min-h-[100px] text-sm resize-y" /></div>
                </>
              ) : (
                <>
                  {caseData.outcome && <div><h3 className="text-sm font-semibold mb-1.5">Outcome</h3><p className="text-sm leading-relaxed whitespace-pre-wrap">{caseData.outcome}</p></div>}
                  {caseData.learning_points && <div><h3 className="text-sm font-semibold mb-1.5">Learning Points</h3><p className="text-sm leading-relaxed whitespace-pre-wrap">{caseData.learning_points}</p></div>}
                  {!caseData.outcome && !caseData.learning_points && <p className="text-sm text-muted-foreground italic">No outcome recorded yet.</p>}
                </>
              )}
            </TabsContent>

            {/* Growth Charts */}
            <TabsContent value="growth">
              <GrowthChartEditor
                growthData={isEditing ? growthData : (caseData.growth_data as GrowthData | null)}
                onChange={setGrowthData}
                readOnly={!isEditing}
                patientGender={caseData.patient_gender}
              />
            </TabsContent>

            {/* Metadata (edit only) */}
            {isEditing && (
              <TabsContent value="meta" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label className="text-xs">Specialty</Label><Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="h-8 text-sm" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Diagnosis</Label><Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="h-8 text-sm" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Age Range</Label><Input value={patientAgeRange} onChange={(e) => setPatientAgeRange(e.target.value)} className="h-8 text-sm" /></div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Gender</Label>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label className="text-xs">Topic</Label><TopicSelector topics={topics} value={topicId} onChange={setTopicId} onCreateTopic={handleCreateTopic} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Tags</Label><TagSelector tags={allTags} selectedIds={selectedTagIds} onChange={setSelectedTagIds} onCreateTag={handleCreateTag} /></div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  )
}
