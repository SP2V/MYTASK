import { useQuery } from '@tanstack/react-query'
import { isGoogleCalendarConnected } from '@/features/settings/services/google-calendar-repository'

export const googleCalendarQueryKey = ['google-calendar-connected'] as const

export function useGoogleCalendarConnected(): boolean {
  const { data } = useQuery({
    queryKey: googleCalendarQueryKey,
    queryFn: isGoogleCalendarConnected,
  })
  return data ?? false
}
