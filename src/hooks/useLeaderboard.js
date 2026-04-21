import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

// Pulls raw per-day stats for the selected range + the public meta from
// github_tokens (username / avatar) and aggregates client-side. For tens of
// users this is plenty; paginate server-side if the user base grows.

function sinceISO(range) {
  const today = new Date()
  const yyyyMmDd = (d) => d.toISOString().slice(0, 10)
  if (range === 'daily') {
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    return yyyyMmDd(yesterday)
  }
  if (range === 'weekly') {
    const d = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    return yyyyMmDd(d)
  }
  return null // all-time
}

export function useLeaderboard({ range = 'weekly' } = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const since = sinceISO(range)

    let q = supabase
      .from('github_stats')
      .select('user_id, date, merged_prs, reviews_given, repos_touched')
    if (since) q = q.gte('date', since)
    const [{ data: stats, error: statsErr }, { data: users, error: usersErr }] =
      await Promise.all([
        q,
        supabase
          .from('github_tokens')
          .select('user_id, github_username, github_avatar_url'),
      ])

    if (statsErr || usersErr) {
      setError(statsErr?.message ?? usersErr?.message)
      setLoading(false)
      return
    }

    const userMeta = new Map(
      (users ?? []).map((u) => [u.user_id, u]),
    )
    const agg = new Map()
    for (const s of stats ?? []) {
      const prev = agg.get(s.user_id) ?? {
        user_id: s.user_id,
        merged_prs: 0,
        reviews_given: 0,
        repos: new Set(),
        days_active: 0,
      }
      prev.merged_prs += s.merged_prs || 0
      prev.reviews_given += s.reviews_given || 0
      if ((s.merged_prs || 0) > 0) prev.days_active += 1
      // repos_touched is a per-day count, can't union — sum-of-uniques is an
      // approximation but fine for a leaderboard.
      prev.repos_unique_approx =
        (prev.repos_unique_approx || 0) + (s.repos_touched || 0)
      agg.set(s.user_id, prev)
    }

    const merged = [...agg.values()]
      .map((row) => {
        const meta = userMeta.get(row.user_id)
        return {
          ...row,
          github_username: meta?.github_username ?? null,
          github_avatar_url: meta?.github_avatar_url ?? null,
        }
      })
      .filter((r) => r.github_username)
      .sort((a, b) => b.merged_prs - a.merged_prs)

    setRows(merged)
    setLoading(false)
  }, [range])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(
    () => ({
      totalMerged: rows.reduce((s, r) => s + r.merged_prs, 0),
      totalReviews: rows.reduce((s, r) => s + r.reviews_given, 0),
      totalUsers: rows.length,
    }),
    [rows],
  )

  return { rows, stats, loading, error, reload: load }
}
