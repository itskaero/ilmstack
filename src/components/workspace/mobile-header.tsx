'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, truncate } from '@/lib/utils'
import type { WorkspaceRow } from '@/types'

interface Props {
  workspace: WorkspaceRow
  onMenuClick: () => void
  className?: string
}

export function MobileHeader({ workspace, onMenuClick, className }: Props) {
  return (
    <header
      className={cn(
        'flex items-center gap-3 px-4 h-14 border-b border-border bg-card flex-shrink-0',
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Clinical Ledger logo */}
      <Link href="/home" className="flex items-center gap-1.5 shrink-0">
        <Image src="/logo.png" alt="Clinical Ledger" width={22} height={22} className="rounded-lg" />
        <span className="text-xs font-semibold text-muted-foreground tracking-wide hidden sm:inline">Clinical Ledger</span>
      </Link>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold"
          style={{ backgroundColor: workspace.primary_color ?? '#0ea5e9' }}
        >
          {workspace.name.charAt(0).toUpperCase()}
        </div>
        <span className="font-semibold text-sm truncate">
          {truncate(workspace.name, 28)}
        </span>
      </div>
    </header>
  )
}
