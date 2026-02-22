import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, FolderOpen, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug } from '@/services/workspace.service'
import { getCases, getSpecialties } from '@/services/cases.service'
import { getTopics, getTags } from '@/services/notes.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CaseCard } from '@/components/cases/case-card'
import { NoteFilters } from '@/components/notes/note-filters'
import { MembersPanel } from '@/components/workspace/members-panel'
import { getWorkspaceMemberStats } from '../members-panel-action'
import { ROUTES } from '@/config/app'
import type { CaseStatus } from '@/types/database'

interface PageProps {
  params: Promise<{ workspace: string }>
  searchParams: Promise<{
    status?: string
    topic?: string
    tag?: string
    search?: string
    specialty?: string
    page?: string
  }>
}

export default async function CasesPage({ params, searchParams }: PageProps) {
  const { workspace: slug } = await params
  const sp = await searchParams

  const supabase = await createClient()
  const workspace = await getWorkspaceBySlug(supabase, slug)
  if (!workspace) return null

  const page = Math.max(1, parseInt(sp.page ?? '1'))
  const filters = {
    status: (sp.status as CaseStatus) || null,
    topic_id: sp.topic || null,
    tag_id: sp.tag || null,
    search: sp.search || null,
    specialty: sp.specialty || null,
  }

  const [{ cases, total }, topics, tags, specialties, memberStats] = await Promise.all([
    getCases(supabase, workspace.id, filters, page, 20),
    getTopics(supabase, workspace.id),
    getTags(supabase, workspace.id),
    getSpecialties(supabase, workspace.id),
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

        {/* Specialty filter */}
        {specialties.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">Specialty</p>
            <Suspense>
              <SpecialtyFilter specialties={specialties} currentSpecialty={sp.specialty} workspaceSlug={slug} />
            </Suspense>
          </div>
        )}

        {/* Case status */}
        <Suspense>
          <CaseStatusFilter currentStatus={sp.status} workspaceSlug={slug} />
        </Suspense>

        <Suspense>
          <NoteFilters topics={topics} tags={tags} />
        </Suspense>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h1 className="text-lg font-semibold">Case Library</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} case{total !== 1 ? 's' : ''}
              {filters.specialty && ` · ${filters.specialty}`}
            </p>
          </div>
          <Button asChild size="sm">
            <Link href={ROUTES.newCase(slug)}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Case
            </Link>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No cases yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {filters.status || filters.search || filters.specialty
                  ? 'No cases match your filters.'
                  : 'Add the first clinical case to the library.'}
              </p>
              {!filters.status && !filters.search && (
                <Button asChild size="sm">
                  <Link href={ROUTES.newCase(slug)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    New Case
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {cases.map((c) => (
                <CaseCard key={c.id} caseData={c} workspaceSlug={slug} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`${ROUTES.cases(slug)}?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v !== undefined)), page: String(page - 1) })}`}>
                    Previous
                  </Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`${ROUTES.cases(slug)}?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v !== undefined)), page: String(page + 1) })}`}>
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

// ── Inline filter components (server, no client needed) ───────

function CaseStatusFilter({ currentStatus, workspaceSlug }: { currentStatus?: string; workspaceSlug: string }) {
  return null // Rendered via NoteFilters status select — reused below
}

function SpecialtyFilter({ specialties, currentSpecialty, workspaceSlug }: { specialties: string[]; currentSpecialty?: string; workspaceSlug: string }) {
  return null // placeholder — client-side filtering handled via NoteFilters pattern
}
