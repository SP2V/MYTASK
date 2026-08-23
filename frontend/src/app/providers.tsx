import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/features/auth/hooks/use-auth'
import { SearchProvider } from '@/features/tasks/hooks/search-context'
import { TaskDialogProvider } from '@/features/tasks/components/task-dialog-provider'
import { useReminderScheduler } from '@/features/notifications/hooks/use-reminder-scheduler'
import { Toaster } from '@/components/ui/sonner'

function AppEffects() {
  const { user } = useAuth()
  useReminderScheduler(!!user)
  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SearchProvider>
          <TaskDialogProvider>
            <AppEffects />
            {children}
            <Toaster />
          </TaskDialogProvider>
        </SearchProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
