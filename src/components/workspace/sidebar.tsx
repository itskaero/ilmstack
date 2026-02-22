'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  FileText,
  Stethoscope,
  ClipboardCheck,
  BookOpen,
  BookMarked,
  Settings,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/config/app'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { WorkspaceSwitcher } from './workspace-switcher'
import { UserMenu } from './user-menu'
import type { WorkspaceRow, WorkspaceRole, Profile } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

interface Props {
  workspace: WorkspaceRow
  role: WorkspaceRole
  profile: Profile
  allWorkspaces: Pick<WorkspaceRow, 'id' | 'name' | 'slug' | 'logo_url'>[]
  currentMemberships: { workspace_id: string; role: WorkspaceRole }[]
  className?: string
  onClose?: () => void
}

export function Sidebar({
  workspace,
  role,
  profile,
  allWorkspaces,
  currentMemberships,
  className,
  onClose,
}: Props) {
  const pathname = usePathname()
  const slug = workspace.slug

  const navItems: NavItem[] = [
    {
      label: 'Notes',
      href: ROUTES.notes(slug),
      icon: FileText,
    },
    {
      label: 'Cases',
      href: ROUTES.cases(slug),
      icon: Stethoscope,
    },
    {
      label: 'Guidelines',
      href: ROUTES.guidelines(slug),
      icon: BookMarked,
    },
    {
      label: 'Review',
      href: ROUTES.review(slug),
      icon: ClipboardCheck,
    },
    {
      label: 'Journal',
      href: ROUTES.journal(slug),
      icon: BookOpen,
    },
  ]

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <div
      className={cn(
        'flex-col w-60 border-r border-border bg-card h-full',
        className
      )}
    >
      {/* Branding */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <Link href="/home" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Clinical Ledger" width={24} height={24} className="rounded-lg" />
          <span className="text-xs font-semibold text-muted-foreground tracking-wide">Clinical Ledger</span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Workspace switcher */}
      <div className="px-3 pb-2 border-b border-border">
        <WorkspaceSwitcher
          currentWorkspace={workspace}
          allWorkspaces={allWorkspaces}
          memberships={currentMemberships}
        />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <item.icon
                  className={cn(
                    'w-4 h-4 flex-shrink-0',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                {item.label}
                {item.badge != null && item.badge > 0 && (
                  <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <Separator className="my-3" />

        {/* Settings */}
        {(role === 'admin' || role === 'editor') && (
          <nav>
            <Link
              href={ROUTES.settings(slug)}
              onClick={onClose}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors',
                isActive(ROUTES.settings(slug))
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Settings
                className={cn(
                  'w-4 h-4 flex-shrink-0',
                  isActive(ROUTES.settings(slug))
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              />
              Settings
            </Link>
          </nav>
        )}
      </ScrollArea>

      {/* User section */}
      <div className="border-t border-border p-2">
        <UserMenu profile={profile} role={role} workspaceSlug={workspace.slug} />
      </div>
    </div>
  )
}
