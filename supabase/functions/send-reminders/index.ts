// Supabase Edge Function: send-reminders
//
// Called hourly by pg_cron. For every profile with reminders enabled:
//   - Is the current hour (in their timezone) their preferred hour?
//   - Have they already logged today (in their TZ)?
//   - Have we already emailed them today (in their TZ)?
//   If all boxes line up → send a Resend email and record last_reminded_date.
//
// Service-role scoped (bypasses RLS) so it can read across all profiles and
// join to auth.users for the email address. Secured via a shared secret in
// the Authorization header set by the pg_cron job.
//
// Required secrets:
//   RESEND_API_KEY           — resend.com API key
//   REMINDER_TRIGGER_SECRET  — any strong random string; must match the
//                              bearer token in the pg_cron SQL
// Optional:
//   REMINDER_FROM            — "devmood <reminders@yourdomain.app>"
//                              (defaults to Resend's onboarding sender)
//   SITE_URL                 — https://devmood.app (used for the CTA + profile link)

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { Resend } from 'npm:resend@3.2.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

// ISO 8601 hour in a named timezone (0–23).
function hourInTz(date: Date, tz: string): number {
  const h = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  }).format(date)
  return parseInt(h, 10) % 24
}

// yyyy-MM-dd in a named timezone.
function dateInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildEmail({
  username,
  siteUrl,
}: {
  username: string | null
  siteUrl: string
}) {
  const safeUser = username ? escapeHtml(username) : null
  const logUrl = `${siteUrl}/log`
  const profileUrl = `${siteUrl}/profile`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>devmood check-in</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:48px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
        <tr><td style="padding-bottom:32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.02em;">dev</span><span style="color:#5eead4;font-size:20px;font-weight:700;letter-spacing:-0.02em;">mood</span>
          <span style="display:inline-block;width:6px;height:6px;background:#5eead4;border-radius:50%;margin-left:4px;"></span>
        </td></tr>
        <tr><td style="color:#ffffff;font-size:22px;font-weight:600;line-height:1.3;padding-bottom:12px;">
          How's your coding energy today${safeUser ? `, ${safeUser}` : ''}?
        </td></tr>
        <tr><td style="color:#a3a3a3;font-size:15px;line-height:1.55;padding-bottom:32px;">
          A 15-second check-in keeps your streak alive and builds a record of what actually helps you code well.
        </td></tr>
        <tr><td style="padding-bottom:40px;">
          <a href="${logUrl}" style="display:inline-block;background:#14b8a6;color:#0a0a0a;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;text-decoration:none;">
            Log today's check-in →
          </a>
        </td></tr>
        <tr><td style="border-top:1px solid #262626;padding-top:24px;color:#525252;font-size:12px;line-height:1.55;">
          You're getting this because you turned on daily reminders in devmood.
          <br>Change the time or turn them off in <a href="${profileUrl}" style="color:#737373;text-decoration:underline;">your profile</a>.
        </td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`

  const text = `How's your coding energy today${safeUser ? `, ${username}` : ''}?

A 15-second check-in keeps your streak alive.

Log now: ${logUrl}

---
You're getting this because you turned on daily reminders in devmood.
Change or disable: ${profileUrl}`

  return { html, text }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Gate — only the pg_cron job (which shares the secret) may invoke this.
  const triggerSecret = Deno.env.get('REMINDER_TRIGGER_SECRET')
  if (!triggerSecret) {
    return json({ error: 'REMINDER_TRIGGER_SECRET not configured' }, 500)
  }
  const auth = req.headers.get('Authorization') ?? ''
  if (auth !== `Bearer ${triggerSecret}`) {
    return json({ error: 'unauthorized' }, 401)
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return json({ error: 'RESEND_API_KEY not configured' }, 500)

  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_KEY')
  if (!serviceKey) return json({ error: 'service role key not available' }, 500)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
    auth: { persistSession: false },
  })
  const resend = new Resend(resendKey)
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://devmood.app'
  const fromAddr =
    Deno.env.get('REMINDER_FROM') ?? 'devmood <onboarding@resend.dev>'

  // Candidates: reminders enabled + reminder_hour set.
  const { data: candidates, error: candErr } = await supabase
    .from('profiles')
    .select('id, username, timezone, reminder_hour, last_reminded_date')
    .eq('reminder_enabled', true)
    .not('reminder_hour', 'is', null)

  if (candErr) return json({ error: candErr.message }, 500)
  if (!candidates || candidates.length === 0) {
    return json({ count: 0, sent: 0, skipped: 0 })
  }

  const now = new Date()
  // Pull enough log history for a 36h window (handles every timezone).
  const since = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString()

  const results: Array<{
    id: string
    sent?: boolean
    skipped?: string
    error?: string
  }> = []

  for (const p of candidates) {
    try {
      const tz = p.timezone || 'UTC'
      const hNow = hourInTz(now, tz)
      const today = dateInTz(now, tz)

      if (hNow !== p.reminder_hour) {
        results.push({ id: p.id, skipped: 'wrong_hour' })
        continue
      }
      if (p.last_reminded_date === today) {
        results.push({ id: p.id, skipped: 'already_reminded_today' })
        continue
      }

      // Has the user already logged today (in their TZ)?
      const { data: recentLogs, error: logsErr } = await supabase
        .from('mood_logs')
        .select('logged_at')
        .eq('user_id', p.id)
        .gte('logged_at', since)

      if (logsErr) throw logsErr

      const loggedToday = (recentLogs ?? []).some(
        (l) => dateInTz(new Date(l.logged_at), tz) === today,
      )
      if (loggedToday) {
        results.push({ id: p.id, skipped: 'already_logged' })
        // Still mark reminded so we don't spam if they delete + re-add a log later today.
        await supabase
          .from('profiles')
          .update({ last_reminded_date: today })
          .eq('id', p.id)
        continue
      }

      // Get the auth.users email for this profile.
      const { data: userRes, error: userErr } = await supabase.auth.admin.getUserById(p.id)
      if (userErr) throw userErr
      const email = userRes?.user?.email
      if (!email) {
        results.push({ id: p.id, error: 'no email' })
        continue
      }

      const { html, text } = buildEmail({ username: p.username, siteUrl })
      const send = await resend.emails.send({
        from: fromAddr,
        to: email,
        subject: "How's your coding energy today?",
        html,
        text,
      })

      if (send.error) throw new Error(send.error.message ?? 'resend error')

      await supabase
        .from('profiles')
        .update({ last_reminded_date: today })
        .eq('id', p.id)

      results.push({ id: p.id, sent: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[send-reminders] profile ${p.id}:`, msg)
      results.push({ id: p.id, error: msg })
    }
  }

  const sent = results.filter((r) => r.sent).length
  const skipped = results.filter((r) => r.skipped).length
  const errored = results.filter((r) => r.error).length

  return json({
    count: candidates.length,
    sent,
    skipped,
    errored,
    results,
  })
})
