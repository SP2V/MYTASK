import { supabase } from '@/lib/supabase-client'
import {
  settingsSchema,
  settingsUpdateSchema,
  type Settings,
  type SettingsUpdateInput,
} from '@/features/settings/schemas/settings.schema'
import { rowToSettings, settingsToRow, type SettingsRow } from '@/features/settings/services/settings-mapper'

const TABLE = 'settings'
const SETTINGS_ID = 'app-settings' as const

export class SettingsRepository {
  /** Select-or-insert-default so a fresh Supabase project works without manual seeding. */
  async getSettings(): Promise<Settings> {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', SETTINGS_ID).maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return settingsSchema.parse(rowToSettings(data as SettingsRow))

    const defaults = settingsSchema.parse({})
    const { data: inserted, error: insertError } = await supabase
      .from(TABLE)
      .insert(settingsToRow(defaults))
      .select()
      .single()
    if (insertError) throw new Error(insertError.message)
    return settingsSchema.parse(rowToSettings(inserted as SettingsRow))
  }

  async updateSettings(input: SettingsUpdateInput): Promise<Settings> {
    const existing = await this.getSettings()
    const parsedInput = settingsUpdateSchema.parse(input)
    const updated = settingsSchema.parse({ ...existing, ...parsedInput })
    const { data, error } = await supabase
      .from(TABLE)
      .update(settingsToRow(updated))
      .eq('id', SETTINGS_ID)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return settingsSchema.parse(rowToSettings(data as SettingsRow))
  }

  async replace(settings: Settings): Promise<void> {
    const validated = settingsSchema.parse(settings)
    const { error } = await supabase
      .from(TABLE)
      .upsert(settingsToRow(validated), { onConflict: 'id' })
    if (error) throw new Error(error.message)
  }

  async resetToDefaults(): Promise<Settings> {
    const defaults = settingsSchema.parse({})
    const { error } = await supabase
      .from(TABLE)
      .upsert(settingsToRow(defaults), { onConflict: 'id' })
    if (error) throw new Error(error.message)
    return defaults
  }
}

export const settingsRepository = new SettingsRepository()
