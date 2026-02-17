'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { FileText, Stethoscope, Calendar, Pencil, Save, X, Building2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { initials } from '@/lib/utils'
import { ROUTES, ROLE_LABELS, NOTE_STATUS_LABELS, CASE_STATUS_LABELS } from '@/config/app'
import { updateProfileAction } from '../actions'
import type { Profile } from '@/types'
import type { WorkspaceContributions } from './page'

interface ProfileClientProps {
  profile: Profile
  isOwnProfile: boolean
  contributions: WorkspaceContributions[]
  currentWorkspaceSlug: string
}

export function ProfileClient({
  profile,
  isOwnProfile,
  contributions,
  currentWorkspaceSlug,
}: ProfileClientProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedWsId, setSelectedWsId] = useState<string | 'all'>('all')

  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [title, setTitle] = useState(profile.title ?? '')
  const [specialty, setSpecialty] = useState(profile.specialty ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')

  const displayName = profile.full_name ?? profile.email

  // Aggregate stats
  const totals = useMemo(() => {
    const filtered = selectedWsId === 'all' ? contributions : contributions.filter((c) => c.workspaceId === selectedWsId)
    return {
      notes: filtered.reduce((sum, c) => sum + c.totalNotes, 0),
      cases: filtered.reduce((sum, c) => sum + c.totalCases, 0),
    }
  }, [contributions, selectedWsId])

  const visibleContributions = useMemo(() => {
    if (selectedWsId === 'all') return contributions
    return contributions.filter((c) => c.workspaceId === selectedWsId)
  }, [contributions, selectedWsId])

  function handleSave() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('full_name', fullName)
      fd.set('title', title)
      fd.set('specialty', specialty)
      fd.set('bio', bio)
      fd.set('slug', currentWorkspaceSlug)
      const result = await updateProfileAction(fd)
      if (result.success) setIsEditing(false)
    })
  }

  function handleCancel() {
    setFullName(profile.full_name ?? '')
    setTitle(profile.title ?? '')
    setSpecialty(profile.specialty ?? '')
    setBio(profile.bio ?? '')
    setIsEditing(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Profile Header */}
      <div className="flex items-start gap-5">
        <Avatar className="w-20 h-20 flex-shrink-0">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
          <AvatarFallback className="text-xl bg-primary/10 text-primary">
            {initials(displayName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Full Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm" placeholder="e.g. Senior Registrar" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Specialty</Label>
                <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="h-8 text-sm" placeholder="e.g. Paediatrics" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bio</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="text-sm resize-none" placeholder="Short bio..." />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={isPending} className="h-7 text-xs gap-1">
                  <Save className="h-3 w-3" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isPending} className="h-7 text-xs gap-1">
                  <X className="h-3 w-3" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold truncate">{displayName}</h1>
                {isOwnProfile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-7 text-xs gap-1 ml-auto"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                )}
              </div>
              {(profile.title || profile.specialty) && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {[profile.title, profile.specialty].filter(Boolean).join(' · ')}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{profile.email}</p>
              {profile.bio && (
                <p className="text-sm mt-2 text-muted-foreground">{profile.bio}</p>
              )}
              {/* Workspace badges */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {contributions.map((c) => (
                  <Badge key={c.workspaceId} variant="secondary" className="text-[10px]">
                    {c.workspaceName} · {ROLE_LABELS[c.role]}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Workspace Selector */}
      {contributions.length > 1 && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setSelectedWsId('all')}
              className={`px-3 py-1.5 font-medium transition-colors ${
                selectedWsId === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground'
              }`}
            >
              All Workspaces
            </button>
            {contributions.map((c) => (
              <button
                key={c.workspaceId}
                type="button"
                onClick={() => setSelectedWsId(c.workspaceId)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  selectedWsId === c.workspaceId
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                }`}
              >
                {c.workspaceName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={FileText} label="Notes" value={totals.notes} />
        <StatCard icon={Stethoscope} label="Cases" value={totals.cases} />
        <StatCard icon={Calendar} label="Joined" value={new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} />
      </div>

      {/* Contributions per workspace */}
      {visibleContributions.map((c) => (
        <div key={c.workspaceId} className="space-y-4">
          {selectedWsId === 'all' && contributions.length > 1 && (
            <div className="flex items-center gap-2 pt-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.workspaceName}</h3>
              <Badge variant="outline" className="text-[10px]">{ROLE_LABELS[c.role]}</Badge>
            </div>
          )}

          {/* Notes */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Notes ({c.totalNotes})</h2>
              {c.totalNotes > 5 && (
                <Link href={`${ROUTES.notes(c.workspaceSlug)}?author=${profile.id}`} className="text-xs text-primary hover:underline">
                  View all
                </Link>
              )}
            </div>
            {c.recentNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">No notes yet.</p>
            ) : (
              <div className="space-y-1">
                {c.recentNotes.map((note) => (
                  <Link
                    key={note.id}
                    href={ROUTES.noteDetail(c.workspaceSlug, note.id)}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {note.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {note.topic?.name ?? 'No topic'} · {new Date(note.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">
                      {NOTE_STATUS_LABELS[note.status] ?? note.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Cases */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Cases ({c.totalCases})</h2>
              {c.totalCases > 5 && (
                <Link href={`${ROUTES.cases(c.workspaceSlug)}?author=${profile.id}`} className="text-xs text-primary hover:underline">
                  View all
                </Link>
              )}
            </div>
            {c.recentCases.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">No cases yet.</p>
            ) : (
              <div className="space-y-1">
                {c.recentCases.map((cs) => (
                  <Link
                    key={cs.id}
                    href={ROUTES.caseDetail(c.workspaceSlug, cs.id)}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {cs.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cs.specialty ?? 'General'} · {cs.diagnosis ?? 'Undiagnosed'} · {new Date(cs.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">
                      {CASE_STATUS_LABELS[cs.status] ?? cs.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      ))}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="border border-border rounded-lg p-3 text-center">
      <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
