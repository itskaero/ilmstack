import { Suspense } from 'react'
import Link from 'next/link'
import { ClipboardCheck, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getMemberRole } from '@/services/workspace.service'
import { getReviewRequests, getMyAssignedReviews, getPendingReviews } from '@/services/review.service'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ReviewCard } from '@/components/review/review-card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReviewStatus } from '@/types/database'

interface PageProps {
  params: Promise<{ workspace: string }>
  searchParams: Promise<{ status?: string; tab?: string }>
}

export default async function ReviewPage({ params, searchParams }: PageProps) {
  const { workspace: slug } = await params
  const sp = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const workspace = await getWorkspaceBySlug(supabase, slug)
  if (!workspace) return null

  const role = await getMemberRole(supabase, workspace.id, user.id)
  if (!role) return null

  const tab = sp.tab ?? 'mine'
  const isAdminOrEditor = role === 'admin' || role === 'editor'

  const [mine, unassigned, all] = await Promise.all([
    getMyAssignedReviews(supabase, workspace.id, user.id),
    isAdminOrEditor ? getPendingReviews(supabase, workspace.id) : Promise.resolve([]),
    isAdminOrEditor
      ? getReviewRequests(supabase, workspace.id, {}).then((r) => r.requests)
      : Promise.resolve([]),
  ])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">Review Queue</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage clinical note peer reviews
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <Tabs defaultValue={tab}>
          <TabsList className="mb-4">
            <TabsTrigger value="mine" asChild>
              <Link href={`/${slug}/review?tab=mine`}>
                Assigned to me
                {mine.length > 0 && (
                  <Badge className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">
                    {mine.length}
                  </Badge>
                )}
              </Link>
            </TabsTrigger>
            {isAdminOrEditor && (
              <>
                <TabsTrigger value="unassigned" asChild>
                  <Link href={`/${slug}/review?tab=unassigned`}>
                    Unassigned
                    {unassigned.length > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-1.5 h-4 min-w-4 px-1 text-[10px]"
                      >
                        {unassigned.length}
                      </Badge>
                    )}
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="all" asChild>
                  <Link href={`/${slug}/review?tab=all`}>All reviews</Link>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Assigned to me */}
          <TabsContent value="mine">
            <ReviewList
              requests={mine}
              workspaceSlug={slug}
              currentUserId={user.id}
              emptyTitle="No reviews assigned to you"
              emptyDescription="When someone assigns you as a reviewer, they'll appear here."
            />
          </TabsContent>

          {/* Unassigned */}
          {isAdminOrEditor && (
            <TabsContent value="unassigned">
              {unassigned.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-amber-600 mb-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {unassigned.length} review{unassigned.length !== 1 ? 's' : ''} awaiting
                  assignment
                </div>
              )}
              <ReviewList
                requests={unassigned}
                workspaceSlug={slug}
                currentUserId={user.id}
                emptyTitle="No unassigned reviews"
                emptyDescription="All submitted notes have been assigned to reviewers."
              />
            </TabsContent>
          )}

          {/* All reviews */}
          {isAdminOrEditor && (
            <TabsContent value="all">
              <ReviewList
                requests={all}
                workspaceSlug={slug}
                currentUserId={user.id}
                emptyTitle="No reviews yet"
                emptyDescription="Reviews will appear here when notes are submitted for review."
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function ReviewList({
  requests,
  workspaceSlug,
  currentUserId,
  emptyTitle,
  emptyDescription,
}: {
  requests: Parameters<typeof ReviewCard>[0]['request'][]
  workspaceSlug: string
  currentUserId: string
  emptyTitle: string
  emptyDescription: string
}) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">{emptyTitle}</h3>
        <p className="text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {requests.map((r) => (
        <ReviewCard
          key={r.id}
          request={r}
          workspaceSlug={workspaceSlug}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
}
