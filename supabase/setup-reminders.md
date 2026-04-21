# Daily reminder emails — setup

You only need to do this once. Five steps:

## 1. Apply the schema change

Add the new columns to `profiles`. Run this in Supabase SQL editor:

```sql
alter table public.profiles
    add column if not exists reminder_enabled    boolean not null default false,
    add column if not exists reminder_hour       smallint check (reminder_hour between 0 and 23),
    add column if not exists last_reminded_date  date;
```

## 2. Get a Resend API key

- Sign up at https://resend.com (free tier = 3,000 emails/month)
- **API Keys → Create API Key** → copy the `re_...` value
- For dev, you can send from `onboarding@resend.dev` (works immediately)
- For production, verify your sending domain under **Domains**

## 3. Set the edge-function secrets

From the project directory:

```sh
cd /Users/bigstep/Documents/Projects/devMood

# Resend API key
supabase secrets set RESEND_API_KEY=re_YOUR_KEY_HERE

# Any strong random string — used as the shared secret between pg_cron and the edge fn.
# Example: openssl rand -hex 32
supabase secrets set REMINDER_TRIGGER_SECRET=YOUR_RANDOM_32_BYTE_HEX

# Optional: custom sender (defaults to onboarding@resend.dev)
# supabase secrets set REMINDER_FROM='devmood <reminders@yourdomain.com>'

# Optional: your live site URL for the CTA button
supabase secrets set SITE_URL=https://devmood.app
```

## 4. Deploy the edge function

```sh
supabase functions deploy send-reminders
```

(config.toml already sets `verify_jwt = false` for this function because we auth
with the shared secret instead of a JWT.)

## 5. Schedule pg_cron

Supabase SQL editor. **Replace `PASTE_YOUR_SECRET_HERE`** with the same value
you used for `REMINDER_TRIGGER_SECRET` above:

```sql
-- Enable extensions (no-op if already enabled)
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- Schedule hourly call at 5 min past the hour (arbitrary offset to avoid
-- colliding with top-of-hour traffic).
select cron.schedule(
    'devmood-reminders-hourly',
    '5 * * * *',
    $$
    select net.http_post(
        url := 'https://dratlxfygagltelqwzsj.supabase.co/functions/v1/send-reminders',
        headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer PASTE_YOUR_SECRET_HERE'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
    );
    $$
);
```

To check it's scheduled:

```sql
select * from cron.job;
```

To remove it later:

```sql
select cron.unschedule('devmood-reminders-hourly');
```

## 6. Test

1. Go to `/profile` in the app → toggle **daily reminder** on, pick an hour in the next 5 minutes, save.
2. Wait for the next `:05` of the hour that matches your reminder time.
3. Check your inbox.

### Manual trigger (for testing)

```sh
curl -X POST https://dratlxfygagltelqwzsj.supabase.co/functions/v1/send-reminders \
  -H "Authorization: Bearer YOUR_REMINDER_TRIGGER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response shape:
```json
{ "count": 1, "sent": 1, "skipped": 0, "errored": 0, "results": [...] }
```

### Debugging

Function logs: https://supabase.com/dashboard/project/dratlxfygagltelqwzsj/functions/send-reminders/logs

Cron job runs: `select * from cron.job_run_details order by start_time desc limit 20;`
