// Supabase Edge Function: github-oauth-callback
//
// Exchanges a GitHub OAuth authorization code for an access token and stores
// it against the caller's user_id. Also kicks off an initial 30-day backfill
// of merged PR stats so the leaderboard has data immediately.
//
// Flow:
//   1. User clicks "Connect GitHub" in Profile.
//   2. Frontend redirects to github.com/login/oauth/authorize?client_id=…&scope=repo,read:user
//   3. GitHub bounces back to ${SITE_URL}/oauth/github with ?code= and ?state=
//   4. Frontend POSTs { code, state } here with the user's Authorization header.
//   5. We exchange code for token server-side (client_secret never touches the browser),
//      fetch GitHub user info, and upsert into github_tokens.
//   6. Trigger a backfill for the last 30 days.
//
// Required secrets:
//   GITHUB_CLIENT_ID
//   GITHUB_CLIENT_SECRET

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'missing authorization' }, 401)

    // User-scoped client for auth check.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'unauthorized' }, 401)

    const clientId = Deno.env.get('GITHUB_CLIENT_ID')
    const clientSecret = Deno.env.get('GITHUB_CLIENT_SECRET')
    if (!clientId || !clientSecret) {
      return json({ error: 'github oauth not configured' }, 500)
    }

    const { code } = await req.json().catch(() => ({}))
    if (!code || typeof code !== 'string') {
      return json({ error: 'missing code' }, 400)
    }

    // 1. Exchange code for access token.
    const tokenRes = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      },
    )
    const tokenBody = await tokenRes.json()
    if (!tokenRes.ok || !tokenBody.access_token) {
      console.error('github token exchange failed', tokenBody)
      return json(
        {
          error:
            tokenBody.error_description ??
            tokenBody.error ??
            'github token exchange failed',
        },
        400,
      )
    }

    const accessToken = tokenBody.access_token as string
    const scopes = (tokenBody.scope as string) ?? ''

    // 2. Fetch GitHub user info to know who we're storing.
    const ghUserRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    if (!ghUserRes.ok) {
      return json({ error: 'could not fetch github user' }, 502)
    }
    const ghUser = (await ghUserRes.json()) as {
      id: number
      login: string
      avatar_url: string
    }

    // 3. Upsert into github_tokens via service role.
    const serviceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_SERVICE_KEY')
    if (!serviceKey) return json({ error: 'service role not available' }, 500)

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceKey,
      { auth: { persistSession: false } },
    )

    const { error: upsertErr } = await adminClient
      .from('github_tokens')
      .upsert(
        {
          user_id: user.id,
          access_token: accessToken,
          scopes,
          github_user_id: ghUser.id,
          github_username: ghUser.login,
          github_avatar_url: ghUser.avatar_url,
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
    if (upsertErr) return json({ error: upsertErr.message }, 500)

    // 4. Kick off an initial 30-day backfill of merged PRs.
    //    We do this inline (not ideal for latency, but acceptable for MVP).
    try {
      await backfill30Days({
        adminClient,
        userId: user.id,
        githubUsername: ghUser.login,
        accessToken,
      })
    } catch (e) {
      // Non-fatal — the daily cron will catch up.
      console.error('[github] backfill failed:', e)
    }

    return json({
      ok: true,
      github_username: ghUser.login,
      github_avatar_url: ghUser.avatar_url,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('github-oauth-callback error:', err)
    return json({ error: msg }, 500)
  }
})

// ---------------------------------------------------------------------------
// Backfill the last 30 days of stats.
// ---------------------------------------------------------------------------
async function backfill30Days({
  adminClient,
  userId,
  githubUsername,
  accessToken,
}: {
  adminClient: ReturnType<typeof createClient>
  userId: string
  githubUsername: string
  accessToken: string
}) {
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Fetch all merged PRs in the window (search API, paginated).
  const prs = await githubSearchAll(
    `is:pr is:merged author:${githubUsername} merged:>=${toISODate(thirtyDaysAgo)}`,
    accessToken,
  )
  const reviews = await githubSearchAll(
    `is:pr -author:${githubUsername} reviewed-by:${githubUsername} updated:>=${toISODate(thirtyDaysAgo)}`,
    accessToken,
  )

  // Bucket by merged_at date (UTC).
  const prBuckets = bucketByDate(prs, (p) => p.pull_request?.merged_at)
  const reviewBuckets = bucketByDate(reviews, (p) => p.updated_at)

  // Compute repos touched per day.
  const repoBuckets = new Map<string, Set<string>>()
  for (const pr of prs) {
    const d = toISODate(new Date(pr.pull_request?.merged_at ?? pr.updated_at))
    if (!repoBuckets.has(d)) repoBuckets.set(d, new Set())
    const repo = extractRepo(pr.repository_url ?? pr.html_url)
    if (repo) repoBuckets.get(d)!.add(repo)
  }

  const allDates = new Set<string>([
    ...prBuckets.keys(),
    ...reviewBuckets.keys(),
  ])

  const rows = [...allDates].map((date) => ({
    user_id: userId,
    date,
    merged_prs: prBuckets.get(date)?.length ?? 0,
    reviews_given: reviewBuckets.get(date)?.length ?? 0,
    repos_touched: repoBuckets.get(date)?.size ?? 0,
  }))

  if (rows.length > 0) {
    const { error } = await adminClient
      .from('github_stats')
      .upsert(rows, { onConflict: 'user_id,date' })
    if (error) throw error
  }

  await adminClient
    .from('github_tokens')
    .update({ last_synced_at: new Date().toISOString(), sync_error: null })
    .eq('user_id', userId)
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function bucketByDate<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
) {
  const map = new Map<string, T[]>()
  for (const it of items) {
    const raw = getDate(it)
    if (!raw) continue
    const date = toISODate(new Date(raw))
    if (!map.has(date)) map.set(date, [])
    map.get(date)!.push(it)
  }
  return map
}

function extractRepo(url: string | undefined): string | null {
  if (!url) return null
  // url shapes:
  //  https://api.github.com/repos/OWNER/REPO
  //  https://github.com/OWNER/REPO/pull/123
  const m = url.match(
    /(?:api\.github\.com\/repos|github\.com)\/([^/]+)\/([^/]+)/,
  )
  return m ? `${m[1]}/${m[2]}` : null
}

async function githubSearchAll(q: string, token: string): Promise<any[]> {
  const results: any[] = []
  for (let page = 1; page <= 10; page++) {
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&per_page=100&page=${page}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`github search failed: ${res.status} ${body}`)
    }
    const data = (await res.json()) as { items?: any[] }
    const items = data.items ?? []
    results.push(...items)
    if (items.length < 100) break
  }
  return results
}
