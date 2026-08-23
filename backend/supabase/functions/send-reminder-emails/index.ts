// Supabase Edge Function: send-reminder-emails
//
// Invoked on a schedule (via pg_cron + pg_net — see backend/README.md) to
// email users about tasks whose reminder window has opened. Mirrors the
// trigger logic in frontend/src/features/notifications/hooks/use-reminder-scheduler.ts,
// but runs server-side so it fires even when no browser tab is open.
//
// Required secrets (set with `supabase secrets set NAME=value`):
//   RESEND_API_KEY   - Resend API key used to send the email
//   RESEND_FROM      - "From" address, e.g. "Task Manager <reminders@yourdomain.com>"
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by the
// Edge Functions runtime.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TaskRow {
  id: string
  user_id: string
  title: string
  due_date: string
  due_time: string | null
  reminder: { enabled: boolean; offsetMinutes: number } | null
}

function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Same rule as the frontend: a date-only task is due at end-of-day. */
function getTaskDueMoment(task: Pick<TaskRow, 'due_date' | 'due_time'>): Date {
  const base = parseDateOnly(task.due_date)
  if (task.due_time) {
    const [hours, minutes] = task.due_time.slice(0, 5).split(':').map(Number)
    base.setHours(hours, minutes, 0, 0)
  } else {
    base.setHours(23, 59, 59, 999)
  }
  return base
}

async function sendReminderEmail(to: string, task: TaskRow): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM')
  if (!apiKey || !from) throw new Error('RESEND_API_KEY / RESEND_FROM not configured')

  const dueLabel = task.due_time
    ? `today at ${task.due_time.slice(0, 5)}`
    : `today (${task.due_date})`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: `Reminder: ${task.title}`,
      html: `<p><strong>${escapeHtml(task.title)}</strong> is due ${dueLabel}.</p>`,
    }),
  })

  if (!res.ok) {
    throw new Error(`Resend API error ${res.status}: ${await res.text()}`)
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: subscribedSettings, error: settingsError } = await admin
    .from('settings')
    .select('id')
    .eq('email_notifications_enabled', true)

  if (settingsError) {
    return new Response(JSON.stringify({ error: settingsError.message }), { status: 500 })
  }

  const subscribedUserIds = (subscribedSettings ?? []).map((s: { id: string }) => s.id)
  if (subscribedUserIds.length === 0) {
    return new Response(JSON.stringify({ checked: 0, sent: 0 }), { status: 200 })
  }

  const { data: candidates, error: tasksError } = await admin
    .from('tasks')
    .select('id, user_id, title, due_date, due_time, reminder')
    .in('user_id', subscribedUserIds)
    .in('status', ['TODO', 'IN_PROGRESS'])
    .not('due_date', 'is', null)
    .not('reminder', 'is', null)
    .is('reminder_sent_at', null)

  if (tasksError) {
    return new Response(JSON.stringify({ error: tasksError.message }), { status: 500 })
  }

  const now = Date.now()
  let sent = 0
  const errors: string[] = []

  for (const task of (candidates ?? []) as TaskRow[]) {
    if (!task.reminder?.enabled) continue

    const dueMoment = getTaskDueMoment(task).getTime()
    const triggerAt = dueMoment - task.reminder.offsetMinutes * 60_000
    if (now < triggerAt || now >= dueMoment) continue

    const { data: userResult, error: userError } = await admin.auth.admin.getUserById(task.user_id)
    const email = userResult?.user?.email
    if (userError || !email) {
      errors.push(`task ${task.id}: could not resolve user email`)
      continue
    }

    try {
      await sendReminderEmail(email, task)
      const { error: updateError } = await admin
        .from('tasks')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', task.id)
      if (updateError) throw new Error(updateError.message)
      sent++
    } catch (err) {
      errors.push(`task ${task.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return new Response(
    JSON.stringify({ checked: candidates?.length ?? 0, sent, errors }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
