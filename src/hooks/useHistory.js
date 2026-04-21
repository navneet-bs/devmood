import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, getDay, parseISO, subDays } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, all: null }
const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Range goes through Supabase; tag is filtered client-side so the tag list
// stays stable as you toggle filters.
export function useHistory({ range = '30d', tag = null } = {}) {
  const { user } = useAuth()
  const [allLogs, setAllLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    let query = supabase
      .from('mood_logs')
      .select('id, logged_at, energy, focus, mood, note, tags')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })

    const days = RANGE_DAYS[range]
    if (days) {
      query = query.gte('logged_at', subDays(new Date(), days).toISOString())
    }

    const { data, error: qErr } = await query
    if (qErr) setError(qErr.message)
    setAllLogs(data ?? [])
    setLoading(false)
  }, [user, range])

  useEffect(() => {
    load()
  }, [load])

  const logs = useMemo(() => {
    if (!tag) return allLogs
    return allLogs.filter((l) => l.tags?.includes(tag))
  }, [allLogs, tag])

  // Line chart: one row per day (ascending).
  const timeSeries = useMemo(() => {
    const byDay = new Map()
    for (const l of logs) {
      const key = format(parseISO(l.logged_at), 'yyyy-MM-dd')
      const b = byDay.get(key) ?? { e: 0, f: 0, m: 0, n: 0 }
      b.e += l.energy
      b.f += l.focus
      b.m += l.mood
      b.n += 1
      byDay.set(key, b)
    }
    return [...byDay.entries()]
      .map(([date, b]) => ({
        date,
        label: format(parseISO(date), 'MMM d'),
        energy: +(b.e / b.n).toFixed(2),
        focus: +(b.f / b.n).toFixed(2),
        mood: +(b.m / b.n).toFixed(2),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [logs])

  // Weekly pattern: avg scores by day-of-week, ordered Mon → Sun.
  const weeklyPattern = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => ({
      e: 0,
      f: 0,
      m: 0,
      n: 0,
    }))
    for (const l of logs) {
      const dow = getDay(parseISO(l.logged_at))
      buckets[dow].e += l.energy
      buckets[dow].f += l.focus
      buckets[dow].m += l.mood
      buckets[dow].n += 1
    }
    const monFirst = [1, 2, 3, 4, 5, 6, 0]
    return monFirst.map((dow) => {
      const b = buckets[dow]
      return {
        day: DOW_SHORT[dow],
        energy: b.n ? +(b.e / b.n).toFixed(2) : 0,
        focus: b.n ? +(b.f / b.n).toFixed(2) : 0,
        mood: b.n ? +(b.m / b.n).toFixed(2) : 0,
        n: b.n,
      }
    })
  }, [logs])

  // Tag counts from the unfiltered set so the dropdown doesn't collapse.
  const tagCounts = useMemo(() => {
    const counts = new Map()
    for (const l of allLogs) {
      for (const t of l.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([t, count]) => ({ tag: t, count }))
      .sort((a, b) => b.count - a.count)
  }, [allLogs])

  const allTags = useMemo(() => tagCounts.map((t) => t.tag), [tagCounts])

  const deleteLog = async (id) => {
    const { error: delErr } = await supabase
      .from('mood_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (delErr) return { error: delErr.message }
    setAllLogs((prev) => prev.filter((l) => l.id !== id))
    return { ok: true }
  }

  const updateLog = async (id, updates) => {
    const { data, error: updErr } = await supabase
      .from('mood_logs')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (updErr) return { error: updErr.message }
    setAllLogs((prev) => prev.map((l) => (l.id === id ? data : l)))
    return { data }
  }

  return {
    logs,
    loading,
    error,
    timeSeries,
    weeklyPattern,
    tagCounts,
    allTags,
    deleteLog,
    updateLog,
    reload: load,
  }
}
