'use client'

import { useRouter } from 'next/navigation'
import { Building2, ChevronsUpDown, Plus, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, truncate } from '@/lib/utils'
import { ROLE_LABELS } from '@/config/app'
import type { WorkspaceRow, WorkspaceRole } from '@/types'

interface Props {
  currentWorkspace: WorkspaceRow
  allWorkspaces: Pick<WorkspaceRow, 'id' | 'name' | 'slug' | 'logo_url'>[]
  memberships: { workspace_id: string; role: WorkspaceRole }[]
}

export function WorkspaceSwitcher({
  currentWorkspace,
  allWorkspaces,
  memberships,
}: Props) {
  const router = useRouter()

  const roleFor = (wsId: string): WorkspaceRole =>
    memberships.find((m) => m.workspace_id === wsId)?.role ?? 'viewer'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors w-full min-w-0 group">
          {/* Workspace icon */}
          <div
            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
            style={{ backgroundColor: currentWorkspace.primary_color ?? '#0ea5e9' }}
          >
            {currentWorkspace.name.charAt(0).toUpperCase()}
          </div>

          {/* Name */}
          <span className="text-sm font-semibold truncate min-w-0 flex-1 text-left">
            {truncate(currentWorkspace.name, 22)}
          </span>

          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-60 group-hover:opacity-100" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground pb-1">
          Your workspaces
        </DropdownMenuLabel>

        {allWorkspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push(`/${ws.slug}`)}
          >
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold"
              style={{ backgroundColor: currentWorkspace.primary_color ?? '#0ea5e9' }}
            >
              {ws.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{ws.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {ROLE_LABELS[roleFor(ws.id)]}
              </p>
            </div>
            {ws.id === currentWorkspace.id && (
              <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer text-muted-foreground"
          onClick={() => router.push('/workspace/new')}
        >
          <div className="w-5 h-5 rounded border-2 border-dashed border-border flex items-center justify-center flex-shrink-0">
            <Plus className="w-3 h-3" />
          </div>
          <span className="text-sm">Create workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
