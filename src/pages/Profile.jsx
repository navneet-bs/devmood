import { useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useBadges } from '../hooks/useBadges'
import { useGithubConnection } from '../hooks/useGithubConnection'
import { useToast } from '../components/Toast'
import Skeleton from '../components/Skeleton'
import ErrorBoundary from '../components/ErrorBoundary'
import { beginGithubOAuth, disconnectGithub } from '../lib/githubAuth'

function formatHour(h) {
  const period = h < 12 ? 'AM' : 'PM'
  const hour12 = ((h + 11) % 12) + 1
  return `${hour12}:00 ${period}`
}

function getTimezones() {
  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      return Intl.supportedValuesOf('timeZone')
    } catch {
      /* fall through */
    }
  }
  // Minimal fallback
  return [
    'UTC',
    'America/Los_Angeles',
    'America/New_York',
    'America/Chicago',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Australia/Sydney',
  ]
}

export default function Profile() {
  return (
    <div className="stagger mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-neutral-500">
          settings
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tightest sm:text-5xl">
          <span className="text-white">your</span>{' '}
          <span className="font-display italic text-teal-300">profile.</span>
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          tune how devmood greets you, when it pings you, and what you've
          earned.
        </p>
      </header>

      <div className="mt-12 space-y-10">
        <ErrorBoundary title="could not load profile settings.">
          <ProfileForm />
        </ErrorBoundary>

        <ErrorBoundary title="could not load github connection.">
          <GithubSection />
        </ErrorBoundary>

        <ErrorBoundary title="could not load badges.">
          <BadgesSection />
        </ErrorBoundary>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------
function BadgesSection() {
  const { badges, unlocked, total, loading } = useBadges()

  if (loading) {
    return <Skeleton className="h-64" rounded="rounded-2xl" />
  }

  return (
    <section>
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
            badges
          </div>
          <p className="mt-2 font-display text-lg italic text-neutral-300">
            milestones you've earned.
          </p>
        </div>
        <div className="text-right">
          <div className="tabular font-mono text-3xl font-semibold text-white">
            <span className="text-teal-300">{unlocked}</span>
            <span className="text-neutral-700">/{total}</span>
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
            unlocked
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {badges.map((b) => (
          <BadgeCard key={b.id} badge={b} />
        ))}
      </div>
    </section>
  )
}

function BadgeCard({ badge }) {
  const unlocked = !!badge.unlockedAt
  return (
    <div
      className={`group surface-hover relative overflow-hidden rounded-xl border p-4 transition-all ${
        unlocked
          ? 'border-teal-500/30 bg-gradient-to-br from-teal-500/[0.08] via-teal-500/[0.02] to-transparent shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_0_24px_-8px_rgba(20,184,166,0.3)]'
          : 'border-white/[0.06] bg-white/[0.015]'
      }`}
    >
      {unlocked && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-teal-400/15 blur-2xl"
        />
      )}
      <div className="relative flex items-start justify-between">
        <div
          className={`text-3xl transition-transform duration-300 ${
            unlocked
              ? 'drop-shadow-[0_0_12px_rgba(20,184,166,0.5)] group-hover:scale-110'
              : 'opacity-30 grayscale'
          }`}
          aria-hidden
        >
          {badge.icon}
        </div>
        {unlocked && (
          <svg
            className="h-3.5 w-3.5 text-teal-300 opacity-80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </div>
      <h3
        className={`relative mt-3 text-sm font-semibold tracking-tight ${
          unlocked ? 'text-white' : 'text-neutral-400'
        }`}
      >
        {badge.title}
      </h3>
      <p
        className={`relative mt-1 text-[11px] leading-relaxed ${
          unlocked ? 'text-neutral-400' : 'text-neutral-600'
        }`}
      >
        {badge.description}
      </p>

      {unlocked ? (
        <div className="relative mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-teal-400">
          <span className="h-1 w-1 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(20,184,166,0.9)]" />
          {format(parseISO(badge.unlockedAt), 'MMM d, yyyy')}
        </div>
      ) : badge.progress ? (
        <div className="relative mt-3">
          <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-wider text-neutral-600">
            <span>locked</span>
            <span className="tabular text-neutral-500">
              {badge.progress.current}/{badge.progress.target}
            </span>
          </div>
          <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/[0.04]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500/50 to-teal-400/70 shadow-[0_0_6px_rgba(20,184,166,0.4)] transition-all duration-700"
              style={{
                width: `${Math.min(100, (badge.progress.current / badge.progress.target) * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : (
        <div className="relative mt-3 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
          locked
        </div>
      )}
    </div>
  )
}

function ProfileForm() {
  const { user, signOut } = useAuth()
  const { show } = useToast()
  const timezones = useMemo(() => getTimezones(), [])
  const detected = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  )

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [username, setUsername] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderHour, setReminderHour] = useState(9)
  const [error, setError] = useState(null)
  const [initial, setInitial] = useState({
    username: '',
    timezone: 'UTC',
    reminderEnabled: false,
    reminderHour: 9,
  })

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('profiles')
        .select('username, timezone, reminder_enabled, reminder_hour')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      if (err) setError(err.message)
      const next = {
        username: data?.username ?? '',
        timezone: data?.timezone ?? 'UTC',
        reminderEnabled: !!data?.reminder_enabled,
        reminderHour: data?.reminder_hour ?? 9,
      }
      setUsername(next.username)
      setTimezone(next.timezone)
      setReminderEnabled(next.reminderEnabled)
      setReminderHour(next.reminderHour)
      setInitial(next)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  const dirty =
    username !== initial.username ||
    timezone !== initial.timezone ||
    reminderEnabled !== initial.reminderEnabled ||
    reminderHour !== initial.reminderHour

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error: updErr } = await supabase
      .from('profiles')
      .update({
        username: username.trim() || null,
        timezone,
        reminder_enabled: reminderEnabled,
        reminder_hour: reminderEnabled ? reminderHour : null,
      })
      .eq('id', user.id)
    setSaving(false)
    if (updErr) {
      setError(updErr.message)
      show('could not save profile', { variant: 'error' })
      return
    }
    setInitial({ username, timezone, reminderEnabled, reminderHour })
    show('profile updated')
  }

  const handleDelete = async () => {
    const typed = window.prompt(
      'this permanently deletes your account and all your mood logs.\n\ntype "delete" to confirm:',
    )
    if (typed !== 'delete') return

    setDeleting(true)
    const { error: rpcErr } = await supabase.rpc('delete_user')
    if (rpcErr) {
      setDeleting(false)
      show(`could not delete account — ${rpcErr.message}`, { variant: 'error' })
      return
    }
    await signOut()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" rounded="rounded-xl" />
        <Skeleton className="h-20" rounded="rounded-xl" />
        <Skeleton className="h-20" rounded="rounded-xl" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <FieldCard label="account">
        <div className="flex items-center justify-between gap-3">
          <span className="break-all font-mono text-sm text-neutral-200">
            {user?.email}
          </span>
          <span className="shrink-0 rounded-md border border-teal-500/20 bg-teal-500/[0.08] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-teal-300">
            verified
          </span>
        </div>
      </FieldCard>

      <FieldCard label="username" hint="how devmood greets you.">
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your name"
          maxLength={40}
          className="ring-focus w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-3 text-sm text-white placeholder-neutral-700 outline-none transition"
        />
      </FieldCard>

      <FieldCard
        label="timezone"
        hint='controls when "today" rolls over for streaks and check-ins.'
      >
        <div className="flex flex-wrap items-center gap-2">
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="ring-focus flex-1 rounded-lg border border-white/10 bg-black/30 px-3.5 py-3 font-mono text-sm text-white outline-none transition"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          {timezone !== detected && (
            <button
              type="button"
              onClick={() => setTimezone(detected)}
              className="rounded-md border border-teal-500/20 bg-teal-500/[0.06] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-teal-300 transition hover:border-teal-400/40 hover:bg-teal-500/[0.12]"
            >
              use {detected}
            </button>
          )}
        </div>
      </FieldCard>

      <FieldCard
        label="daily reminder"
        hint="a nudge if you haven't logged yet. uses the timezone above."
        rightSlot={
          <Switch
            checked={reminderEnabled}
            onChange={() => setReminderEnabled((v) => !v)}
          />
        }
      >
        {reminderEnabled && (
          <div className="mt-1 flex flex-wrap items-center gap-3 border-t border-white/[0.05] pt-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
              remind me at
            </span>
            <select
              id="reminder-hour"
              value={reminderHour}
              onChange={(e) => setReminderHour(Number(e.target.value))}
              className="ring-focus rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none transition"
            >
              {Array.from({ length: 24 }).map((_, h) => (
                <option key={h} value={h}>
                  {formatHour(h)}
                </option>
              ))}
            </select>
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600">
              {timezone}
            </span>
          </div>
        )}
      </FieldCard>

      {error && (
        <p className="text-center text-xs text-red-400">{error}</p>
      )}

      <div className="sticky bottom-28 z-10 flex items-center justify-end gap-3 sm:static sm:bottom-auto">
        {dirty && (
          <span className="mr-auto hidden font-mono text-[10px] uppercase tracking-[0.25em] text-teal-300/80 sm:inline">
            <span className="mr-1.5 inline-block h-1 w-1 animate-pulse rounded-full bg-teal-300" />
            unsaved changes
          </span>
        )}
        {dirty && (
          <button
            type="button"
            onClick={() => {
              setUsername(initial.username)
              setTimezone(initial.timezone)
              setReminderEnabled(initial.reminderEnabled)
              setReminderHour(initial.reminderHour)
            }}
            className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-neutral-400 transition hover:border-white/20 hover:text-white"
          >
            reset
          </button>
        )}
        <button
          type="submit"
          disabled={!dirty || saving}
          className="group relative overflow-hidden rounded-lg bg-teal-400 px-5 py-2.5 text-sm font-semibold text-black shadow-glow-soft transition hover:bg-teal-300 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          <span className="relative z-10">
            {saving ? 'saving…' : 'save changes →'}
          </span>
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        </button>
      </div>

      <div className="pt-6">
        <div className="hair-divider" />
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/[0.02] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-red-500/10 blur-3xl"
        />
        <div className="relative flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-red-400">
            danger zone
          </span>
          <span className="h-px flex-1 bg-red-500/20" />
        </div>
        <p className="relative mt-4 text-sm leading-relaxed text-neutral-400">
          deleting your account removes all your check-ins, streaks, badges,
          and profile data. this cannot be undone.
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="relative mt-5 rounded-lg border border-red-500/30 bg-red-500/[0.08] px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-red-300 transition hover:border-red-400/50 hover:bg-red-500/[0.15] hover:text-red-200 disabled:opacity-50"
        >
          {deleting ? 'deleting…' : 'delete account →'}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Re-usable field card + switch primitives
// ---------------------------------------------------------------------------
function FieldCard({ label, hint, rightSlot, children }) {
  return (
    <div className="surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
            {label}
          </div>
          {hint && <p className="mt-1.5 text-xs text-neutral-500">{hint}</p>}
        </div>
        {rightSlot}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 ${
        checked
          ? 'bg-teal-400 shadow-[0_0_16px_-2px_rgba(20,184,166,0.6)]'
          : 'bg-white/10'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-300 ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// GitHub connection section
// ---------------------------------------------------------------------------
function GithubSection() {
  const { user } = useAuth()
  const { show } = useToast()
  const { connection, loading, reload } = useGithubConnection()
  const [disconnecting, setDisconnecting] = useState(false)

  if (loading) return <Skeleton className="h-40" rounded="rounded-2xl" />

  const handleConnect = () => {
    try {
      beginGithubOAuth()
    } catch (e) {
      show(e.message, { variant: 'error', duration: 6000 })
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('disconnect github? your leaderboard stats will be cleared.')) return
    setDisconnecting(true)
    try {
      await disconnectGithub(user.id)
      show('github disconnected', { variant: 'info' })
      reload()
    } catch (e) {
      show(`disconnect failed — ${e.message}`, { variant: 'error' })
    } finally {
      setDisconnecting(false)
    }
  }

  if (!connection) {
    return (
      <section className="surface relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-teal-500/15 blur-3xl"
        />
        <div className="relative flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-teal-300/80">
            integrations
          </span>
          <span className="h-px flex-1 bg-white/[0.06]" />
        </div>
        <div className="relative mt-5 flex flex-wrap items-start gap-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-black/30">
            <GithubIcon className="h-6 w-6 text-neutral-200" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl italic leading-tight text-white">
              ship tracking.
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-400">
              connect github to count your merged pull requests, reviews, and
              repos touched — daily. public + private repos. you join the
              leaderboard automatically.
            </p>
            <button
              onClick={handleConnect}
              className="group relative mt-5 inline-flex items-center gap-2 overflow-hidden rounded-full bg-teal-400 px-5 py-2.5 text-sm font-semibold text-black shadow-glow-soft transition hover:bg-teal-300 hover:shadow-glow"
            >
              <GithubIcon className="h-4 w-4" />
              <span className="relative z-10">connect github →</span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="surface relative overflow-hidden border-teal-500/25 bg-gradient-to-br from-teal-500/[0.05] via-white/[0.02] to-transparent p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-teal-400/15 blur-3xl"
      />
      <div className="relative flex items-center gap-2 text-teal-300">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-teal-400/40 bg-teal-500/10">
          <svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em]">
          github · connected
        </span>
      </div>

      <div className="relative mt-5 flex flex-wrap items-center gap-4">
        {connection.github_avatar_url ? (
          <img
            src={connection.github_avatar_url}
            alt={connection.github_username}
            className="h-14 w-14 rounded-full border border-white/10 object-cover shadow-[0_0_24px_-8px_rgba(20,184,166,0.5)]"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/30">
            <GithubIcon className="h-6 w-6 text-neutral-200" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <GithubIcon className="h-4 w-4 text-neutral-300" />
            <span className="font-mono text-base text-white">
              {connection.github_username}
            </span>
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
            {connection.last_synced_at ? (
              <>last sync · {formatDistanceToNow(parseISO(connection.last_synced_at), { addSuffix: true })}</>
            ) : (
              <>awaiting first sync</>
            )}
          </p>
        </div>
      </div>

      {connection.sync_error && (
        <p className="relative mt-4 rounded-lg border border-red-500/25 bg-red-500/[0.05] p-3 text-xs text-red-300">
          last sync error: {connection.sync_error}
        </p>
      )}

      <div className="relative mt-6 flex items-center gap-3 border-t border-white/[0.05] pt-5">
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-neutral-400 transition hover:border-red-400/40 hover:bg-red-500/[0.08] hover:text-red-300 disabled:opacity-50"
        >
          {disconnecting ? 'disconnecting…' : 'disconnect'}
        </button>
        <a
          href="/leaderboard"
          className="ml-auto font-mono text-[11px] uppercase tracking-wider text-teal-300 transition hover:text-teal-200"
        >
          view leaderboard →
        </a>
      </div>
    </section>
  )
}

function GithubIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  )
}
