// ============================================================
// ILMSTACK HEALTH — Journal Service
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  JournalRow,
  JournalWithEntries,
  JournalEntryRow,
  JournalEntryWithNote,
  JournalStatus,
  CreateJournalInput,
} from '@/types/database'

export type JournalFilters = {
  status?: JournalStatus | null
  year?: number | null
}

export type JournalsPage = {
  journals: JournalRow[]
  total: number
}

const JOURNAL_ENTRY_SELECT = `
  *,
  note:notes(
    *,
    author:profiles!notes_author_id_fkey(*),
    topic:topics(*),
    note_tags(tag:tags(*))
  )
`

// ── Queries ───────────────────────────────────────────────────

export async function getJournals(
  supabase: SupabaseClient,
  workspaceId: string,
  filters: JournalFilters = {},
  page = 1,
  perPage = 20
): Promise<JournalsPage> {
  let query = supabase
    .from('journals')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.year) query = query.eq('period_year', filters.year)

  query = query
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  const { data, count } = await query
  return { journals: data ?? [], total: count ?? 0 }
}

export async function getJournalById(
  supabase: SupabaseClient,
  journalId: string,
  workspaceId: string
): Promise<JournalWithEntries | null> {
  const { data: journal } = await supabase
    .from('journals')
    .select('*, generator:profiles!journals_generated_by_fkey(*)')
    .eq('id', journalId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!journal) return null

  const { data: entries } = await supabase
    .from('journal_entries')
    .select(JOURNAL_ENTRY_SELECT)
    .eq('journal_id', journalId)
    .eq('workspace_id', workspaceId)
    .order('sort_order', { ascending: true })

  const typedEntries = (entries ?? []).map((e: any) => ({
    ...e,
    note: {
      ...e.note,
      tags: e.note?.note_tags?.map((nt: any) => nt.tag).filter(Boolean) ?? [],
    },
  })) as JournalEntryWithNote[]

  return {
    ...journal,
    generator: (journal as any).generator,
    entries: typedEntries,
  } as JournalWithEntries
}

// ── Get published notes eligible for a journal period ─────────

export async function getEligibleNotes(
  supabase: SupabaseClient,
  workspaceId: string,
  year: number,
  month: number
) {
  const start = new Date(year, month - 1, 1).toISOString()
  const end = new Date(year, month, 1).toISOString()

  const { data } = await supabase
    .from('notes')
    .select(
      `
      *,
      author:profiles!notes_author_id_fkey(*),
      topic:topics(*),
      note_tags(tag:tags(*))
    `
    )
    .eq('workspace_id', workspaceId)
    .eq('recommend_for_journal', true)
    .eq('status', 'published')
    .gte('created_at', start)
    .lt('created_at', end)
    .order('created_at', { ascending: true })

  return (data ?? []).map((n: any) => ({
    ...n,
    tags: n.note_tags?.map((nt: any) => nt.tag).filter(Boolean) ?? [],
  }))
}

// ── Mutations ─────────────────────────────────────────────────

export async function createJournal(
  supabase: SupabaseClient,
  workspaceId: string,
  generatedBy: string,
  input: CreateJournalInput
): Promise<JournalRow | null> {
  const { data, error } = await supabase
    .from('journals')
    .insert({
      workspace_id: workspaceId,
      generated_by: generatedBy,
      title: input.title,
      period_year: input.period_year,
      period_month: input.period_month,
      editorial_note: input.editorial_note ?? null,
      status: 'draft',
    } as any)
    .select()
    .single()

  if (error) {
    console.error('createJournal error:', error)
    return null
  }
  return data
}

export async function updateJournal(
  supabase: SupabaseClient,
  journalId: string,
  workspaceId: string,
  input: { title?: string; editorial_note?: string; status?: JournalStatus }
): Promise<JournalRow | null> {
  const updateData: Record<string, unknown> = { ...input }
  if (input.status === 'published') {
    updateData.published_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('journals')
    .update(updateData as any)
    .eq('id', journalId)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) {
    console.error('updateJournal error:', error)
    return null
  }
  return data
}

export async function deleteJournal(
  supabase: SupabaseClient,
  journalId: string,
  workspaceId: string
): Promise<void> {
  await supabase
    .from('journals')
    .delete()
    .eq('id', journalId)
    .eq('workspace_id', workspaceId)
}

// ── Journal entries ───────────────────────────────────────────

export async function addJournalEntry(
  supabase: SupabaseClient,
  journalId: string,
  workspaceId: string,
  noteId: string,
  addedBy: string,
  opts: { section?: string; featured?: boolean; sort_order?: number } = {}
): Promise<JournalEntryRow | null> {
  // Get the max sort order first
  const { data: existing } = await supabase
    .from('journal_entries')
    .select('sort_order')
    .eq('journal_id', journalId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (existing?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      journal_id: journalId,
      note_id: noteId,
      workspace_id: workspaceId,
      added_by: addedBy,
      section: opts.section ?? null,
      featured: opts.featured ?? false,
      sort_order: opts.sort_order ?? nextOrder,
    } as any)
    .select()
    .single()

  if (error) {
    console.error('addJournalEntry error:', error)
    return null
  }
  return data
}

export async function removeJournalEntry(
  supabase: SupabaseClient,
  entryId: string,
  workspaceId: string
): Promise<void> {
  await supabase
    .from('journal_entries')
    .delete()
    .eq('id', entryId)
    .eq('workspace_id', workspaceId)
}

export async function updateJournalEntry(
  supabase: SupabaseClient,
  entryId: string,
  workspaceId: string,
  input: { section?: string; featured?: boolean; sort_order?: number }
): Promise<void> {
  await supabase
    .from('journal_entries')
    .update(input as any)
    .eq('id', entryId)
    .eq('workspace_id', workspaceId)
}

export async function bulkAddJournalEntries(
  supabase: SupabaseClient,
  journalId: string,
  workspaceId: string,
  noteIds: string[],
  addedBy: string
): Promise<void> {
  if (!noteIds.length) return

  const rows = noteIds.map((noteId, i) => ({
    journal_id: journalId,
    note_id: noteId,
    workspace_id: workspaceId,
    added_by: addedBy,
    section: null,
    featured: false,
    sort_order: i,
  }))

  await supabase
    .from('journal_entries')
    .upsert(rows as any, { onConflict: 'journal_id,note_id', ignoreDuplicates: true })
}

export async function reorderJournalEntries(
  supabase: SupabaseClient,
  workspaceId: string,
  entries: { id: string; sort_order: number }[]
): Promise<void> {
  await Promise.all(
    entries.map(({ id, sort_order }) =>
      supabase
        .from('journal_entries')
        .update({ sort_order } as any)
        .eq('id', id)
        .eq('workspace_id', workspaceId)
    )
  )
}
