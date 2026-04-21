import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Reads the metadata columns of github_tokens (never the access_token).
// Select list intentionally excludes `access_token` so it's never pulled to
// the browser, even though RLS would permit it.
export function useGithubConnection() {
  const { user } = useAuth()
  const [connection, setConnection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('github_tokens')
      .select(
        'github_username, github_avatar_url, scopes, connected_at, last_synced_at, sync_error',
      )
      .eq('user_id', user.id)
      .maybeSingle()
    if (err) setError(err.message)
    setConnection(data ?? null)
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  return { connection, loading, error, reload: load }
}
