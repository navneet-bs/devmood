// Supabase Edge Function: sync-github-stats
//
// Called daily by pg_cron. For every user in github_tokens:
//   - counts merged PRs for "yesterday" (UTC)
//   - counts reviews given
//   - counts unique repos touched
// Upserts into github_stats (one row per user per date).
//
// Gated by REMINDER_TRIGGER_SECRET (reused so there's one shared cron secret
// across devmood; feel free to split if you'd rather).

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const triggerSecret = Deno.env.get('REMINDER_TRIGGER_SECRET')
  if (!triggerSecret) {
    return json({ error: 'REMINDER_TRIGGER_SECRET not configured' }, 500)
  }
  if (req.headers.get('Authorization') !== `Bearer ${triggerSecret}`) {
    return json({ error: 'unauthorized' }, 401)
  }

  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_KEY')
  if (!serviceKey) return json({ error: 'service role not available' }, 500)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, {
    auth: { persistSession: false },
  })

  const { data: tokens, error: tokensErr } = await supabase
    .from('github_tokens')
    .select('user_id, access_token, github_username')
  if (tokensErr) return json({ error: tokensErr.message }, 500)
  if (!tokens || tokens.length === 0) {
    return json({ count: 0, synced: 0 })
  }

  // Yesterday in UTC — the day we're reconciling.
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const dateStr = toISODate(yesterday)

  const results: Array<{
    user_id: string
    synced?: boolean
    error?: string
  }> = []

  for (const t of tokens) {
    try {
      const prs = await githubSearchAll(
        `is:pr is:merged author:${t.github_username} merged:${dateStr}..${dateStr}`,
        t.access_token,
      )
      const reviews = await githubSearchAll(
        `is:pr -author:${t.github_username} reviewed-by:${t.github_username} updated:${dateStr}..${dateStr}`,
        t.access_token,
      )

      const repos = new Set<string>()
      for (const p of prs) {
        const r = extractRepo(p.repository_url ?? p.html_url)
        if (r) repos.add(r)
      }

      const row = {
        user_id: t.user_id,
        date: dateStr,
        merged_prs: prs.length,
        reviews_given: reviews.length,
        repos_touched: repos.size,
      }

      const { error: upErr } = await supabase
        .from('github_stats')
        .upsert(row, { onConflict: 'user_id,date' })
      if (upErr) throw upErr

      await supabase
        .from('github_tokens')
        .update({
          last_synced_at: new Date().toISOString(),
          sync_error: null,
        })
        .eq('user_id', t.user_id)

      results.push({ user_id: t.user_id, synced: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[github-sync] user', t.user_id, msg)
      await supabase
        .from('github_tokens')
        .update({ sync_error: msg })
        .eq('user_id', t.user_id)
      results.push({ user_id: t.user_id, error: msg })
    }
  }

  return json({
    count: tokens.length,
    synced: results.filter((r) => r.synced).length,
    errored: results.filter((r) => r.error).length,
    date: dateStr,
    results,
  })
})

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function extractRepo(url: string | undefined): string | null {
  if (!url) return null
  const m = url.match(
    /(?:api\.github\.com\/repos|github\.com)\/([^/]+)\/([^/]+)/,
  )
  return m ? `${m[1]}/${m[2]}` : null
}

async function githubSearchAll(q: string, token: string): Promise<any[]> {
  const results: any[] = []
  for (let page = 1; page <= 5; page++) {
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
