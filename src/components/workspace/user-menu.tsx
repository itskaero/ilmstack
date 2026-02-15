'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, Settings, Moon, Sun, Laptop } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { logoutAction } from '@/app/(auth)/actions'
import { initials, truncate } from '@/lib/utils'
import { ROLE_LABELS } from '@/config/app'
import type { Profile, WorkspaceRole } from '@/types'

interface Props {
  profile: Profile
  role: WorkspaceRole
}

export function UserMenu({ profile, role }: Props) {
  const { setTheme } = useTheme()
  const [isPending, startTransition] = useTransition()

  const displayName = profile.full_name ?? profile.email
  const displayTitle = [profile.title, profile.specialty].filter(Boolean).join(' · ')

  function handleLogout() {
    startTransition(async () => {
      await logoutAction()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-left group">
          <Avatar className="w-7 h-7 flex-shrink-0">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">{truncate(displayName, 20)}</p>
            <p className="text-xs text-muted-foreground capitalize leading-tight">
              {ROLE_LABELS[role]}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-0.5">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            {displayTitle && (
              <p className="text-xs text-muted-foreground truncate">{displayTitle}</p>
            )}
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="gap-2 cursor-pointer">
          <User className="w-4 h-4" />
          Profile
        </DropdownMenuItem>

        {/* Theme submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <Sun className="w-4 h-4" />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onClick={() => setTheme('light')}
            >
              <Sun className="w-4 h-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onClick={() => setTheme('dark')}
            >
              <Moon className="w-4 h-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onClick={() => setTheme('system')}
            >
              <Laptop className="w-4 h-4" />
              System
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          onClick={handleLogout}
          disabled={isPending}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
