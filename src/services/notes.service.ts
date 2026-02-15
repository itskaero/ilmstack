import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  NoteRow,
  NoteWithRelations,
  NoteVersion,
  NoteAttachment,
  NoteComment,
  Topic,
  Tag,
  CreateNoteInput,
  UpdateNoteInput,
  CreateCommentInput,
  NoteStatus,
} from '@/types/database'

export type NoteFilters = {
  status?: NoteStatus | null
  topic_id?: string | null
  tag_id?: string | null
  search?: string | null
  author_id?: string | null
  recommend_for_journal?: boolean | null
}

export type NotesPage = {
  notes: NoteWithRelations[]
  total: number
}

// ── Topics ───────────────────────────────────────────────────

export async function getTopics(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<Topic[]> {
  const { data } = await supabase
    .from('topics')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  return (data ?? []) as Topic[]
}

export async function createTopic(
  supabase: SupabaseClient,
  workspaceId: string,
  createdBy: string,
  name: string,
  parentId?: string | null
): Promise<Topic | null> {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const { data } = await (supabase.from('topics') as any)
    .insert({
      workspace_id: workspaceId,
      name,
      slug,
      parent_id: parentId ?? null,
      created_by: createdBy,
      sort_order: 0,
    })
    .select()
    .single()
  return data as Topic | null
}

// ── Tags ─────────────────────────────────────────────────────

export async function getTags(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<Tag[]> {
  const { data } = await supabase
    .from('tags')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true })
  return (data ?? []) as Tag[]
}

export async function createTag(
  supabase: SupabaseClient,
  workspaceId: string,
  createdBy: string,
  name: string,
  color: string = '#6366f1'
): Promise<Tag | null> {
  const { data } = await (supabase.from('tags') as any)
    .insert({ workspace_id: workspaceId, name, color, created_by: createdBy })
    .select()
    .single()
  return data as Tag | null
}

// ── Notes CRUD ────────────────────────────────────────────────

export async function getNotes(
  supabase: SupabaseClient,
  workspaceId: string,
  filters: NoteFilters = {},
  page = 1,
  perPage = 20
): Promise<NotesPage> {
  let query = supabase
    .from('notes')
    .select(
      `*,
       author:profiles!notes_author_id_fkey(*),
       topic:topics(*),
       note_tags(tag:tags(*))`,
      { count: 'exact' }
    )
    .eq('workspace_id', workspaceId)

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.topic_id) query = query.eq('topic_id', filters.topic_id)
  if (filters.author_id) query = query.eq('author_id', filters.author_id)
  if (filters.recommend_for_journal === true)
    query = query.eq('recommend_for_journal', true)
  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`)
  }

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data, count } = await query
    .order('updated_at', { ascending: false })
    .range(from, to)

  const notes: NoteWithRelations[] = (data ?? []).map((n: any) => ({
    ...n,
    tags: (n.note_tags ?? []).map((nt: any) => nt.tag).filter(Boolean),
  }))

  return { notes, total: count ?? 0 }
}

export async function getNoteById(
  supabase: SupabaseClient,
  noteId: string,
  workspaceId: string
): Promise<NoteWithRelations | null> {
  const { data } = await supabase
    .from('notes')
    .select(
      `*,
       author:profiles!notes_author_id_fkey(*),
       topic:topics(*),
       note_tags(tag:tags(*))`
    )
    .eq('id', noteId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!data) return null

  return {
    ...(data as any),
    tags: ((data as any).note_tags ?? []).map((nt: any) => nt.tag).filter(Boolean),
  } as NoteWithRelations
}

export async function createNote(
  supabase: SupabaseClient,
  workspaceId: string,
  authorId: string,
  input: CreateNoteInput
): Promise<NoteRow | null> {
  const { tag_ids, ...noteData } = input

  const { data: note } = await (supabase.from('notes') as any)
    .insert({
      workspace_id: workspaceId,
      author_id: authorId,
      title: noteData.title,
      content: noteData.content,
      status: 'draft',
      topic_id: noteData.topic_id ?? null,
      recommend_for_journal: noteData.recommend_for_journal ?? false,
    })
    .select()
    .single()

  if (!note) return null

  if (tag_ids && tag_ids.length > 0) {
    await (supabase.from('note_tags') as any).insert(
      tag_ids.map((tag_id: string) => ({ note_id: note.id, tag_id }))
    )
  }

  return note as NoteRow
}

export async function updateNote(
  supabase: SupabaseClient,
  noteId: string,
  workspaceId: string,
  input: UpdateNoteInput
): Promise<NoteRow | null> {
  const { tag_ids, ...noteData } = input

  const updates: Record<string, unknown> = {}
  if (noteData.title !== undefined) updates.title = noteData.title
  if (noteData.content !== undefined) updates.content = noteData.content
  if (noteData.topic_id !== undefined) updates.topic_id = noteData.topic_id
  if (noteData.recommend_for_journal !== undefined)
    updates.recommend_for_journal = noteData.recommend_for_journal
  if (noteData.status !== undefined) {
    updates.status = noteData.status
    if (noteData.status === 'published')
      updates.published_at = new Date().toISOString()
  }

  const { data: note } = await (supabase.from('notes') as any)
    .update(updates)
    .eq('id', noteId)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (!note) return null

  if (tag_ids !== undefined) {
    await supabase.from('note_tags').delete().eq('note_id', noteId)
    if (tag_ids.length > 0) {
      await (supabase.from('note_tags') as any).insert(
        tag_ids.map((tag_id: string) => ({ note_id: noteId, tag_id }))
      )
    }
  }

  return note as NoteRow
}

export async function deleteNote(
  supabase: SupabaseClient,
  noteId: string,
  workspaceId: string
): Promise<void> {
  await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('workspace_id', workspaceId)
}

export async function updateNoteStatus(
  supabase: SupabaseClient,
  noteId: string,
  workspaceId: string,
  status: NoteStatus
): Promise<void> {
  const updates: Record<string, unknown> = { status }
  if (status === 'published') updates.published_at = new Date().toISOString()
  await (supabase.from('notes') as any)
    .update(updates)
    .eq('id', noteId)
    .eq('workspace_id', workspaceId)
}

// ── Versions ──────────────────────────────────────────────────

export async function getNoteVersions(
  supabase: SupabaseClient,
  noteId: string,
  _workspaceId: string
): Promise<NoteVersion[]> {
  const { data } = await supabase
    .from('note_versions')
    .select('*, changed_by_profile:profiles!note_versions_changed_by_fkey(*)')
    .eq('note_id', noteId)
    .order('version_number', { ascending: false })
  return (data ?? []) as NoteVersion[]
}

// ── Comments ──────────────────────────────────────────────────

export async function getNoteComments(
  supabase: SupabaseClient,
  noteId: string,
  workspaceId: string
): Promise<NoteComment[]> {
  const { data: topLevelData } = await supabase
    .from('note_comments')
    .select('*, author:profiles!note_comments_author_id_fkey(*)')
    .eq('note_id', noteId)
    .eq('workspace_id', workspaceId)
    .is('parent_id', null)
    .order('created_at', { ascending: true })

  const topLevel = (topLevelData ?? []) as NoteComment[]

  const withReplies = await Promise.all(
    topLevel.map(async (comment) => {
      const { data: replies } = await supabase
        .from('note_comments')
        .select('*, author:profiles!note_comments_author_id_fkey(*)')
        .eq('parent_id', comment.id)
        .order('created_at', { ascending: true })
      return { ...comment, replies: (replies ?? []) as NoteComment[] }
    })
  )

  return withReplies
}

export async function addComment(
  supabase: SupabaseClient,
  workspaceId: string,
  authorId: string,
  input: CreateCommentInput
): Promise<NoteComment | null> {
  const { data } = await (supabase.from('note_comments') as any)
    .insert({
      note_id: input.note_id,
      workspace_id: workspaceId,
      author_id: authorId,
      content: input.content,
      comment_type: input.comment_type ?? 'general',
      parent_id: input.parent_id ?? null,
      anchor_ref: input.anchor_ref ?? null,
      resolved: false,
    })
    .select('*, author:profiles!note_comments_author_id_fkey(*)')
    .single()
  return data as NoteComment | null
}

export async function deleteComment(
  supabase: SupabaseClient,
  commentId: string,
  workspaceId: string
): Promise<void> {
  await supabase
    .from('note_comments')
    .delete()
    .eq('id', commentId)
    .eq('workspace_id', workspaceId)
}

export async function resolveComment(
  supabase: SupabaseClient,
  commentId: string,
  workspaceId: string,
  resolvedBy: string
): Promise<void> {
  await (supabase.from('note_comments') as any)
    .update({
      resolved: true,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .eq('workspace_id', workspaceId)
}

// ── Attachments ───────────────────────────────────────────────

export async function getNoteAttachments(
  supabase: SupabaseClient,
  noteId: string,
  workspaceId: string
): Promise<NoteAttachment[]> {
  const { data } = await supabase
    .from('note_attachments')
    .select('*, uploader:profiles!note_attachments_uploader_id_fkey(*)')
    .eq('note_id', noteId)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  return (data ?? []) as NoteAttachment[]
}
