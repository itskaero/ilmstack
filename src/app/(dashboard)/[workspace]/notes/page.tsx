import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug } from '@/services/workspace.service'
import { getNotes, getTopics, getTags } from '@/services/notes.service'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { NoteCard } from '@/components/notes/note-card'
import { NoteFilters } from '@/components/notes/note-filters'
import { MembersPanel } from '@/components/workspace/members-panel'
import { getWorkspaceMemberStats } from '../members-panel-action'
import { ROUTES } from '@/config/app'
import type { NoteStatus } from '@/types/database'

interface PageProps {
  params: Promise<{ workspace: string }>
  searchParams: Promise<{
    status?: string
    topic?: string
    tag?: string
    search?: string
    page?: string
  }>
}

export default async function NotesPage({ params, searchParams }: PageProps) {
  const { workspace: slug } = await params
  const sp = await searchParams

  const supabase = await createClient()
  const workspace = await getWorkspaceBySlug(supabase, slug)
  if (!workspace) return null

  const page = Math.max(1, parseInt(sp.page ?? '1'))
  const filters = {
    status: (sp.status as NoteStatus) || null,
    topic_id: sp.topic || null,
    tag_id: sp.tag || null,
    search: sp.search || null,
  }

  const [{ notes, total }, topics, tags, memberStats] = await Promise.all([
    getNotes(supabase, workspace.id, filters, page, 20),
    getTopics(supabase, workspace.id),
    getTags(supabase, workspace.id),
    getWorkspaceMemberStats(workspace.id),
  ])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="flex h-full">
      {/* Sidebar filters */}
      <aside className="hidden lg:flex w-52 shrink-0 flex-col border-r border-border p-4 gap-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Filters
        </p>
        <Suspense>
          <NoteFilters topics={topics} tags={tags} />
        </Suspense>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h1 className="text-lg font-semibold">Clinical Notes</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} note{total !== 1 ? 's' : ''}
              {filters.status && ` · ${filters.status.replace('_', ' ')}`}
            </p>
          </div>
          <Button asChild size="sm">
            <Link href={ROUTES.newNote(slug)}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Note
            </Link>
          </Button>
        </div>

        {/* Notes grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No notes yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {filters.status || filters.search || filters.topic_id || filters.tag_id
                  ? 'No notes match your filters.'
                  : 'Create your first clinical note to get started.'}
              </p>
              {!filters.status && !filters.search && (
                <Button asChild size="sm">
                  <Link href={ROUTES.newNote(slug)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    New Note
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} workspaceSlug={slug} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`${ROUTES.notes(slug)}?${new URLSearchParams({
                      ...Object.fromEntries(
                        Object.entries(sp).filter(([, v]) => v !== undefined)
                      ),
                      page: String(page - 1),
                    })}`}
                  >
                    Previous
                  </Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`${ROUTES.notes(slug)}?${new URLSearchParams({
                      ...Object.fromEntries(
                        Object.entries(sp).filter(([, v]) => v !== undefined)
                      ),
                      page: String(page + 1),
                    })}`}
                  >
                    Next
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <MembersPanel members={memberStats} />
    </div>
  )
}

export function NotesPageSkeleton() {
  return (
    <div className="p-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-lg" />
      ))}
    </div>
  )
}
