import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { exchangeCode, verifyAndClearState } from '../lib/githubAuth'
import { LogoMark } from '../components/Logo'
import PageHeader from '../components/PageHeader'

export default function OAuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const { show } = useToast()
  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    if (loading) return
    ran.current = true

    const code = params.get('code')
    const state = params.get('state')
    const ghError = params.get('error')

    if (ghError) {
      setStatus('error')
      setError(ghError)
      return
    }

    if (!session) {
      // Not signed in — park them at /login, preserve return intent.
      navigate('/login', { replace: true })
      return
    }

    if (!code || !state) {
      setStatus('error')
      setError('missing code or state')
      return
    }

    if (!verifyAndClearState(state)) {
      setStatus('error')
      setError('state mismatch — please try connecting again')
      return
    }

    exchangeCode(code)
      .then((data) => {
        show(`connected @${data.github_username} 🔗`, { variant: 'milestone' })
        navigate('/profile', { replace: true })
      })
      .catch((e) => {
        setStatus('error')
        setError(e.message ?? 'unknown error')
      })
  }, [loading, session, params, navigate, show])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0b] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-orb bg-orb--one" />
        <div className="bg-orb bg-orb--three" />
        <div className="bg-grid" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0b]" />
      </div>

      <PageHeader>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-teal-300/80">
          <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.9)]" />
          connecting github
        </span>
      </PageHeader>

      <div className="relative z-10 flex min-h-[calc(100vh-60px)] items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <LogoMark
            size={44}
            animated
            className="mx-auto mb-8 opacity-80 drop-shadow-[0_0_16px_rgba(20,184,166,0.5)]"
          />
          {status === 'connecting' && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-teal-300/80">
                <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.9)]" />
                connecting github
              </p>
              <p className="mt-6 font-display text-2xl italic text-neutral-200">
                syncing your pull requests…
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                this can take a few seconds — we're pulling the last 30 days.
              </p>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-red-400">
                connection failed
              </p>
              <p className="mt-6 font-display text-2xl italic text-neutral-200">
                something went wrong.
              </p>
              {error && (
                <p className="mt-2 break-all text-sm text-neutral-500">{error}</p>
              )}
              <Link
                to="/profile"
                className="mt-8 inline-block rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-neutral-200 transition hover:border-teal-400/40 hover:text-teal-300"
              >
                back to profile
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
