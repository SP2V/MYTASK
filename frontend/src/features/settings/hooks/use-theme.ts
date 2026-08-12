import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSettings, settingsQueryKey } from '@/features/settings/hooks/use-settings'
import { settingsRepository } from '@/features/settings/services/settings-repository'
import type { Theme } from '@/features/settings/schemas/settings.schema'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const settings = useSettings()
  const queryClient = useQueryClient()
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setSystemTheme(media.matches ? 'dark' : 'light')
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  const resolvedTheme: 'light' | 'dark' =
    settings.theme === 'SYSTEM' ? systemTheme : settings.theme === 'DARK' ? 'dark' : 'light'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
  }, [resolvedTheme])

  const setTheme = (theme: Theme) => {
    void settingsRepository
      .updateSettings({ theme })
      .then(() => queryClient.invalidateQueries({ queryKey: settingsQueryKey }))
  }

  return { theme: settings.theme, resolvedTheme, setTheme }
}
