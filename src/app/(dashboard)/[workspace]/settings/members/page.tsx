'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Loader2,
  UserPlus,
  MoreHorizontal,
  Shield,
  Trash2,
  Mail,
  XCircle,
  Check,
  X,
  Inbox,
} from 'lucide-react'
import { useWorkspace } from '@/contexts/workspace-context'
import {
  getMembersAction,
  getInvitationsAction,
  updateMemberRoleAction,
  removeMemberAction,
  inviteMemberAction,
  revokeInvitationAction,
} from '../actions'
import { getJoinRequestsAction, reviewJoinRequestAction } from '@/app/workspaces/actions'
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/config/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { WorkspaceMember, WorkspaceInvitationRow, WorkspaceRole } from '@/types'

type JoinRequest = Awaited<ReturnType<typeof getJoinRequestsAction>>[number]

const ROLES: WorkspaceRole[] = ['admin', 'editor', 'contributor', 'viewer']

export default function MembersSettingsPage() {
  const params = useParams()
  const slug = params.workspace as string
  const { workspace, role, profile } = useWorkspace()
  const isAdmin = role === 'admin'

  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [invitations, setInvitations] = useState<WorkspaceInvitationRow[]>([])
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('contributor')

  const loadData = useCallback(async () => {
    try {
      const [m, inv, reqs] = await Promise.all([
        getMembersAction(workspace.id),
        isAdmin ? getInvitationsAction(workspace.id) : Promise.resolve([]),
        isAdmin ? getJoinRequestsAction(workspace.id) : Promise.resolve([]),
      ])
      setMembers(m)
      setInvitations(inv)
      setJoinRequests(reqs)
    } finally {
      setLoading(false)
    }
  }, [workspace.id, isAdmin])

  useEffect(() => {
    loadData()
  }, [loadData])

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    const fd = new FormData()
    fd.set('email', inviteEmail)
    fd.set('role', inviteRole)

    startTransition(async () => {
      const result = await inviteMemberAction(workspace.id, slug, fd)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: `Invitation sent to ${inviteEmail}` })
        setInviteEmail('')
        setInviteRole('contributor')
        setInviteOpen(false)
        loadData()
      }
    })
  }

  function handleRoleChange(userId: string, newRole: WorkspaceRole) {
    setMessage(null)
    startTransition(async () => {
      const result = await updateMemberRoleAction(workspace.id, slug, userId, newRole)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMembers((prev) =>
          prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m))
        )
      }
    })
  }

  function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from this workspace?`)) return
    setMessage(null)
    startTransition(async () => {
      const result = await removeMemberAction(workspace.id, slug, userId)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMembers((prev) => prev.filter((m) => m.user_id !== userId))
        setMessage({ type: 'success', text: `${name} has been removed.` })
      }
    })
  }

  function handleRevokeInvite(invitationId: string) {
    setMessage(null)
    startTransition(async () => {
      const result = await revokeInvitationAction(workspace.id, slug, invitationId)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setInvitations((prev) => prev.filter((i) => i.id !== invitationId))
      }
    })
  }

  function handleReviewRequest(requestId: string, decision: 'approved' | 'rejected', role: WorkspaceRole = 'viewer') {
    setMessage(null)
    startTransition(async () => {
      const result = await reviewJoinRequestAction(workspace.id, slug, requestId, decision, role)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setJoinRequests((prev) => prev.filter((r) => r.id !== requestId))
        setMessage({
          type: 'success',
          text: decision === 'approved' ? 'Member added to workspace.' : 'Request rejected.',
        })
        if (decision === 'approved') loadData() // Refresh member list
      }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Members</h2>
          <p className="text-sm text-muted-foreground">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>

        {isAdmin && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4" />
                Invite member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a new member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email address</label>
                  <Input
                    type="email"
                    placeholder="colleague@hospital.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as WorkspaceRole)}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          <div>
                            <div className="font-medium">{ROLE_LABELS[r]}</div>
                            <div className="text-xs text-muted-foreground">
                              {ROLE_DESCRIPTIONS[r]}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInviteOpen(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send invitation
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Members list */}
      <Card>
        <div className="divide-y divide-border">
          {members.map((member) => {
            const displayName = member.profile.full_name || member.profile.email
            const isSelf = member.user_id === profile.id
            return (
              <div
                key={member.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">
                    {getInitials(member.profile.full_name, member.profile.email)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    {isSelf && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        You
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.profile.email}
                    {member.profile.specialty && ` · ${member.profile.specialty}`}
                  </p>
                </div>

                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {ROLE_LABELS[member.role] ?? member.role}
                </Badge>

                {isAdmin && !isSelf && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {ROLES.filter((r) => r !== member.role).map((r) => (
                        <DropdownMenuItem
                          key={r}
                          onClick={() => handleRoleChange(member.user_id, r)}
                        >
                          <Shield className="h-3.5 w-3.5 mr-2" />
                          Change to {ROLE_LABELS[r]}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleRemove(member.user_id, displayName)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Remove from workspace
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Pending invitations */}
      {isAdmin && invitations.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-3">
              Pending invitations ({invitations.length})
            </h3>
            <Card>
              <div className="divide-y divide-border">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited as {ROLE_LABELS[inv.role]}
                        {inv.expires_at && ` · Expires ${new Date(inv.expires_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs text-amber-600">
                      Pending
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRevokeInvite(inv.id)}
                      disabled={isPending}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Join requests */}
      {isAdmin && (
        <>
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold">Join requests</h3>
              {joinRequests.length > 0 && (
                <Badge className="text-[10px] h-4 px-1.5 bg-primary text-primary-foreground">
                  {joinRequests.length}
                </Badge>
              )}
            </div>

            {joinRequests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <Inbox className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No pending join requests</p>
              </div>
            ) : (
              <Card>
                <div className="divide-y divide-border">
                  {joinRequests.map((req) => {
                    const name = req.profile.full_name ?? req.profile.email
                    const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                    return (
                      <div key={req.id} className="px-4 py-4 space-y-3">
                        {/* User info */}
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {req.profile.email}
                              {req.profile.specialty && ` · ${req.profile.specialty}`}
                              {req.profile.clinical_role && ` · ${req.profile.clinical_role.replace('_', ' ')}`}
                            </p>
                          </div>
                          <p className="text-[10px] text-muted-foreground shrink-0 hidden sm:block">
                            {new Date(req.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        {/* Optional message */}
                        {req.message && (
                          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 leading-relaxed">
                            &ldquo;{req.message}&rdquo;
                          </p>
                        )}

                        {/* Approve / Reject */}
                        <div className="flex items-center gap-2">
                          <ApproveButton
                            requestId={req.id}
                            disabled={isPending}
                            onApprove={(role) => handleReviewRequest(req.id, 'approved', role)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={isPending}
                            onClick={() => handleReviewRequest(req.id, 'rejected')}
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Approve button with role selection ────────────────────────────────────
// Keeps local role state so the Select and Approve button stay in sync.

function ApproveButton({
  requestId,
  disabled,
  onApprove,
}: {
  requestId: string
  disabled: boolean
  onApprove: (role: WorkspaceRole) => void
}) {
  const [role, setRole] = useState<WorkspaceRole>('viewer')

  return (
    <div className="flex items-center gap-2 flex-1">
      <Select value={role} onValueChange={(v) => setRole(v as WorkspaceRole)}>
        <SelectTrigger className="h-8 text-xs w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(ROLES as WorkspaceRole[]).map((r) => (
            <SelectItem key={r} value={r} className="text-xs">
              {ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        className="h-8 px-3 text-xs"
        disabled={disabled}
        onClick={() => onApprove(role)}
      >
        <Check className="h-3.5 w-3.5 mr-1" /> Approve
      </Button>
    </div>
  )
}
