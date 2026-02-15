'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useWorkspace } from '@/contexts/workspace-context'
import { getAuditLogsAction, type AuditLogEntry } from '../actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

const LIMIT = 50

const ACTION_LABELS: Record<string, string> = {
  'workspace.updated': 'Updated workspace settings',
  'member.role_changed': 'Changed member role',
  'member.removed': 'Removed member',
  'member.invited': 'Invited member',
  'invitation.revoked': 'Revoked invitation',
  'note.created': 'Created note',
  'note.updated': 'Updated note',
  'note.deleted': 'Deleted note',
  'note.status_changed': 'Changed note status',
  'case.created': 'Created case',
  'case.updated': 'Updated case',
  'case.deleted': 'Deleted case',
  'review.created': 'Created review request',
  'review.completed': 'Completed review',
  'journal.created': 'Created journal',
  'journal.published': 'Published journal',
}

function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/[._]/g, ' ')
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitials(name: string | null, email: string) {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email[0].toUpperCase()
}

export default function AuditLogPage() {
  const { workspace } = useWorkspace()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const totalPages = Math.ceil(total / LIMIT)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getAuditLogsAction(workspace.id, page, LIMIT)
      setLogs(result.logs)
      setTotal(result.total)
    } finally {
      setLoading(false)
    }
  }, [workspace.id, page])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Audit Log</h2>
        <p className="text-sm text-muted-foreground">
          Track all actions performed in this workspace
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No audit events recorded yet.</p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <Avatar className="h-8 w-8 mt-0.5">
                    <AvatarFallback className="text-[10px]">
                      {log.actor
                        ? getInitials(log.actor.full_name, log.actor.email)
                        : '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">
                        {log.actor?.full_name || log.actor?.email || 'System'}
                      </span>{' '}
                      {formatAction(log.action)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.created_at)}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {log.resource_type}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {total} event{total !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
