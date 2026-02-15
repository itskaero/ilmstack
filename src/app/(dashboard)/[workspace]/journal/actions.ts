'use server'

// ============================================================
// ILMSTACK HEALTH — Journal Server Actions
// ============================================================

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createJournal,
  updateJournal,
  deleteJournal,
  addJournalEntry,
  removeJournalEntry,
  updateJournalEntry,
  bulkAddJournalEntries,
  reorderJournalEntries,
  getEligibleNotes,
} from '@/services/journals.service'
import type { JournalStatus } from '@/types/database'
import { ROUTES } from '@/config/app'

// ── Generate Journal ──────────────────────────────────────────

export async function generateJournalAction(
  workspaceId: string,
  workspaceSlug: string,
  data: {
    title: string
    period_year: number
    period_month: number
    editorial_note?: string
    auto_collect: boolean
  }
): Promise<{ journalId: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { journalId: null, error: 'Not authenticated' }

  const journal = await createJournal(supabase, workspaceId, user.id, {
    title: data.title,
    period_year: data.period_year,
    period_month: data.period_month,
    editorial_note: data.editorial_note,
  })

  if (!journal) return { journalId: null, error: 'Failed to create journal. A journal for this month may already exist.' }

  // Auto-collect eligible notes
  if (data.auto_collect) {
    const notes = await getEligibleNotes(supabase, workspaceId, data.period_year, data.period_month)
    const noteIds = notes.map((n: any) => n.id)
    if (noteIds.length > 0) {
      await bulkAddJournalEntries(supabase, journal.id, workspaceId, noteIds, user.id)
    }
  }

  revalidatePath(ROUTES.journal(workspaceSlug))
  return { journalId: journal.id, error: null }
}

// ── Update Journal ────────────────────────────────────────────

export async function updateJournalAction(
  journalId: string,
  workspaceId: string,
  workspaceSlug: string,
  data: { title?: string; editorial_note?: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const result = await updateJournal(supabase, journalId, workspaceId, data)
  if (!result) return { error: 'Failed to update journal' }

  revalidatePath(ROUTES.journalDetail(workspaceSlug, journalId))
  return { error: null }
}

// ── Update Journal Status ─────────────────────────────────────

export async function updateJournalStatusAction(
  journalId: string,
  workspaceId: string,
  workspaceSlug: string,
  status: JournalStatus
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const result = await updateJournal(supabase, journalId, workspaceId, { status })
  if (!result) return { error: 'Failed to update journal status' }

  revalidatePath(ROUTES.journalDetail(workspaceSlug, journalId))
  revalidatePath(ROUTES.journal(workspaceSlug))
  return { error: null }
}

// ── Delete Journal ────────────────────────────────────────────

export async function deleteJournalAction(
  journalId: string,
  workspaceId: string,
  workspaceSlug: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await deleteJournal(supabase, journalId, workspaceId)
  revalidatePath(ROUTES.journal(workspaceSlug))
  return { error: null }
}

// ── Add Entry ─────────────────────────────────────────────────

export async function addJournalEntryAction(
  journalId: string,
  workspaceId: string,
  workspaceSlug: string,
  noteId: string,
  opts?: { section?: string; featured?: boolean }
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const entry = await addJournalEntry(supabase, journalId, workspaceId, noteId, user.id, opts)
  if (!entry) return { error: 'Failed to add entry. Note may already be in this journal.' }

  revalidatePath(ROUTES.journalDetail(workspaceSlug, journalId))
  return { error: null }
}

// ── Remove Entry ──────────────────────────────────────────────

export async function removeJournalEntryAction(
  entryId: string,
  workspaceId: string,
  workspaceSlug: string,
  journalId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await removeJournalEntry(supabase, entryId, workspaceId)
  revalidatePath(ROUTES.journalDetail(workspaceSlug, journalId))
  return { error: null }
}

// ── Toggle Featured ───────────────────────────────────────────

export async function toggleEntryFeaturedAction(
  entryId: string,
  workspaceId: string,
  workspaceSlug: string,
  journalId: string,
  featured: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await updateJournalEntry(supabase, entryId, workspaceId, { featured })
  revalidatePath(ROUTES.journalDetail(workspaceSlug, journalId))
  return { error: null }
}

// ── Reorder Entries ───────────────────────────────────────────

export async function reorderEntriesAction(
  workspaceId: string,
  workspaceSlug: string,
  journalId: string,
  entries: { id: string; sort_order: number }[]
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await reorderJournalEntries(supabase, workspaceId, entries)
  revalidatePath(ROUTES.journalDetail(workspaceSlug, journalId))
  return { error: null }
}

// ── Fetch eligible notes (for the "add notes" dialog) ─────────

export async function getEligibleNotesAction(
  workspaceId: string,
  year: number,
  month: number
): Promise<{ notes: any[]; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { notes: [], error: 'Not authenticated' }

  const notes = await getEligibleNotes(supabase, workspaceId, year, month)
  return { notes, error: null }
}
