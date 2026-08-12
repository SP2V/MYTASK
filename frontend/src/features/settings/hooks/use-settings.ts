import { useQuery } from '@tanstack/react-query'
import { settingsRepository } from '@/features/settings/services/settings-repository'
import { settingsSchema, type Settings } from '@/features/settings/schemas/settings.schema'

export const settingsQueryKey = ['settings'] as const

const DEFAULT_SETTINGS = settingsSchema.parse({})

/** Always returns a value — falls back to defaults while the initial fetch resolves. */
export function useSettings(): Settings {
  const { data } = useQuery({
    queryKey: settingsQueryKey,
    queryFn: () => settingsRepository.getSettings(),
  })
  return data ?? DEFAULT_SETTINGS
}
