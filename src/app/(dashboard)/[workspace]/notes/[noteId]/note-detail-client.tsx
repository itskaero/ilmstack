'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import {
  ArrowLeft,
  Edit3,
  Save,
  X,
  Trash2,
  BookMarked,
  BookOpen,
  Clock,
  MessageSquare,
  MoreHorizontal,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NoteStatusBadge } from '@/components/notes/note-status-badge'
import { TagSelector } from '@/components/notes/tag-selector'
import { TopicSelector } from '@/components/notes/topic-selector'
import { VersionHistory } from '@/components/notes/version-history'
import { CommentThread } from '@/components/notes/comment-thread'
import {
  updateNoteAction,
  deleteNoteAction,
  updateNoteStatusAction,
  toggleJournalRecommendAction,
  createTagAction,
  createTopicAction,
  submitForReviewAction,
} from '../actions'
import type {
  NoteWithRelations,
  NoteVersion,
  NoteComment,
  Profile,
  Topic,
  Tag,
  NoteStatus,
  WorkspaceRole,
} from '@/types/database'
import { ROUTES } from '@/config/app'
import { format } from 'date-fns'

const MDPreview = dynamic(() => import('@uiw/react-markdown-preview'), { ssr: false })
const NoteEditorAdaptive = dynamic(
  () => import('@/components/notes/note-editor').then((m) => m.NoteEditorAdaptive),
  { ssr: false }
)

const STATUS_TRANSITIONS: Record<NoteStatus, { next: NoteStatus; label: string }[]> = {
  draft: [{ next: 'under_review', label: 'Submit for Review' }],
  under_review: [
    { next: 'approved', label: 'Approve' },
    { next: 'draft', label: 'Return to Draft' },
  ],
  approved: [
    { next: 'published', label: 'Publish' },
    { next: 'draft', label: 'Return to Draft' },
  ],
  published: [{ next: 'archived', label: 'Archive' }],
  archived: [{ next: 'draft', label: 'Restore to Draft' }],
}

interface NoteDetailClientProps {
  note: NoteWithRelations
  versions: NoteVersion[]
  comments: NoteComment[]
  topics: Topic[]
  tags: Tag[]
  workspaceSlug: string
  workspaceId: string
  currentUser: Profile
  role: WorkspaceRole
}

export function NoteDetailClient({
  note: initialNote,
  versions,
  comments,
  topics: initialTopics,
  tags: initialTags,
  workspaceSlug,
  workspaceId,
  currentUser,
  role,
}: NoteDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  // Edit state
  const [title, setTitle] = useState(initialNote.title)
  const [content, setContent] = useState(initialNote.content)
  const [topicId, setTopicId] = useState<string | null>(initialNote.topic_id)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialNote.tags.map((t) => t.id)
  )
  const [recommendForJournal, setRecommendForJournal] = useState(
    initialNote.recommend_for_journal
  )
  const [topics, setTopics] = useState(initialTopics)
  const [allTags, setAllTags] = useState(initialTags)

  // Note state (optimistic)
  const [note, setNote] = useState(initialNote)

  const isAuthor = note.author_id === currentUser.id
  const canEdit =
    role === 'admin' ||
    role === 'editor' ||
    (role === 'contributor' && isAuthor)
  const canChangeStatus = role === 'admin' || role === 'editor'
  // Contributors can submit their own drafts for review
  const canSubmitForReview = isAuthor && note.status === 'draft'

  const handleSave = () => {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('title', title)
      fd.set('content', content)
      if (topicId) fd.set('topic_id', topicId)
      selectedTagIds.forEach((id) => fd.append('tag_ids', id))
      fd.set('recommend_for_journal', String(recommendForJournal))

      const result = await updateNoteAction(
        note.id,
        workspaceId,
        workspaceSlug,
        fd
      )
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Note saved')
      setNote((prev) => ({
        ...prev,
        title,
        content,
        topic_id: topicId,
        recommend_for_journal: recommendForJournal,
        topic: topics.find((t) => t.id === topicId) ?? null,
        tags: allTags.filter((t) => selectedTagIds.includes(t.id)),
      }))
      setIsEditing(false)
    })
  }

  const handleCancel = () => {
    setTitle(note.title)
    setContent(note.content)
    setTopicId(note.topic_id)
    setSelectedTagIds(note.tags.map((t) => t.id))
    setRecommendForJournal(note.recommend_for_journal)
    setIsEditing(false)
  }

  const handleStatusChange = (status: NoteStatus) => {
    startTransition(async () => {
      // "Submit for Review" creates a review_request and logs the action
      if (status === 'under_review') {
        const result = await submitForReviewAction(note.id, workspaceId, workspaceSlug)
        if (result.error) {
          toast.error(result.error)
          return
        }
        setNote((prev) => ({ ...prev, status }))
        toast.success('Submitted for review')
        return
      }

      const result = await updateNoteStatusAction(
        note.id,
        workspaceId,
        workspaceSlug,
        status
      )
      if (result.error) {
        toast.error(result.error)
        return
      }
      setNote((prev) => ({ ...prev, status }))
      toast.success(`Status updated to ${status.replace('_', ' ')}`)
    })
  }

  const handleToggleJournal = () => {
    startTransition(async () => {
      const result = await toggleJournalRecommendAction(
        note.id,
        workspaceId,
        workspaceSlug,
        note.recommend_for_journal
      )
      if (result.error) {
        toast.error(result.error)
        return
      }
      setNote((prev) => ({
        ...prev,
        recommend_for_journal: !prev.recommend_for_journal,
      }))
      setRecommendForJournal((v) => !v)
    })
  }

  const handleDelete = () => {
    if (!confirm('Delete this note? This cannot be undone.')) return
    startTransition(async () => {
      await deleteNoteAction(note.id, workspaceId, workspaceSlug)
    })
  }

  const handleCreateTag = async (name: string) => {
    const result = await createTagAction(workspaceId, workspaceSlug, name)
    if (result.error) { toast.error(result.error); return null }
    const newTag: Tag = {
      id: result.tagId!,
      name,
      color: '#6366f1',
      workspace_id: workspaceId,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    }
    setAllTags((prev) => [...prev, newTag])
    return newTag
  }

  const handleCreateTopic = async (name: string) => {
    const result = await createTopicAction(workspaceId, workspaceSlug, name)
    if (result.error) { toast.error(result.error); return null }
    const newTopic: Topic = {
      id: result.topicId!,
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      workspace_id: workspaceId,
      parent_id: null,
      description: null,
      color: null,
      icon: null,
      sort_order: 0,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    }
    setTopics((prev) => [...prev, newTopic])
    return newTopic
  }

  const authorName =
    note.author?.full_name ?? note.author?.email ?? 'Unknown'
  const initials = authorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const transitions = STATUS_TRANSITIONS[note.status] ?? []

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(ROUTES.notes(workspaceSlug))}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Notes
        </Button>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground truncate flex-1 max-w-sm">
          {note.title}
        </span>

        <div className="flex items-center gap-2 ml-auto">
          <NoteStatusBadge status={note.status} />

          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                <Save className="h-4 w-4 mr-1" />
                {isPending ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleToggleJournal}>
                    <BookMarked className="h-3.5 w-3.5 mr-2" />
                    {note.recommend_for_journal
                      ? 'Remove journal recommendation'
                      : 'Recommend for journal'}
                  </DropdownMenuItem>

                  {/* Show Submit for Review for authors, other transitions for editors/admins */}
                  {(canChangeStatus || canSubmitForReview) && transitions.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {transitions
                        .filter((t) => canChangeStatus || (canSubmitForReview && t.next === 'under_review'))
                        .map((t) => (
                          <DropdownMenuItem
                            key={t.next}
                            onClick={() => handleStatusChange(t.next)}
                          >
                            {t.label}
                          </DropdownMenuItem>
                        ))}
                    </>
                  )}

                  {canEdit && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={handleDelete}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete note
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {isEditing ? (
            <>
              {/* Edit meta */}
              <div className="px-6 py-3 border-b border-border bg-muted/30 flex flex-wrap gap-4 shrink-0">
                <div className="flex-1 min-w-48">
                  <p className="text-xs text-muted-foreground mb-1">Topic</p>
                  <TopicSelector
                    topics={topics}
                    value={topicId}
                    onChange={setTopicId}
                    onCreateTopic={handleCreateTopic}
                  />
                </div>
                <div className="flex-1 min-w-48">
                  <p className="text-xs text-muted-foreground mb-1">Tags</p>
                  <TagSelector
                    tags={allTags}
                    selectedIds={selectedTagIds}
                    onChange={setSelectedTagIds}
                    onCreateTag={handleCreateTag}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recommendForJournal}
                      onChange={(e) => setRecommendForJournal(e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    Recommend for journal
                  </label>
                </div>
              </div>

              {/* Edit title */}
              <div className="px-6 pt-4 pb-2 shrink-0">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xl font-semibold border-0 border-b border-border rounded-none px-0 h-auto py-1 focus-visible:ring-0 focus-visible:border-primary"
                />
              </div>

              {/* Editor */}
              <div className="flex-1 px-6 pb-6 overflow-hidden">
                <NoteEditorAdaptive
                  value={content}
                  onChange={setContent}
                  height={500}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* Note header */}
              <div className="mb-4">
                <h1 className="text-2xl font-bold mb-3 leading-tight">{note.title}</h1>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={note.author?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                    </Avatar>
                    <span>{authorName}</span>
                  </div>
                  <span>·</span>
                  <span>{format(new Date(note.updated_at), 'PPP')}</span>
                  {note.recommend_for_journal && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-amber-600">
                        <BookMarked className="h-3.5 w-3.5" />
                        Recommended for journal
                      </span>
                    </>
                  )}
                </div>

                {/* Topic & tags */}
                {(note.topic || note.tags.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {note.topic && (
                      <Badge variant="secondary" className="text-xs">
                        {note.topic.name}
                      </Badge>
                    )}
                    {note.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: tag.color + '60', color: tag.color }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}

                <Separator />
              </div>

              {/* Markdown content */}
              <div data-color-mode="auto" className="prose-clinical">
                <MDPreview source={note.content} />
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: versions + comments */}
        <aside className="hidden xl:flex w-72 shrink-0 flex-col border-l border-border">
          <Tabs defaultValue="comments" className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b border-border h-10 px-2 bg-background shrink-0">
              <TabsTrigger value="comments" className="flex-1 text-xs gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 text-xs gap-1">
                <Clock className="h-3.5 w-3.5" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="flex-1 mt-0 overflow-hidden">
              <CommentThread
                comments={comments}
                noteId={note.id}
                workspaceId={workspaceId}
                workspaceSlug={workspaceSlug}
                currentUser={currentUser}
              />
            </TabsContent>

            <TabsContent value="history" className="flex-1 mt-0 overflow-hidden">
              <VersionHistory
                versions={versions}
                currentVersion={note.current_version}
                onRestoreVersion={canEdit ? (v) => {
                  setTitle(v.title)
                  setContent(v.content)
                  setIsEditing(true)
                  toast.info(`Editing version ${v.version_number} — save to create a new version.`)
                } : undefined}
              />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  )
}
