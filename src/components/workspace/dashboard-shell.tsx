'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { MobileHeader } from './mobile-header'
import type { WorkspaceRow, WorkspaceRole, Profile } from '@/types'

interface Props {
  children: React.ReactNode
  workspace: WorkspaceRow
  role: WorkspaceRole
  profile: Profile
  allWorkspaces: Pick<WorkspaceRow, 'id' | 'name' | 'slug' | 'logo_url'>[]
  currentMemberships: { workspace_id: string; role: WorkspaceRole }[]
}

export function DashboardShell({
  children,
  workspace,
  role,
  profile,
  allWorkspaces,
  currentMemberships,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar
        workspace={workspace}
        role={role}
        profile={profile}
        allWorkspaces={allWorkspaces}
        currentMemberships={currentMemberships}
        className="hidden md:flex"
      />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 md:hidden transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          workspace={workspace}
          role={role}
          profile={profile}
          allWorkspaces={allWorkspaces}
          currentMemberships={currentMemberships}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <MobileHeader
          workspace={workspace}
          onMenuClick={() => setSidebarOpen(true)}
          className="md:hidden"
        />

        {/* Page content — each page handles its own layout/padding */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {children}
        </main>
      </div>
    </div>
  )
}
