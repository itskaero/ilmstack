'use client'

import { useState, useTransition, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  Search, X, Building2, CheckCircle2, Clock,
  ChevronRight, Loader2, SendHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { applyForWorkspaceAction, withdrawJoinRequestAction } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────

export interface BrowseWorkspace {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  primary_color: string
  specialties: string[]
}

export type RequestStatus = 'none' | 'pending' | 'approved' | 'rejected'

export interface BrowseClientProps {
  initialWorkspaces: BrowseWorkspace[]
  /** workspaceId → { status, requestId } for the current user */
  statusMap: Record<string, { status: RequestStatus; requestId: string }>
  /** workspace IDs the user is already a member of */
  memberIds: Set<string>
  initialQuery: string
  initialSpecialty: string
  allSpecialties: string[]
}

// ── Small helpers ─────────────────────────────────────────────────────────

const STATUS_LABELS: Record<RequestStatus, string> = {
  none: 'Request Access',
  pending: 'Request Sent',
  approved: 'Approved',
  rejected: 'Rejected',
}

// ── Workspace card ─────────────────────────────────────────────────────────

function WorkspaceCard({
  workspace,
  isMember,
  requestStatus,
  requestId,
  onApply,
  onWithdraw,
}: {
  workspace: BrowseWorkspace
  isMember: boolean
  requestStatus: RequestStatus
  requestId?: string
  onApply: (ws: BrowseWorkspace) => void
  onWithdraw: (requestId: string, workspaceId: string) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 hover:border-primary/30 hover:shadow-sm transition-all">
      {/* Header */}
      <div className="flex items-start gap-3">
        {workspace.logo_url ? (
          <Image
            src={workspace.logo_url}
            alt={workspace.name}
            width={44}
            height={44}
            className="h-11 w-11 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div
            className="h-11 w-11 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: workspace.primary_color }}
          >
            {workspace.name.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm leading-snug truncate">{workspace.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">@{workspace.slug}</p>
        </div>

        {/* Status badge */}
        {isMember && (
          <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Member
          </Badge>
        )}
        {!isMember && requestStatus === 'pending' && (
          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 shrink-0">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        )}
        {!isMember && requestStatus === 'approved' && (
          <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
          </Badge>
        )}
      </div>

      {/* Description */}
      {workspace.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {workspace.description}
        </p>
      )}

      {/* Specialties */}
      {workspace.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {workspace.specialties.slice(0, 4).map((s) => (
            <Badge key={s} variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
              {s}
            </Badge>
          ))}
          {workspace.specialties.length > 4 && (
            <span className="text-[10px] text-muted-foreground self-center">
              +{workspace.specialties.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Action */}
      <div className="mt-auto pt-1">
        {isMember ? (
          <Button variant="outline" size="sm" className="w-full text-xs" asChild>
            <a href={`/${workspace.slug}`}>
              Open workspace <ChevronRight className="h-3 w-3 ml-1" />
            </a>
          </Button>
        ) : requestStatus === 'pending' ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => requestId && onWithdraw(requestId, workspace.id)}
          >
            <X className="h-3 w-3 mr-1.5" /> Withdraw Request
          </Button>
        ) : requestStatus === 'approved' ? (
          <Button variant="outline" size="sm" className="w-full text-xs" asChild>
            <a href={`/${workspace.slug}`}>
              Open workspace <ChevronRight className="h-3 w-3 ml-1" />
            </a>
          </Button>
        ) : (
          <Button
            size="sm"
            className="w-full text-xs"
            onClick={() => onApply(workspace)}
            disabled={requestStatus === 'rejected'}
          >
            {requestStatus === 'rejected' ? 'Request Rejected' : (
              <><SendHorizontal className="h-3 w-3 mr-1.5" /> Request Access</>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Apply dialog ──────────────────────────────────────────────────────────

function ApplyDialog({
  workspace,
  onClose,
  onSuccess,
}: {
  workspace: BrowseWorkspace | null
  onClose: () => void
  onSuccess: (workspaceId: string, requestId: string) => void
}) {
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!workspace) return

    startTransition(async () => {
      const result = await applyForWorkspaceAction(workspace.id, message.trim() || undefined)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Request sent to ${workspace.name}`)
        onSuccess(workspace.id, result.requestId!)
        onClose()
        setMessage('')
      }
    })
  }

  return (
    <Dialog open={!!workspace} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Request access to {workspace?.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A workspace admin will review your request. Optionally introduce yourself.
          </p>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Message <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              placeholder="e.g. I'm a PGY-2 resident at Bahawalpur Victoria Hospital, looking to join for case discussions."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              className="resize-none text-sm"
            />
            <p className="text-[11px] text-muted-foreground text-right">{message.length}/500</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Send Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main browse client ────────────────────────────────────────────────────

export function BrowseClient({
  initialWorkspaces,
  statusMap: initialStatusMap,
  memberIds,
  initialQuery,
  initialSpecialty,
  allSpecialties,
}: BrowseClientProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [specialty, setSpecialty] = useState(initialSpecialty || 'all')
  const [applyTarget, setApplyTarget] = useState<BrowseWorkspace | null>(null)

  // Optimistic status map — updated client-side after apply/withdraw
  const [statusMap, setStatusMap] = useState(initialStatusMap)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Push URL params and let server re-render results
  const pushSearch = useCallback(
    (q: string, sp: string) => {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (sp && sp !== 'all') params.set('specialty', sp)
      const qs = params.toString()
      router.push(`/workspaces${qs ? `?${qs}` : ''}`)
    },
    [router]
  )

  function handleQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => pushSearch(value, specialty), 400)
  }

  function handleSpecialtyChange(value: string) {
    setSpecialty(value)
    pushSearch(query, value)
  }

  function handleClearQuery() {
    setQuery('')
    pushSearch('', specialty)
  }

  function handleApplySuccess(workspaceId: string, requestId: string) {
    setStatusMap((prev) => ({
      ...prev,
      [workspaceId]: { status: 'pending', requestId },
    }))
  }

  function handleWithdraw(requestId: string, workspaceId: string) {
    // Optimistic
    setStatusMap((prev) => {
      const next = { ...prev }
      delete next[workspaceId]
      return next
    })

    withdrawJoinRequestAction(requestId).then((result) => {
      if (result.error) {
        toast.error(result.error)
        // Revert optimistic update
        setStatusMap((prev) => ({
          ...prev,
          [workspaceId]: { status: 'pending', requestId },
        }))
      } else {
        toast.success('Request withdrawn.')
      }
    })
  }

  const visible = initialWorkspaces // Already filtered server-side

  return (
    <>
      {/* ── Search + filter bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search by hospital, clinic, or identifier…"
            className="pl-9 pr-9"
          />
          {query && (
            <button
              onClick={handleClearQuery}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={specialty} onValueChange={handleSpecialtyChange}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="All specialties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All specialties</SelectItem>
            {allSpecialties.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Results ── */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No workspaces found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a different search term or specialty filter.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {visible.length} workspace{visible.length !== 1 ? 's' : ''}
            {query && <span> matching &ldquo;{query}&rdquo;</span>}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((ws) => {
              const entry = statusMap[ws.id]
              return (
                <WorkspaceCard
                  key={ws.id}
                  workspace={ws}
                  isMember={memberIds.has(ws.id)}
                  requestStatus={entry?.status ?? 'none'}
                  requestId={entry?.requestId}
                  onApply={setApplyTarget}
                  onWithdraw={handleWithdraw}
                />
              )
            })}
          </div>
        </>
      )}

      {/* ── Apply dialog ── */}
      <ApplyDialog
        workspace={applyTarget}
        onClose={() => setApplyTarget(null)}
        onSuccess={handleApplySuccess}
      />
    </>
  )
}
