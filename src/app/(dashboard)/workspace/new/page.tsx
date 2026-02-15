import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewWorkspaceForm } from './new-workspace-form'

export default async function NewWorkspacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">IH</span>
          </div>
          <span className="font-semibold text-lg">IlmStack Health</span>
        </div>

        <div className="space-y-2 mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Create your workspace</h1>
          <p className="text-muted-foreground">
            A workspace is your hospital or department&apos;s private knowledge hub.
          </p>
        </div>

        <NewWorkspaceForm userId={user.id} />
      </div>
    </div>
  )
}
