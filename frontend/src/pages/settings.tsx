import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Upload, Trash2, BellRing } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useSettings, settingsQueryKey } from '@/features/settings/hooks/use-settings'
import { useTheme } from '@/features/settings/hooks/use-theme'
import { useCategories, categoriesQueryKey } from '@/features/categories/hooks/use-categories'
import { tasksQueryKey } from '@/features/tasks/hooks/use-tasks'
import { settingsRepository } from '@/features/settings/services/settings-repository'
import { buildExportData, downloadExportFile, importFromFile, type ImportResult } from '@/features/settings/services/backup-service'
import { clearAllData } from '@/features/settings/services/clear-all-data'
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from '@/features/notifications/services/notification-service'
import type { Theme, DateFormatOption, TimeFormatOption } from '@/features/settings/schemas/settings.schema'
import type { TaskPriority } from '@/features/tasks/schemas/task.schema'

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function SettingsPage() {
  const settings = useSettings()
  const { theme, setTheme } = useTheme()
  const categories = useCategories()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [clearOpen, setClearOpen] = useState(false)
  const [importSummary, setImportSummary] = useState<ImportResult | null>(null)

  const update = async (patch: Parameters<typeof settingsRepository.updateSettings>[0]) => {
    try {
      await settingsRepository.updateSettings(patch)
      await queryClient.invalidateQueries({ queryKey: settingsQueryKey })
    } catch {
      toast.error('Unable to save settings. Please try again.')
    }
  }

  const handleExport = async () => {
    try {
      const data = await buildExportData()
      downloadExportFile(data)
      toast.success('Backup downloaded')
    } catch {
      toast.error('Unable to export data. Please try again.')
    }
  }

  const handleImportFile = async (file: File) => {
    const result = await importFromFile(file)
    setImportSummary(result)
    if (result.success) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
        queryClient.invalidateQueries({ queryKey: categoriesQueryKey }),
        queryClient.invalidateQueries({ queryKey: settingsQueryKey }),
      ])
      toast.success('Data imported successfully')
    } else {
      toast.error(result.error ?? 'The imported file is invalid.')
    }
  }

  const handleClearAll = async () => {
    try {
      await clearAllData()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
        queryClient.invalidateQueries({ queryKey: categoriesQueryKey }),
        queryClient.invalidateQueries({ queryKey: settingsQueryKey }),
      ])
      toast.success('All data cleared')
    } catch {
      toast.error('Unable to clear data. Please try again.')
    } finally {
      setClearOpen(false)
    }
  }

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission()
    if (permission === 'granted') {
      await update({ notificationsEnabled: true })
      toast.success('Notifications enabled')
    } else if (permission === 'unsupported') {
      toast.error('Notifications are not supported in this browser.')
    } else {
      toast.error('Notification permission was not granted.')
      await update({ notificationsEnabled: false })
    }
  }

  const notificationPermission = getNotificationPermission()

  return (
    <>
      <PageHeader title="Settings" />

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose how Personal Task Manager looks.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={theme}
              onValueChange={(v) => setTheme(v as Theme)}
              className="grid grid-cols-3 gap-3"
            >
              {(['SYSTEM', 'LIGHT', 'DARK'] as Theme[]).map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[[data-state=checked]]:border-primary"
                >
                  <RadioGroupItem value={option} id={`theme-${option}`} />
                  {option === 'SYSTEM' ? 'System' : option === 'LIGHT' ? 'Light' : 'Dark'}
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Defaults</CardTitle>
            <CardDescription>Applied automatically when creating a new task.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Default priority</Label>
              <Select
                value={settings.defaultPriority}
                onValueChange={(v) => update({ defaultPriority: v as TaskPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Default category</Label>
              <Select
                value={settings.defaultCategoryId ?? 'none'}
                onValueChange={(v) => update({ defaultCategoryId: v === 'none' ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Date &amp; Time</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Week starts on</Label>
              <Select
                value={String(settings.weekStartsOn)}
                onValueChange={(v) => update({ weekStartsOn: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_NAMES.map((name, index) => (
                    <SelectItem key={name} value={String(index)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Date format</Label>
              <Select
                value={settings.dateFormat}
                onValueChange={(v) => update({ dateFormat: v as DateFormatOption })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MDY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="DMY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="YMD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Time format</Label>
              <Select
                value={settings.timeFormat}
                onValueChange={(v) => update({ timeFormat: v as TimeFormatOption })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="H12">12-hour</SelectItem>
                  <SelectItem value="H24">24-hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Browser notifications only fire while this app tab is open and permission is
              granted — they are not guaranteed while offline or closed.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <BellRing className="size-4 text-muted-foreground" aria-hidden="true" />
              {!isNotificationSupported() && <span className="text-muted-foreground">Not supported in this browser</span>}
              {isNotificationSupported() && notificationPermission === 'denied' && (
                <span className="text-muted-foreground">Permission denied — enable it in browser settings</span>
              )}
              {isNotificationSupported() && notificationPermission !== 'denied' && (
                <span className="text-muted-foreground">
                  {settings.notificationsEnabled ? 'Enabled' : 'Disabled'}
                </span>
              )}
            </div>
            {isNotificationSupported() && notificationPermission !== 'denied' ? (
              <Switch
                checked={settings.notificationsEnabled}
                onCheckedChange={(checked) => (checked ? handleEnableNotifications() : update({ notificationsEnabled: false }))}
                aria-label="Toggle notifications"
              />
            ) : (
              <Switch checked={false} disabled aria-label="Notifications unavailable" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data</CardTitle>
            <CardDescription>Your data is stored in Supabase. Back it up regularly.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="size-4" />
              Export Data
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" />
              Import Data
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleImportFile(file)
                e.target.value = ''
              }}
            />
            <Button variant="destructive" className="ml-auto gap-2" onClick={() => setClearOpen(true)}>
              <Trash2 className="size-4" />
              Clear All Data
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear all data?"
        description="This permanently deletes every task, category, and setting stored in Supabase. This cannot be undone."
        confirmLabel="Clear Everything"
        onConfirm={handleClearAll}
      />

      <Dialog open={!!importSummary} onOpenChange={(open) => !open && setImportSummary(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{importSummary?.success ? 'Import complete' : 'Import failed'}</DialogTitle>
            <DialogDescription>
              {importSummary?.success && importSummary.summary
                ? `Imported ${importSummary.summary.tasksImported} task(s) and ${importSummary.summary.categoriesImported} categor${importSummary.summary.categoriesImported === 1 ? 'y' : 'ies'}. Settings were restored from the backup.`
                : importSummary?.error}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setImportSummary(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
