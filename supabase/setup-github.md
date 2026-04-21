# GitHub integration — setup

Users connect their GitHub account via OAuth, and a daily cron job pulls their
merged-PR / review stats into `github_stats`. The leaderboard page reads
`github_stats` joined with `github_tokens`.

## 1. Apply the schema change

Paste the `github_tokens` + `github_stats` block from `schema.sql` into the
Supabase SQL editor and run it. (Or re-run the whole schema — everything is
guarded by `create table if not exists` / `create or replace`.)

## 2. Create the GitHub OAuth App

https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**.

| Field | Value |
|---|---|
| Application name | `devmood` |
| Homepage URL | `https://devmood.app` (or your prod URL / `http://localhost:5173` for dev) |
| Authorization callback URL | `https://devmood.app/oauth/github` (or `http://localhost:5173/oauth/github`) |

Create it. Then copy the **Client ID**. Click **Generate a new client secret**
and copy that too.

> You can register multiple callback URLs on the **same** OAuth App by creating
> separate apps for dev vs prod, or by switching the URL temporarily. For
> simplicity during dev, use a single app with the localhost callback.

## 3. Put the client ID in the frontend env

Client ID is **public** — safe to commit, but keep it in `.env` for cleanliness:

```
VITE_GITHUB_CLIENT_ID=Iv1.abc123...
```

The **client secret** never goes here — it lives as an edge-function secret.

## 4. Set the edge-function secrets

```sh
cd /Users/bigstep/Documents/Projects/devMood

supabase secrets set GITHUB_CLIENT_ID=Iv1.abc123...
supabase secrets set GITHUB_CLIENT_SECRET=<paste>
```

`REMINDER_TRIGGER_SECRET` is reused to gate the sync function — already set
from the reminders setup.

## 5. Deploy both edge functions

```sh
supabase functions deploy github-oauth-callback
supabase functions deploy sync-github-stats
```

`config.toml` already sets `verify_jwt = false` on both (we do our own auth
inside the functions).

## 6. Schedule the daily sync

Supabase SQL editor:

```sql
-- Runs at 03:10 UTC every day (after the reminder job at :05 would fire).
select cron.schedule(
    'devmood-github-sync-daily',
    '10 3 * * *',
    $$
    select net.http_post(
        url := 'https://dratlxfygagltelqwzsj.supabase.co/functions/v1/sync-github-stats',
        headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer YOUR_REMINDER_TRIGGER_SECRET_HERE'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
    );
    $$
);
```

Verify: `select * from cron.job where jobname = 'devmood-github-sync-daily';`

To unschedule: `select cron.unschedule('devmood-github-sync-daily');`

## 7. Test end-to-end

1. In the running app, open **Profile** → hit **connect github →**.
2. GitHub asks you to authorize `devmood` with **repo** and **read:user**
   scopes. Authorize.
3. You'll land on `/oauth/github` with a "syncing your pull requests…" screen,
   then get bounced to `/profile` with a milestone toast.
4. The Profile page now shows your GitHub avatar, username, and last-sync
   timestamp. A 30-day backfill runs inline during the callback, so stats
   should exist immediately.
5. Open `/leaderboard`. You should see yourself.

### Manual trigger (to test the sync function without waiting for 3:10 UTC)

```sh
curl -X POST https://dratlxfygagltelqwzsj.supabase.co/functions/v1/sync-github-stats \
  -H "Authorization: Bearer YOUR_REMINDER_TRIGGER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response shows per-user `synced` / `error` status.

## Privacy notes

- The access token is stored in `github_tokens.access_token` in plaintext. RLS
  prevents other users from reading it; only the service role (edge functions)
  ever touches that column. If you want encryption at rest, use Supabase Vault
  (pgsodium) — left for a future iteration.
- `github_stats` is **readable by any authenticated devmood user** (policy
  `Authenticated users can read github stats`) — that's what makes the
  leaderboard possible. Users opt in by connecting; disconnecting deletes both
  their token and all their stats (via the `cleanup_github_stats_on_disconnect`
  trigger).
- The client never pulls `access_token` — the `useGithubConnection` hook
  explicitly selects only the metadata columns.

## Debugging

- Function logs:
  - https://supabase.com/dashboard/project/dratlxfygagltelqwzsj/functions/github-oauth-callback/logs
  - https://supabase.com/dashboard/project/dratlxfygagltelqwzsj/functions/sync-github-stats/logs
- Cron runs: `select * from cron.job_run_details where jobname = 'devmood-github-sync-daily' order by start_time desc limit 10;`
- Inspect a user's stats:
  ```sql
  select * from github_stats where user_id = '<uuid>' order by date desc;
  ```
