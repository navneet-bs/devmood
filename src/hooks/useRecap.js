import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useRecap() {
  const { user } = useAuth()
  const [recap, setRecap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('recaps')
      .select('*')
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (err) setError(err.message)
    setRecap(data ?? null)
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const generate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        'weekly-recap',
        { method: 'POST' },
      )

      if (fnErr) {
        // supabase-js returns FunctionsHttpError with .context (Response) on non-2xx
        let body = null
        try {
          body = await fnErr.context?.json?.()
        } catch {
          /* ignore parse errors */
        }
        const msg = body?.error || fnErr.message || 'could not generate recap'
        const err = new Error(msg)
        err.code = body?.code
        throw err
      }

      if (data?.error) {
        const err = new Error(data.error)
        err.code = data.code
        throw err
      }

      if (data?.recap) setRecap(data.recap)
      return { data: data?.recap }
    } catch (e) {
      setError(e.message)
      return { error: e.message, code: e.code }
    } finally {
      setGenerating(false)
    }
  }, [])

  return { recap, loading, generating, error, generate, reload: load }
}
