import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { evaluateBadges } from '../lib/badges'

export function useBadges() {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('mood_logs')
        .select('logged_at, focus')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: true })
      if (cancelled) return
      if (err) setError(err.message)
      setLogs(data ?? [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  const badges = useMemo(() => evaluateBadges(logs), [logs])
  const unlocked = useMemo(
    () => badges.filter((b) => b.unlockedAt).length,
    [badges],
  )

  return { badges, unlocked, total: badges.length, loading, error }
}
