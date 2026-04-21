import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LogoMark } from '../components/Logo'
import PageHeader from '../components/PageHeader'

export default function Login() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'sending' | 'sent'
  const [error, setError] = useState(null)

  if (!loading && session) {
    return <Navigate to="/home" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return

    setStatus('sending')
    setError(null)

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })

    if (otpError) {
      setError(otpError.message)
      setStatus('idle')
      return
    }

    setStatus('sent')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0b] text-white">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-orb bg-orb--one" />
        <div className="bg-orb bg-orb--two" />
        <div className="bg-orb bg-orb--three" />
        <div className="bg-grid" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0b]" />
      </div>

      <PageHeader>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
          sign in
        </span>
      </PageHeader>

      <div className="relative z-10 grid min-h-[calc(100vh-60px)] grid-rows-[1fr_auto] items-center px-6 py-10 sm:py-16">
        <div className="mx-auto w-full max-w-sm">
          {/* Dramatic centerpiece — big glowing dot + wordmark underneath */}
          <div className="relative mb-14 flex flex-col items-center">
            <div className="mb-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.35em] text-teal-300/80">
              <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.9)]" />
              sign in
            </div>
            <Centerpiece />
            <h1 className="relative mt-10 text-5xl font-semibold tracking-tightest">
              <span className="text-white">dev</span>
              <span className="text-teal-300">mood</span>
            </h1>
            <p className="mt-5 text-center font-display text-xl italic text-neutral-400">
              track the rhythm of your code.
            </p>
          </div>

          {status === 'sent' ? (
            <SuccessCard
              email={email}
              onReset={() => {
                setStatus('idle')
                setEmail('')
              }}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="group relative">
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@dev.com"
                  disabled={status === 'sending'}
                  className="ring-focus w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm text-white placeholder-neutral-600 outline-none transition disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={status === 'sending' || !email}
                className="group relative w-full overflow-hidden rounded-xl bg-teal-400 px-4 py-3.5 text-sm font-semibold text-black shadow-glow-soft transition-all hover:bg-teal-300 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  {status === 'sending' ? (
                    <>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-black/70" />
                      sending…
                    </>
                  ) : (
                    <>send magic link →</>
                  )}
                </span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </button>

              {error && (
                <p className="pt-1 text-center text-xs text-red-400">{error}</p>
              )}

              <p className="pt-3 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-600">
                no password · email link only
              </p>
            </form>
          )}
        </div>

        <p className="mt-12 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-700">
          devmood · v0
        </p>
      </div>
    </div>
  )
}

// Big centerpiece: the logo mark inside a halo of concentric rings.
function Centerpiece() {
  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-teal-400/20 blur-3xl" />
      <div
        className="absolute inset-3 rounded-full border border-teal-400/20"
        style={{ animation: 'cell-pulse 3.2s ease-in-out infinite' }}
      />
      <div
        className="absolute inset-7 rounded-full border border-teal-400/35"
        style={{ animation: 'cell-pulse 3.2s ease-in-out 0.4s infinite' }}
      />
      <LogoMark
        size={56}
        animated
        className="relative drop-shadow-[0_0_24px_rgba(20,184,166,0.6)]"
      />
    </div>
  )
}

function SuccessCard({ email, onReset }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-teal-500/25 bg-teal-500/[0.04] p-6 text-center shadow-depth">
      <div className="pointer-events-none absolute -top-12 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-teal-400/20 blur-3xl" />
      <div className="relative mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-teal-500/40 bg-teal-500/10 shadow-glow-soft">
        <svg
          className="h-5 w-5 text-teal-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6h16v12H4z" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      </div>
      <p className="relative mt-4 font-display text-xl italic text-white">
        check your inbox.
      </p>
      <p className="relative mt-2 text-xs text-neutral-400">
        we sent a magic link to
        <br />
        <span className="mt-1 inline-block font-mono text-sm text-teal-300">
          {email}
        </span>
      </p>
      <button
        onClick={onReset}
        className="relative mt-5 text-xs text-neutral-500 underline-offset-4 transition hover:text-neutral-300 hover:underline"
      >
        use a different email
      </button>
    </div>
  )
}
