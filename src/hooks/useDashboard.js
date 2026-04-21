import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  format,
  getDay,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function useDashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [streak, setStreak] = useState(null)
  const [logs, setLogs] = useState([]) // last 6 months, ascending
  const [recent, setRecent] = useState([]) // last 5, descending
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const sinceIso = subMonths(new Date(), 6).toISOString()

    const [profileRes, streakRes, logsRes, recentRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('streaks').select('*').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('mood_logs')
        .select('id, logged_at, energy, focus, mood, note, tags')
        .eq('user_id', user.id)
        .gte('logged_at', sinceIso)
        .order('logged_at', { ascending: true }),
      supabase
        .from('mood_logs')
        .select('id, logged_at, energy, focus, mood, note, tags')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(5),
    ])

    const firstError =
      profileRes.error || streakRes.error || logsRes.error || recentRes.error
    if (firstError) setError(firstError.message)

    setProfile(profileRes.data ?? null)
    setStreak(streakRes.data ?? null)
    setLogs(logsRes.data ?? [])
    setRecent(recentRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const now = new Date()
    const weekStart = subDays(now, 7)
    const monthStart = startOfMonth(now)

    const thisWeek = logs.filter((l) => parseISO(l.logged_at) >= weekStart)
    const thisMonth = logs.filter((l) => parseISO(l.logged_at) >= monthStart)

    const avg = (arr, key) =>
      arr.length === 0
        ? null
        : arr.reduce((s, x) => s + x[key], 0) / arr.length

    // Best day of week (all data in window): highest mean mood.
    const byDow = new Map()
    for (const l of logs) {
      const dow = getDay(parseISO(l.logged_at))
      const bucket = byDow.get(dow) ?? { sum: 0, n: 0 }
      bucket.sum += l.mood
      bucket.n += 1
      byDow.set(dow, bucket)
    }

    let bestDow = null
    let bestAvg = -Infinity
    for (const [dow, { sum, n }] of byDow) {
      const a = sum / n
      if (a > bestAvg) {
        bestAvg = a
        bestDow = dow
      }
    }

    return {
      avgEnergyWeek: avg(thisWeek, 'energy'),
      avgFocusWeek: avg(thisWeek, 'focus'),
      monthlyTotal: thisMonth.length,
      bestDay:
        bestDow === null
          ? null
          : { name: DAY_NAMES[bestDow], avgMood: bestAvg },
    }
  }, [logs])

  // Day-keyed index of logs (yyyy-MM-dd → log[]) for the heatmap.
  const logsByDate = useMemo(() => {
    const m = new Map()
    for (const l of logs) {
      const key = format(parseISO(l.logged_at), 'yyyy-MM-dd')
      const arr = m.get(key) ?? []
      arr.push(l)
      m.set(key, arr)
    }
    return m
  }, [logs])

  return {
    profile,
    streak,
    logs,
    logsByDate,
    recent,
    stats,
    loading,
    error,
    reload: load,
  }
}
