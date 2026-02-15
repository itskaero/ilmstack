import { BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getMemberRole } from '@/services/workspace.service'
import { getJournals } from '@/services/journals.service'
import { JournalCard } from '@/components/journal/journal-card'
import { GenerateJournalDialog } from '@/components/journal/generate-journal-dialog'
import { Button } from '@/components/ui/button'
import type { JournalStatus } from '@/types/database'

interface PageProps {
  params: Promise<{ workspace: string }>
  searchParams: Promise<{
    status?: string
    year?: string
    page?: string
  }>
}

export default async function JournalPage({ params, searchParams }: PageProps) {
  const { workspace: slug } = await params
  const sp = await searchParams

  const supabase = await createClient()
  const workspace = await getWorkspaceBySlug(supabase, slug)
  if (!workspace) return null

  const { data: { user } } = await supabase.auth.getUser()
  const role = user ? await getMemberRole(supabase, workspace.id, user.id) : null
  const canGenerate = role === 'admin' || role === 'editor'

  const page = Math.max(1, parseInt(sp.page ?? '1'))
  const filters = {
    status: (sp.status as JournalStatus) || null,
    year: sp.year ? parseInt(sp.year) : null,
  }

  const { journals, total } = await getJournals(supabase, workspace.id, filters, page, 20)
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-lg font-semibold">Monthly Journal</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total} journal{total !== 1 ? 's' : ''}
          </p>
        </div>
        {canGenerate && (
          <GenerateJournalDialog
            workspaceId={workspace.id}
            workspaceSlug={slug}
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {journals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No journals yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Generate a monthly journal to compile published notes into a department publication.
            </p>
            {canGenerate && (
              <GenerateJournalDialog
                workspaceId={workspace.id}
                workspaceSlug={slug}
              />
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {journals.map((j) => (
              <JournalCard
                key={j.id}
                journal={j}
                workspaceSlug={slug}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/${slug}/journal?page=${page - 1}${sp.status ? `&status=${sp.status}` : ''}${sp.year ? `&year=${sp.year}` : ''}`}>
                  Previous
                </a>
              </Button>
            )}
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/${slug}/journal?page=${page + 1}${sp.status ? `&status=${sp.status}` : ''}${sp.year ? `&year=${sp.year}` : ''}`}>
                  Next
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
