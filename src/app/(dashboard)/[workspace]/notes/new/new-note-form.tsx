'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NoteEditorAdaptive } from '@/components/notes/note-editor'
import { TagSelector } from '@/components/notes/tag-selector'
import { TopicSelector } from '@/components/notes/topic-selector'
import { createNoteAction, createTagAction, createTopicAction } from '../actions'
import type { Topic, Tag } from '@/types/database'
import { ROUTES } from '@/config/app'

interface NewNoteFormProps {
  workspaceId: string
  workspaceSlug: string
  topics: Topic[]
  tags: Tag[]
}

export function NewNoteForm({
  workspaceId,
  workspaceSlug,
  topics: initialTopics,
  tags: initialTags,
}: NewNoteFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [topicId, setTopicId] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [recommendForJournal, setRecommendForJournal] = useState(false)
  const [topics, setTopics] = useState(initialTopics)
  const [tags, setTags] = useState(initialTags)

  const handleCreateTag = async (name: string) => {
    const result = await createTagAction(workspaceId, workspaceSlug, name)
    if (result.error) {
      toast.error(result.error)
      return null
    }
    const newTag: Tag = {
      id: result.tagId!,
      name,
      color: '#6366f1',
      workspace_id: workspaceId,
      created_by: '',
      created_at: new Date().toISOString(),
    }
    setTags((prev) => [...prev, newTag])
    return newTag
  }

  const handleCreateTopic = async (name: string) => {
    const result = await createTopicAction(workspaceId, workspaceSlug, name)
    if (result.error) {
      toast.error(result.error)
      return null
    }
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
      created_by: '',
      created_at: new Date().toISOString(),
    }
    setTopics((prev) => [...prev, newTopic])
    return newTopic
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!content.trim()) {
      toast.error('Content is required')
      return
    }

    startTransition(async () => {
      const fd = new FormData()
      fd.set('title', title)
      fd.set('content', content)
      if (topicId) fd.set('topic_id', topicId)
      selectedTagIds.forEach((id) => fd.append('tag_ids', id))
      fd.set('recommend_for_journal', String(recommendForJournal))

      const result = await createNoteAction(workspaceId, workspaceSlug, fd)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Note created')
      router.push(ROUTES.noteDetail(workspaceSlug, result.noteId!))
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push(ROUTES.notes(workspaceSlug))}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recommendForJournal}
              onChange={(e) => setRecommendForJournal(e.target.checked)}
              className="h-3.5 w-3.5 rounded"
            />
            Recommend for journal
          </label>
          <Button type="submit" size="sm" disabled={isPending}>
            <Save className="h-4 w-4 mr-1.5" />
            {isPending ? 'Saving…' : 'Save Draft'}
          </Button>
        </div>
      </div>

      {/* Meta row */}
      <div className="px-6 py-3 border-b border-border flex flex-wrap items-end gap-4 shrink-0 bg-muted/30">
        <div className="flex-1 min-w-48">
          <Label className="text-xs mb-1 block">Topic</Label>
          <TopicSelector
            topics={topics}
            value={topicId}
            onChange={setTopicId}
            onCreateTopic={handleCreateTopic}
          />
        </div>
        <div className="flex-1 min-w-48">
          <Label className="text-xs mb-1 block">Tags</Label>
          <TagSelector
            tags={tags}
            selectedIds={selectedTagIds}
            onChange={setSelectedTagIds}
            onCreateTag={handleCreateTag}
          />
        </div>
      </div>

      {/* Title */}
      <div className="px-6 pt-5 pb-2 shrink-0">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title…"
          className="text-xl font-semibold border-0 border-b border-border rounded-none px-0 h-auto py-1 focus-visible:ring-0 focus-visible:border-primary"
        />
      </div>

      {/* Editor */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <NoteEditorAdaptive
          value={content}
          onChange={setContent}
          height={Math.max(400, typeof window !== 'undefined' ? window.innerHeight - 320 : 400)}
        />
      </div>
    </form>
  )
}
