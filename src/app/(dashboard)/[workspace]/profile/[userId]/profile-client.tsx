'use client'

import { useState, useTransition, useMemo, useRef } from 'react'
import Link from 'next/link'
import { FileText, Stethoscope, Calendar, Pencil, Save, X, Building2, Camera, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { initials } from '@/lib/utils'
import { ROUTES, ROLE_LABELS, NOTE_STATUS_LABELS, CASE_STATUS_LABELS, CLINICAL_ROLES, RESIDENT_YEARS } from '@/config/app'
import { updateProfileAction, uploadAvatarAction } from '../actions'
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [title, setTitle] = useState(profile.title ?? '')
  const [specialty, setSpecialty] = useState(profile.specialty ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [clinicalRole, setClinicalRole] = useState<string>(profile.clinical_role ?? 'other')
  const [residentYear, setResidentYear] = useState<string>(profile.resident_year ? String(profile.resident_year) : '')

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

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingAvatar(true)
    const fd = new FormData()
    fd.set('avatar', file)
    fd.set('slug', currentWorkspaceSlug)
    const result = await uploadAvatarAction(fd)
    if (result.url) setAvatarUrl(result.url)
    setIsUploadingAvatar(false)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  function handleSave() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('full_name', fullName)
      fd.set('title', title)
      fd.set('specialty', specialty)
      fd.set('bio', bio)
      fd.set('clinical_role', clinicalRole)
      if (clinicalRole === 'resident' && residentYear) fd.set('resident_year', residentYear)
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
    setClinicalRole(profile.clinical_role ?? 'other')
    setResidentYear(profile.resident_year ? String(profile.resident_year) : '')
    setIsEditing(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Profile Header */}
      <div className="flex items-start gap-5">
        {isOwnProfile ? (
          <label className="relative w-20 h-20 flex-shrink-0 cursor-pointer group">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleAvatarChange}
              disabled={isUploadingAvatar}
            />
            <Avatar className="w-20 h-20">
              <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {isUploadingAvatar ? <Loader2 className="h-6 w-6 animate-spin" /> : initials(displayName)}
              </AvatarFallback>
            </Avatar>
            {!isUploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </div>
            )}
          </label>
        ) : (
          <Avatar className="w-20 h-20 flex-shrink-0">
            <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
            <AvatarFallback className="text-xl bg-primary/10 text-primary">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
        )}

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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Clinical Role</Label>
                  <Select value={clinicalRole} onValueChange={setClinicalRole}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLINICAL_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {clinicalRole === 'resident' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Resident Year</Label>
                    <Select value={residentYear} onValueChange={setResidentYear}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {RESIDENT_YEARS.map((y) => (
                          <SelectItem key={y} value={String(y)}>R{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
              {profile.clinical_role && profile.clinical_role !== 'other' && (
                <div className="mt-1">
                  <Badge variant="secondary" className="text-[11px]">
                    {CLINICAL_ROLES.find((r) => r.value === profile.clinical_role)?.label ?? profile.clinical_role}
                    {profile.clinical_role === 'resident' && profile.resident_year ? ` · R${profile.resident_year}` : ''}
                  </Badge>
                </div>
              )}
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
