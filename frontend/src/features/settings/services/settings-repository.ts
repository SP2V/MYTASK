import { supabase } from '@/lib/supabase-client'
import { getCurrentUserId } from '@/features/auth/services/auth-service'
import {
  settingsSchema,
  settingsUpdateSchema,
  type Settings,
  type SettingsUpdateInput,
} from '@/features/settings/schemas/settings.schema'
import { rowToSettings, settingsToRow, type SettingsRow } from '@/features/settings/services/settings-mapper'

const TABLE = 'settings'

export class SettingsRepository {
  /** Select-or-insert-default so the app works before the new-user seeding trigger has run. */
  async getSettings(): Promise<Settings> {
    const userId = await getCurrentUserId()
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', userId).maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return settingsSchema.parse(rowToSettings(data as SettingsRow))

    const defaults = settingsSchema.parse({})
    const { data: inserted, error: insertError } = await supabase
      .from(TABLE)
      .insert({ id: userId, ...settingsToRow(defaults) })
      .select()
      .single()
    if (insertError) throw new Error(insertError.message)
    return settingsSchema.parse(rowToSettings(inserted as SettingsRow))
  }

  async updateSettings(input: SettingsUpdateInput): Promise<Settings> {
    const userId = await getCurrentUserId()
    const existing = await this.getSettings()
    const parsedInput = settingsUpdateSchema.parse(input)
    const updated = settingsSchema.parse({ ...existing, ...parsedInput })
    const { data, error } = await supabase
      .from(TABLE)
      .update(settingsToRow(updated))
      .eq('id', userId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return settingsSchema.parse(rowToSettings(data as SettingsRow))
  }

  async replace(settings: Settings): Promise<void> {
    const userId = await getCurrentUserId()
    const validated = settingsSchema.parse(settings)
    const { error } = await supabase
      .from(TABLE)
      .upsert({ id: userId, ...settingsToRow(validated) }, { onConflict: 'id' })
    if (error) throw new Error(error.message)
  }

  async resetToDefaults(): Promise<Settings> {
    const userId = await getCurrentUserId()
    const defaults = settingsSchema.parse({})
    const { error } = await supabase
      .from(TABLE)
      .upsert({ id: userId, ...settingsToRow(defaults) }, { onConflict: 'id' })
    if (error) throw new Error(error.message)
    return defaults
  }
}

export const settingsRepository = new SettingsRepository()
