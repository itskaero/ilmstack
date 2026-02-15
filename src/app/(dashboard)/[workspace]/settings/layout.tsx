'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { Settings, Users, Palette, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/config/app'
import { useWorkspace } from '@/contexts/workspace-context'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const params = useParams()
  const slug = params.workspace as string
  const { role } = useWorkspace()

  const navItems: NavItem[] = [
    { label: 'General', href: ROUTES.settings(slug), icon: Settings },
    { label: 'Members', href: ROUTES.settingsMembers(slug), icon: Users },
    { label: 'Branding', href: ROUTES.settingsBranding(slug), icon: Palette },
    { label: 'Audit Log', href: ROUTES.settingsAudit(slug), icon: Shield, adminOnly: true },
  ]

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || role === 'admin'
  )

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your workspace configuration
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Side nav */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:w-48 flex-shrink-0">
          {filteredItems.map((item) => {
            const active =
              item.href === ROUTES.settings(slug)
                ? pathname === item.href
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
