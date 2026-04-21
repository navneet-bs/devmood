import { useCallback, useEffect, useMemo, useState } from 'react'
import { subDays } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Personal GitHub stats for the logged-in user — used by the Dashboard card.
// Returns last-7-days totals + raw daily rows for a mini chart.
export function useGithubStats({ days = 7 } = {}) {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const since = subDays(new Date(), days).toISOString().slice(0, 10)
    const { data, error: err } = await supabase
      .from('github_stats')
      .select('date, merged_prs, reviews_given, repos_touched')
      .eq('user_id', user.id)
      .gte('date', since)
      .order('date', { ascending: true })
    if (err) setError(err.message)
    setRows(data ?? [])
    setLoading(false)
  }, [user, days])

  useEffect(() => {
    load()
  }, [load])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        merged_prs: acc.merged_prs + (r.merged_prs || 0),
        reviews_given: acc.reviews_given + (r.reviews_given || 0),
        repos_touched: acc.repos_touched + (r.repos_touched || 0),
      }),
      { merged_prs: 0, reviews_given: 0, repos_touched: 0 },
    )
  }, [rows])

  return { rows, totals, loading, error, reload: load }
}
