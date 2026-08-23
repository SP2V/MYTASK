import type { Settings } from '@/features/settings/schemas/settings.schema'

export interface SettingsRow {
  id: string
  theme: Settings['theme']
  default_priority: Settings['defaultPriority']
  default_category_id: string | null
  week_starts_on: number
  date_format: Settings['dateFormat']
  time_format: Settings['timeFormat']
}

export function rowToSettings(row: SettingsRow): Settings {
  return {
    theme: row.theme,
    defaultPriority: row.default_priority,
    defaultCategoryId: row.default_category_id,
    weekStartsOn: row.week_starts_on,
    dateFormat: row.date_format,
    timeFormat: row.time_format,
  }
}

export function settingsToRow(settings: Settings): Omit<SettingsRow, 'id'> {
  return {
    theme: settings.theme,
    default_priority: settings.defaultPriority,
    default_category_id: settings.defaultCategoryId,
    week_starts_on: settings.weekStartsOn,
    date_format: settings.dateFormat,
    time_format: settings.timeFormat,
  }
}
