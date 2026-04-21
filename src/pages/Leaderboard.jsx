import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLeaderboard } from '../hooks/useLeaderboard'
import Skeleton from '../components/Skeleton'
import ErrorBoundary from '../components/ErrorBoundary'

const RANGES = [
  { value: 'daily', label: 'daily', sub: 'yesterday' },
  { value: 'weekly', label: 'weekly', sub: 'last 7 days' },
  { value: 'all', label: 'all-time', sub: 'since connect' },
]

export default function Leaderboard() {
  const [range, setRange] = useState('weekly')

  return (
    <div className="stagger mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-neutral-500">
          leaderboard
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tightest sm:text-5xl">
          <span className="text-white">who</span>{' '}
          <span className="font-display italic text-teal-300">shipped.</span>
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          connected devs, ranked by merged pull requests. opt in by connecting
          github from your <Link to="/profile" className="text-teal-300 hover:underline">profile</Link>.
        </p>
      </header>

      <div className="mt-10">
        <RangePicker range={range} setRange={setRange} />
      </div>

      <div className="mt-8">
        <ErrorBoundary title="leaderboard unavailable.">
          <Rankings range={range} />
        </ErrorBoundary>
      </div>
    </div>
  )
}

function RangePicker({ range, setRange }) {
  return (
    <div className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.02] p-1 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
      {RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => setRange(r.value)}
          className={`relative rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-all ${
            range === r.value
              ? 'bg-teal-500/15 text-teal-200 shadow-[0_0_16px_-4px_rgba(20,184,166,0.4)]'
              : 'text-neutral-500 hover:text-neutral-200'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

function Rankings({ range }) {
  const { user } = useAuth()
  const { rows, stats, loading } = useLeaderboard({ range })

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16" rounded="rounded-xl" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="surface p-12 text-center">
        <p className="font-display text-2xl italic text-neutral-200">
          the board is empty.
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          {range === 'all'
            ? 'no connected users yet.'
            : 'no merged pull requests in this window.'}
        </p>
        <Link
          to="/profile"
          className="mt-6 inline-block rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-black shadow-glow-soft transition hover:bg-teal-300 hover:shadow-glow"
        >
          connect github →
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Summary label="devs" value={stats.totalUsers} />
        <Summary label="prs merged" value={stats.totalMerged} highlight />
        <Summary label="reviews" value={stats.totalReviews} />
      </div>

      <div className="surface divide-y divide-white/[0.05] overflow-hidden p-0">
        {rows.map((row, i) => (
          <Row
            key={row.user_id}
            rank={i + 1}
            row={row}
            isSelf={row.user_id === user?.id}
          />
        ))}
      </div>
    </>
  )
}

function Summary({ label, value, highlight = false }) {
  return (
    <div className="surface p-4 sm:p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
        {label}
      </div>
      <div
        className={`tabular mt-3 font-mono text-3xl font-semibold ${
          highlight ? 'text-teal-300' : 'text-white'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function Row({ rank, row, isSelf }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
  return (
    <div
      className={`group flex items-center gap-4 p-4 transition-colors sm:gap-5 sm:p-5 ${
        isSelf
          ? 'bg-teal-500/[0.04] hover:bg-teal-500/[0.07]'
          : 'hover:bg-white/[0.015]'
      }`}
    >
      <div className="flex min-w-[40px] items-center justify-center">
        {medal ? (
          <span className="text-2xl drop-shadow-[0_0_12px_rgba(20,184,166,0.4)]">
            {medal}
          </span>
        ) : (
          <span className="tabular font-mono text-sm text-neutral-600">
            {String(rank).padStart(2, '0')}
          </span>
        )}
      </div>

      {row.github_avatar_url ? (
        <img
          src={row.github_avatar_url}
          alt={row.github_username}
          className={`h-10 w-10 rounded-full border object-cover transition-transform group-hover:scale-105 ${
            rank === 1
              ? 'border-teal-300/60 shadow-[0_0_20px_-4px_rgba(20,184,166,0.6)]'
              : 'border-white/10'
          }`}
        />
      ) : (
        <div className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.03]" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-white">
            {row.github_username}
          </span>
          {isSelf && (
            <span className="rounded-full border border-teal-400/40 bg-teal-500/[0.12] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-teal-200">
              you
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[11px] text-neutral-500">
          <span>
            <span className="tabular text-teal-300">{row.reviews_given}</span>{' '}
            reviews
          </span>
          {row.days_active > 0 && (
            <span>
              <span className="tabular text-neutral-300">
                {row.days_active}
              </span>{' '}
              day{row.days_active === 1 ? '' : 's'} active
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div
          className={`tabular font-mono text-3xl font-semibold leading-none ${
            rank === 1 ? 'text-teal-200' : 'text-white'
          }`}
        >
          {row.merged_prs}
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-600">
          prs
        </div>
      </div>
    </div>
  )
}
