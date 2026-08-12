import { test, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

function todayISO(): string {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

test.describe('Personal Task Manager — full golden path', () => {
  test('create, edit, complete, reopen, search, filter, recur, calendar, export, import, theme', async ({
    page,
  }) => {
    // 1. Open Application
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    const sidebarNav = page.getByRole('navigation', { name: 'Primary' })

    // 2. Create Task
    await page.getByRole('button', { name: 'Add Task' }).click()
    const createDialog = page.getByRole('dialog')
    await expect(createDialog.getByRole('heading', { name: 'Add Task' })).toBeVisible()

    await createDialog.getByLabel('Task title').fill('E2E grocery run')
    await createDialog.getByRole('button', { name: 'Advanced options' }).click()
    await createDialog.getByLabel('Due date').fill(todayISO())
    await createDialog.getByRole('button', { name: 'Add Task' }).click()
    await expect(createDialog).not.toBeVisible()

    await sidebarNav.getByRole('link', { name: 'Today' }).click()
    await expect(page.getByText('E2E grocery run')).toBeVisible()

    // 3. Edit Task
    await page.getByText('E2E grocery run').click()
    const editDialog = page.getByRole('dialog')
    await expect(editDialog.getByRole('heading', { name: 'Edit Task' })).toBeVisible()
    const titleInput = editDialog.getByLabel('Task title')
    await titleInput.fill('E2E grocery run (edited)')
    await editDialog.getByRole('button', { name: 'Save Changes' }).click()
    await expect(editDialog).not.toBeVisible()
    await expect(page.getByText('E2E grocery run (edited)')).toBeVisible()

    // 4. Complete Task
    const taskRow = page.locator('div', {
      has: page.getByRole('checkbox', { name: /complete e2e grocery run \(edited\)/i }),
    }).first()
    await taskRow.getByRole('checkbox').click()
    await sidebarNav.getByRole('link', { name: 'Completed' }).click()
    await expect(page.getByText('E2E grocery run (edited)')).toBeVisible()

    // 5. Reopen Task
    const completedRow = page
      .locator('div')
      .filter({ hasText: 'E2E grocery run (edited)' })
      .first()
    await completedRow.getByRole('button', { name: /more actions/i }).click()
    await page.getByRole('menuitem', { name: 'Reopen' }).click()
    await expect(page.getByText('E2E grocery run (edited)')).not.toBeVisible()
    await sidebarNav.getByRole('link', { name: 'Today' }).click()
    await expect(page.getByText('E2E grocery run (edited)')).toBeVisible()

    // 6. Search Task
    const searchBox = page.getByRole('searchbox', { name: 'Search tasks' })
    await searchBox.fill('grocery')
    await expect(page.getByText('E2E grocery run (edited)')).toBeVisible()
    await searchBox.fill('nonexistent-xyz')
    await expect(page.getByText('E2E grocery run (edited)')).not.toBeVisible()
    await searchBox.fill('')

    // 7. Filter Task
    const filterTrigger = page.getByRole('button', { name: /^Filter/ })
    await filterTrigger.click()
    await page.getByText('Urgent').click()
    await expect(page.getByText('E2E grocery run (edited)')).not.toBeVisible()
    // popover stays open after selecting inside it — toggle Urgent off again directly
    await page.getByText('Urgent').click()
    await expect(page.getByText('E2E grocery run (edited)')).toBeVisible()
    await page.keyboard.press('Escape')

    // 8. Create Recurring Task
    await page.getByRole('button', { name: 'Add Task' }).click()
    const recurDialog = page.getByRole('dialog')
    await recurDialog.getByLabel('Task title').fill('E2E daily standup')
    await recurDialog.getByRole('button', { name: 'Advanced options' }).click()
    await recurDialog.getByLabel('Due date').fill(todayISO())
    await recurDialog
      .getByRole('combobox')
      .filter({ hasText: 'Does not repeat' })
      .click()
    await page.getByRole('option', { name: 'Daily' }).click()
    await recurDialog.getByRole('button', { name: 'Add Task' }).click()
    await expect(recurDialog).not.toBeVisible()
    await expect(page.getByText('E2E daily standup')).toBeVisible()
    await expect(page.getByText('Repeats')).toBeVisible()

    // 9. Open Calendar
    await sidebarNav.getByRole('link', { name: 'Calendar' }).click()
    await expect(page.getByText('E2E grocery run (edited)')).toBeVisible()
    await expect(page.getByText('E2E daily standup')).toBeVisible()

    // 10. Export Data
    await sidebarNav.getByRole('link', { name: 'Settings' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export Data' }).click()
    const download = await downloadPromise
    const filePath = path.join(os.tmpdir(), 'ptm-e2e-export.json')
    await download.saveAs(filePath)
    expect(fs.existsSync(filePath)).toBe(true)

    // 11. Import Data
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(filePath)
    await expect(page.getByRole('heading', { name: 'Import complete' })).toBeVisible()
    await page.getByRole('button', { name: 'OK' }).click()

    // 12. Change Theme
    await page.getByRole('radio', { name: 'Dark' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByRole('radio', { name: 'Light' }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    fs.rmSync(filePath, { force: true })
  })
})
