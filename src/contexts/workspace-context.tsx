'use client'

// ============================================================
// ILMSTACK HEALTH — Workspace Context
// Provides current workspace + user role to all client components.
// Server Components fetch data directly; this bridges the gap.
// ============================================================

import { createContext, useContext } from 'react'
import type { WorkspaceRow, WorkspaceRole, Profile } from '@/types'

export interface WorkspaceContextValue {
  workspace: WorkspaceRow
  role: WorkspaceRole
  profile: Profile
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: WorkspaceContextValue
}) {
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return ctx
}

// Convenience selectors
export function useIsAdmin() {
  const { role } = useWorkspace()
  return role === 'admin'
}

export function useIsEditor() {
  const { role } = useWorkspace()
  return role === 'admin' || role === 'editor'
}

export function useIsContributor() {
  const { role } = useWorkspace()
  return role === 'admin' || role === 'editor' || role === 'contributor'
}

export function useCanPublish() {
  const { role } = useWorkspace()
  return role === 'admin' || role === 'editor'
}
