import { useCallback, useEffect, useState } from 'react'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Handles reading today's log, the streak row, and writing/updating both.
export function useMoodLog() {
  const { user } = useAuth()
  const [todayLog, setTodayLog] = useState(null)
  const [streak, setStreak] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadToday = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    const [logRes, streakRes] = await Promise.all([
      supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', start.toISOString())
        .lte('logged_at', end.toISOString())
        .order('logged_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    if (logRes.error) setError(logRes.error.message)
    setTodayLog(logRes.data ?? null)
    setStreak(streakRes.data ?? null)
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadToday()
  }, [loadToday])

  const upsertStreak = async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')

    const { data: current } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    let nextCurrent = 1
    let nextLongest = 1

    if (current) {
      // Same-day insert shouldn't normally happen (UI blocks it), but be safe.
      if (current.last_logged_date === todayStr) return current

      const diff = current.last_logged_date
        ? differenceInCalendarDays(
            parseISO(todayStr),
            parseISO(current.last_logged_date),
          )
        : null

      nextCurrent = diff === 1 ? current.current_streak + 1 : 1
      nextLongest = Math.max(current.longest_streak ?? 0, nextCurrent)
    }

    const { data, error: upsertErr } = await supabase
      .from('streaks')
      .upsert(
        {
          user_id: user.id,
          current_streak: nextCurrent,
          longest_streak: nextLongest,
          last_logged_date: todayStr,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single()

    if (upsertErr) throw upsertErr
    return data
  }

  const saveLog = async ({ energy, focus, mood, note, tags }) => {
    if (!user) return { error: 'not authenticated' }
    setSaving(true)
    setError(null)

    try {
      const { data: log, error: logErr } = await supabase
        .from('mood_logs')
        .insert({
          user_id: user.id,
          logged_at: new Date().toISOString(),
          energy,
          focus,
          mood,
          note: note || null,
          tags: tags ?? [],
        })
        .select()
        .single()

      if (logErr) throw logErr

      const nextStreak = await upsertStreak()

      setTodayLog(log)
      setStreak(nextStreak)
      return { data: log, streak: nextStreak }
    } catch (e) {
      setError(e.message)
      return { error: e.message }
    } finally {
      setSaving(false)
    }
  }

  const updateLog = async ({ energy, focus, mood, note, tags }) => {
    if (!user || !todayLog) return { error: 'no log to update' }
    setSaving(true)
    setError(null)

    try {
      const { data, error: updErr } = await supabase
        .from('mood_logs')
        .update({
          energy,
          focus,
          mood,
          note: note || null,
          tags: tags ?? [],
        })
        .eq('id', todayLog.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updErr) throw updErr
      setTodayLog(data)
      return { data, streak }
    } catch (e) {
      setError(e.message)
      return { error: e.message }
    } finally {
      setSaving(false)
    }
  }

  return {
    todayLog,
    streak,
    loading,
    saving,
    error,
    saveLog,
    updateLog,
    reload: loadToday,
  }
}
