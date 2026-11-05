import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase-client'
import { saveGoogleCalendarTokenIfPresent } from '@/features/settings/services/google-calendar-repository'
import { googleCalendarQueryKey } from '@/features/settings/hooks/use-google-calendar'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, user: null, loading: true })
  const queryClient = useQueryClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, user: data.session?.user ?? null, loading: false })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ session, user: session?.user ?? null, loading: false })
      if (event === 'SIGNED_IN') {
        saveGoogleCalendarTokenIfPresent(session)
          .then((saved) => {
            if (saved) void queryClient.invalidateQueries({ queryKey: googleCalendarQueryKey })
          })
          .catch((error: unknown) => {
            console.error('Saving the Google Calendar connection failed', error)
            toast.error('Unable to finish connecting Google Calendar. Please try connecting again.')
          })
      }
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
