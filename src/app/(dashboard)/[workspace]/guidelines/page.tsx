import Link from 'next/link'
import { Plus, BookMarked, Lock, LockOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getMemberRole } from '@/services/workspace.service'
import { getGuidelines } from '@/services/guidelines.service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ROUTES, GUIDELINE_CATEGORIES } from '@/config/app'
import type { GuidelineStatus } from '@/types/database'

interface PageProps {
  params: Promise<{ workspace: string }>
  searchParams: Promise<{
    status?: string
    category?: string
    search?: string
    page?: string
  }>
}

const STATUS_BADGE: Record<GuidelineStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  archived: { label: 'Archived', variant: 'outline' },
}

const MIN_EDIT_LABELS: Record<string, string> = {
  any_editor: 'Any Editor',
  r3_resident_plus: 'R3+',
  senior_registrar: 'SR+',
  consultant_only: 'Consultant',
}

export default async function GuidelinesPage({ params, searchParams }: PageProps) {
  const { workspace: slug } = await params
  const sp = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const workspace = await getWorkspaceBySlug(supabase, slug)
  if (!workspace) return null

  const role = await getMemberRole(supabase, workspace.id, user.id)
  if (!role) return null

  const page = Math.max(1, parseInt(sp.page ?? '1'))
  const filters = {
    status: (sp.status as GuidelineStatus) || null,
    category: sp.category || null,
    search: sp.search || null,
  }

  const { guidelines, total } = await getGuidelines(supabase, workspace.id, filters, page, 20)
  const canCreate = role === 'admin' || role === 'editor'
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="flex h-full">
      {/* Sidebar filters */}
      <aside className="hidden lg:flex w-52 shrink-0 flex-col border-r border-border p-4 gap-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Status
        </p>
        {(['', 'draft', 'active', 'archived'] as const).map((s) => {
          const label = s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)
          const active = (sp.status ?? '') === s
          const params = new URLSearchParams(sp as Record<string, string>)
          if (s) params.set('status', s); else params.delete('status')
          params.delete('page')
          return (
            <Link
              key={s}
              href={`?${params.toString()}`}
              className={`px-2 py-1 text-sm rounded-md transition-colors ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </Link>
          )
        })}

        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">
          Category
        </p>
        {[{ value: '', label: 'All' }, ...GUIDELINE_CATEGORIES].map((c) => {
          const active = (sp.category ?? '') === c.value
          const params = new URLSearchParams(sp as Record<string, string>)
          if (c.value) params.set('category', c.value); else params.delete('category')
          params.delete('page')
          return (
            <Link
              key={c.value}
              href={`?${params.toString()}`}
              className={`px-2 py-1 text-sm rounded-md transition-colors ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {c.label}
            </Link>
          )
        })}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h1 className="text-lg font-semibold">Clinical Guidelines</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} guideline{total !== 1 ? 's' : ''}
              {filters.status ? ` · ${filters.status}` : ''}
            </p>
          </div>
          {canCreate && (
            <Button asChild size="sm">
              <Link href={ROUTES.newGuideline(slug)}>
                <Plus className="h-4 w-4 mr-1.5" />
                New Guideline
              </Link>
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {guidelines.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookMarked className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No guidelines yet</p>
              <p className="text-xs mt-1">
                {canCreate ? 'Create your first clinical guideline.' : 'No guidelines have been published yet.'}
              </p>
              {canCreate && (
                <Button asChild size="sm" className="mt-4">
                  <Link href={ROUTES.newGuideline(slug)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    New Guideline
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {guidelines.map((g) => {
                const statusBadge = STATUS_BADGE[g.status] ?? STATUS_BADGE.draft
                const catLabel = GUIDELINE_CATEGORIES.find((c) => c.value === g.category)?.label ?? g.category
                const minEditLabel = MIN_EDIT_LABELS[g.min_edit_clinical_role] ?? g.min_edit_clinical_role
                const isRestricted = g.min_edit_clinical_role !== 'any_editor'
                return (
                  <Link
                    key={g.id}
                    href={ROUTES.guidelineDetail(slug, g.id)}
                    className="block border border-border rounded-lg p-4 hover:shadow-sm hover:border-primary/40 transition-all bg-card group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2 flex-1">
                        {g.title}
                      </h3>
                      <Badge variant={statusBadge.variant} className="shrink-0 text-[10px]">
                        {statusBadge.label}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {catLabel}
                      </Badge>
                      {g.specialty && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {g.specialty}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>v{g.version} · Updated {new Date(g.updated_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-0.5">
                        {isRestricted ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <LockOpen className="h-3 w-3" />
                        )}
                        {minEditLabel}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {page > 1 && (
                <Link
                  href={`?${new URLSearchParams({ ...sp as Record<string, string>, page: String(page - 1) })}`}
                  className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted"
                >
                  Previous
                </Link>
              )}
              <span className="px-3 py-1.5 text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`?${new URLSearchParams({ ...sp as Record<string, string>, page: String(page + 1) })}`}
                  className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
