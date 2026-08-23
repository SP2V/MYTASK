import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/features/auth/hooks/use-auth'
import { SearchProvider } from '@/features/tasks/hooks/search-context'
import { TaskDialogProvider } from '@/features/tasks/components/task-dialog-provider'
import { Toaster } from '@/components/ui/sonner'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SearchProvider>
          <TaskDialogProvider>
            {children}
            <Toaster />
          </TaskDialogProvider>
        </SearchProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
