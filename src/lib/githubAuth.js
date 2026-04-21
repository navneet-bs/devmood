import { supabase } from './supabase'

// GitHub OAuth App client id — safe to commit (public). Secret lives as an
// edge function secret. Falls back to env so you can swap accounts in dev.
export const GITHUB_CLIENT_ID =
  import.meta.env.VITE_GITHUB_CLIENT_ID || ''

// Scopes: repo (private repo visibility for merged PR counting),
// read:user (profile info). Request no more than needed.
const SCOPES = ['repo', 'read:user'].join(' ')

const STATE_KEY = 'devmood.github.oauth.state'

function randomState() {
  // 128-bit random, hex-encoded — CSRF protection for the OAuth round trip.
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function beginGithubOAuth() {
  if (!GITHUB_CLIENT_ID) {
    throw new Error(
      'GitHub OAuth is not configured. Set VITE_GITHUB_CLIENT_ID in .env.',
    )
  }
  const state = randomState()
  sessionStorage.setItem(STATE_KEY, state)

  const redirectUri = `${window.location.origin}/oauth/github`
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', GITHUB_CLIENT_ID)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('state', state)
  url.searchParams.set('allow_signup', 'false')
  window.location.href = url.toString()
}

export function verifyAndClearState(received) {
  const expected = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  return expected && expected === received
}

export async function exchangeCode(code) {
  const { data, error } = await supabase.functions.invoke(
    'github-oauth-callback',
    {
      body: { code },
      method: 'POST',
    },
  )
  if (error) {
    let parsed = null
    try {
      parsed = await error.context?.json?.()
    } catch {
      /* ignore */
    }
    const msg = parsed?.error || error.message || 'github connect failed'
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export async function disconnectGithub(userId) {
  // RLS delete policy only permits the caller to delete their own row, but
  // Supabase requires an explicit filter on .delete(). Trigger on the table
  // cascades and wipes github_stats for this user too.
  const { error } = await supabase
    .from('github_tokens')
    .delete()
    .eq('user_id', userId)
  if (error) throw error
}
