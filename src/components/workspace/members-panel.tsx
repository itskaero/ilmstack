import { formatDistanceToNow } from 'date-fns'
import { Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS } from '@/config/app'
import type { MemberStat } from '@/app/(dashboard)/[workspace]/members-panel-action'
import type { WorkspaceRole } from '@/types/database'

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  admin:       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  editor:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  contributor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  viewer:      'bg-muted text-muted-foreground',
}

interface Props {
  members: MemberStat[]
}

export function MembersPanel({ members }: Props) {
  return (
    <aside className="hidden 2xl:flex w-56 shrink-0 flex-col border-l border-border bg-card h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Team
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">{members.length}</span>
      </div>

      {/* Member list */}
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {members.map((m) => {
          const displayName = m.full_name ?? m.email.split('@')[0]
          const initials = displayName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)

          const lastSeen = m.last_activity
            ? formatDistanceToNow(new Date(m.last_activity), { addSuffix: true })
            : null

          return (
            <div key={m.user_id} className="px-3 py-3 space-y-1.5">
              {/* Avatar + name */}
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-tight truncate">{displayName}</p>
                  {m.specialty && (
                    <p className="text-[10px] text-muted-foreground truncate">{m.specialty}</p>
                  )}
                </div>
              </div>

              {/* Role badge */}
              <Badge className={`text-[10px] h-4 px-1.5 font-medium ${ROLE_COLORS[m.role]}`}>
                {ROLE_LABELS[m.role]}
              </Badge>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-x-2 text-[10px] text-muted-foreground">
                <span>Cases: <span className="font-medium text-foreground">{m.cases_added}</span></span>
                <span>Notes: <span className="font-medium text-foreground">{m.notes_added}</span></span>
              </div>

              {lastSeen && (
                <p className="text-[10px] text-muted-foreground">Active {lastSeen}</p>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
