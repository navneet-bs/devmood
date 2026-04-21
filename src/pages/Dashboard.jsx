import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import { useRecap } from '../hooks/useRecap'
import { useGithubConnection } from '../hooks/useGithubConnection'
import { useGithubStats } from '../hooks/useGithubStats'
import { useToast } from '../components/Toast'
import MoodHeatmap from '../components/MoodHeatmap'
import ErrorBoundary from '../components/ErrorBoundary'
import Skeleton, { DashboardSkeleton } from '../components/Skeleton'

// Lazy — html2canvas is ~50KB gzip; only load when user clicks Share.
const ShareCardModal = lazy(() => import('../components/ShareCardModal'))

const MOOD_EMOJI = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' }

export default function Dashboard() {
  const { user } = useAuth()
  const { profile, streak, recent, stats, logs, loading, error } =
    useDashboard()
  const [shareOpen, setShareOpen] = useState(false)

  const username =
    profile?.username || user?.email?.split('@')[0] || 'friend'

  return (
    <div className="stagger mx-auto max-w-5xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10">
      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6 text-center">
          <p className="text-sm text-red-300">could not load dashboard.</p>
          <p className="mt-1 text-xs text-neutral-500">{error}</p>
        </div>
      ) : (
        <>
          <ErrorBoundary title="streak unavailable.">
            <StreakHero
              streak={streak}
              onShare={() => setShareOpen(true)}
            />
          </ErrorBoundary>

          {shareOpen && (
            <Suspense fallback={null}>
              <ShareCardModal
                open={shareOpen}
                onClose={() => setShareOpen(false)}
                streak={streak?.current_streak ?? 0}
                username={username}
                logs={logs}
              />
            </Suspense>
          )}

          <ErrorBoundary title="recap unavailable.">
            <RecapCard />
          </ErrorBoundary>

          <ErrorBoundary title="stats unavailable.">
            <StatsGrid stats={stats} />
          </ErrorBoundary>

          <ErrorBoundary title="github card unavailable.">
            <GithubCard />
          </ErrorBoundary>

          <ErrorBoundary title="activity heatmap unavailable.">
            <HeatmapCard logs={logs} />
          </ErrorBoundary>

          <ErrorBoundary title="recent entries unavailable.">
            <RecentEntries entries={recent} />
          </ErrorBoundary>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Streak hero
// ---------------------------------------------------------------------------
function StreakHero({ streak, onShare }) {
  const current = streak?.current_streak ?? 0
  const longest = streak?.longest_streak ?? 0

  return (
    <section className="surface relative overflow-hidden p-6 sm:p-10">
      {/* Layered ambient light */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-teal-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse at 85% 0%, rgba(20,184,166,0.08) 0%, transparent 50%)',
        }}
      />

      {current > 0 && (
        <button
          onClick={onShare}
          className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-neutral-400 transition hover:border-teal-500/40 hover:bg-teal-500/[0.06] hover:text-teal-300"
          aria-label="share streak"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          share
        </button>
      )}

      <div className="relative">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
          current streak
        </div>
        <div className="mt-4 flex items-baseline gap-4">
          <span className="text-5xl sm:text-6xl">🔥</span>
          <div className="flex items-baseline gap-3">
            <span className="tabular font-mono text-7xl font-semibold leading-none tracking-tightest text-white sm:text-8xl">
              {current}
            </span>
            <span className="font-mono text-sm uppercase tracking-[0.25em] text-neutral-500">
              {current === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 font-mono text-xs text-neutral-500">
          <span className="uppercase tracking-[0.2em]">longest</span>
          <span className="tabular text-teal-300">
            {longest} {longest === 1 ? 'day' : 'days'}
          </span>
        </div>

        <p className="mt-7 max-w-md font-display text-xl italic leading-relaxed text-neutral-300">
          {motivation(current)}
        </p>
      </div>
    </section>
  )
}

function motivation(n) {
  if (n === 0) return 'ready when you are — log your first check-in.'
  if (n === 1) return 'first day down. show up tomorrow and it starts to count.'
  if (n <= 3) return "you're building momentum. nice rhythm."
  if (n <= 6) return 'getting into a groove. keep showing up.'
  if (n === 7) return 'one week strong 💪'
  if (n < 14) return 'consistency is compounding.'
  if (n < 30) return 'this is a habit now. impressive.'
  if (n < 60) return 'a full month-plus in. serious discipline.'
  if (n < 100) return 'rare air. very few make it this far.'
  return 'legendary dedication 🏆'
}

// ---------------------------------------------------------------------------
// Stats grid
// ---------------------------------------------------------------------------
function StatsGrid({ stats }) {
  const fmt = (v) => (v == null ? '—' : v.toFixed(1))
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="avg energy" sub="last 7 days" value={fmt(stats.avgEnergyWeek)} suffix="/5" />
      <StatCard label="avg focus" sub="last 7 days" value={fmt(stats.avgFocusWeek)} suffix="/5" />
      <StatCard label="logs" sub="this month" value={String(stats.monthlyTotal)} />
      <StatCard
        label="best day"
        sub={stats.bestDay ? `avg mood ${stats.bestDay.avgMood.toFixed(1)}` : 'not enough data'}
        value={stats.bestDay ? stats.bestDay.name.slice(0, 3) : '—'}
      />
    </section>
  )
}

function StatCard({ label, sub, value, suffix }) {
  return (
    <div className="surface surface-hover p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </div>
      <div className="tabular mt-3 font-mono text-3xl font-semibold tracking-tight text-white">
        {value}
        {suffix && (
          <span className="ml-0.5 text-base font-normal text-neutral-600">
            {suffix}
          </span>
        )}
      </div>
      <div className="mt-1.5 text-xs text-neutral-500">{sub}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Heatmap card
// ---------------------------------------------------------------------------
function HeatmapCard({ logs }) {
  return (
    <section className="surface p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
            activity
          </h2>
          <p className="mt-1.5 text-sm text-neutral-300">last 6 months</p>
        </div>
        <Legend />
      </div>
      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <MoodHeatmap logs={logs} />
      </div>
    </section>
  )
}

function Legend() {
  const swatches = ['#1a1a1a', '#0d3d30', '#0f6e56', '#14b8a6', '#5eead4', '#99f6e4']
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
      <span>less</span>
      {swatches.map((c) => (
        <div
          key={c}
          className="h-[10px] w-[10px] rounded-[2px] transition-transform hover:scale-125"
          style={{ background: c }}
        />
      ))}
      <span>more</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recent entries
// ---------------------------------------------------------------------------
function RecentEntries({ entries }) {
  if (entries.length === 0) {
    return (
      <section className="surface p-10 text-center">
        <div className="mx-auto mb-3 h-10 w-10 rounded-full border border-white/10 bg-white/[0.02]" />
        <p className="font-display text-lg italic text-neutral-300">
          the page is blank.
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          your history starts with one check-in.
        </p>
        <Link
          to="/log"
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-teal-400 px-4 py-2 text-sm font-medium text-black shadow-glow-soft transition hover:bg-teal-300 hover:shadow-glow"
        >
          begin →
        </Link>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
          recent
        </h2>
        <Link
          to="/history"
          className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 transition hover:text-teal-300"
        >
          see all →
        </Link>
      </div>
      <div className="surface divide-y divide-white/[0.05] overflow-hidden p-0">
        {entries.map((e) => (
          <RecentRow key={e.id} entry={e} />
        ))}
      </div>
    </section>
  )
}

function RecentRow({ entry }) {
  const d = parseISO(entry.logged_at)
  return (
    <div className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.015] sm:gap-4">
      <div className="text-xl transition-transform duration-300 group-hover:scale-110 sm:text-2xl">
        {MOOD_EMOJI[entry.mood]}
      </div>
      <div className="min-w-[72px] sm:min-w-[96px]">
        <div className="text-sm text-neutral-200">{format(d, 'MMM d')}</div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
          {format(d, 'EEE')}
        </div>
      </div>
      <div className="flex gap-3 font-mono text-[11px] text-neutral-500">
        <span>
          E <span className="tabular text-teal-300">{entry.energy}</span>
        </span>
        <span>
          F <span className="tabular text-teal-300">{entry.focus}</span>
        </span>
        <span>
          M <span className="tabular text-teal-300">{entry.mood}</span>
        </span>
      </div>
      <div className="flex-1 truncate text-xs text-neutral-400">
        {entry.note || <span className="italic text-neutral-700">—</span>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Weekly recap (Claude-generated insights)
// ---------------------------------------------------------------------------
function RecapCard() {
  const { recap, loading, generating, error, generate } = useRecap()
  const { show } = useToast()

  const handleGenerate = async () => {
    const res = await generate()
    if (res.error) {
      if (res.code === 'no_logs') {
        show('log a check-in first, then generate a recap.', {
          variant: 'info',
        })
      } else if (res.code === 'rate_limited') {
        show('rate limited — try again shortly.', { variant: 'error' })
      } else {
        show(`couldn't generate: ${res.error}`, { variant: 'error' })
      }
    } else {
      show('fresh recap generated ✨', { variant: 'milestone' })
    }
  }

  if (loading) {
    return <Skeleton className="h-60" rounded="rounded-2xl" />
  }

  if (!recap) {
    return (
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-teal-400 sm:text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_#14b8a6]" />
          weekly recap
        </div>
        <p className="mt-3 text-sm text-neutral-400">
          personalized insights about your coding patterns, generated from
          your last 7 check-ins.
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="mt-5 rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? 'generating…' : 'generate recap'}
        </button>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </section>
    )
  }

  const generatedAt = parseISO(recap.generated_at)

  return (
    <section className="relative overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/[0.06] via-white/[0.02] to-transparent p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-teal-500/15 blur-3xl"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-teal-400 sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_#14b8a6]" />
            weekly recap
          </div>
          <p className="mt-3 text-base text-neutral-100 sm:text-lg">
            {recap.summary}
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-neutral-400 transition hover:border-teal-500/40 hover:text-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="regenerate recap"
        >
          {generating ? '…' : '↻ regenerate'}
        </button>
      </div>

      <ul className="relative mt-6 space-y-3">
        {(recap.insights ?? []).map((ins, i) => (
          <li
            key={i}
            className="rounded-xl border border-white/[0.06] bg-black/25 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-teal-500/30 bg-teal-500/10 text-[10px] font-semibold text-teal-300">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-white">{ins.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-400">
                  {ins.body}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="relative mt-5 text-[11px] text-neutral-600">
        generated {formatDistanceToNow(generatedAt, { addSuffix: true })} · from{' '}
        {recap.log_count} check-in{recap.log_count === 1 ? '' : 's'}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// GitHub card — shows user's last-7-day PR/review stats or a connect prompt
// ---------------------------------------------------------------------------
function GithubCard() {
  const { connection, loading: connLoading } = useGithubConnection()
  const { totals, rows, loading: statsLoading } = useGithubStats({ days: 7 })

  if (connLoading) {
    return <Skeleton className="h-32" rounded="rounded-2xl" />
  }

  // Not connected — compact prompt
  if (!connection) {
    return (
      <section className="surface relative overflow-hidden p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-500/10 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30">
            <svg className="h-5 w-5 text-neutral-200" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
              github
            </div>
            <p className="mt-1.5 text-sm text-neutral-300">
              <span className="text-white">connect to track merged PRs</span>
              <span className="text-neutral-600"> · join the leaderboard</span>
            </p>
          </div>
          <Link
            to="/profile"
            className="shrink-0 rounded-lg border border-teal-500/30 bg-teal-500/[0.08] px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-teal-300 transition hover:border-teal-400/50 hover:bg-teal-500/[0.14] hover:text-teal-200"
          >
            connect →
          </Link>
        </div>
      </section>
    )
  }

  // Connected — show stats with a tiny bar chart
  const max = Math.max(1, ...rows.map((r) => r.merged_prs))

  return (
    <section className="surface relative overflow-hidden p-5 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-teal-500/10 blur-3xl"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            ship tracking · last 7 days
          </div>
          <div className="mt-3 flex items-baseline gap-5">
            <Metric label="merged" value={totals.merged_prs} highlight />
            <Metric label="reviews" value={totals.reviews_given} />
            <Metric label="repos" value={totals.repos_touched} />
          </div>
        </div>

        <Link
          to="/leaderboard"
          className="shrink-0 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-neutral-300 transition hover:border-teal-400/40 hover:bg-teal-500/[0.08] hover:text-teal-300"
        >
          leaderboard →
        </Link>
      </div>

      {/* tiny 7-day bar chart */}
      {!statsLoading && (
        <div className="relative mt-5 flex h-10 items-end gap-1">
          {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10)
            const day = rows.find((r) => r.date === date)
            const count = day?.merged_prs ?? 0
            const h = count > 0 ? Math.max(18, (count / max) * 100) : 8
            return (
              <div
                key={i}
                className="group/bar relative flex-1"
                title={`${date} — ${count} PR${count === 1 ? '' : 's'}`}
              >
                <div
                  className={`w-full rounded-sm transition-all ${
                    count > 0
                      ? 'bg-teal-400 shadow-[0_0_8px_-2px_rgba(20,184,166,0.5)]'
                      : 'bg-white/[0.06]'
                  }`}
                  style={{ height: `${h}%` }}
                />
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Metric({ label, value, highlight = false }) {
  return (
    <div>
      <div
        className={`tabular font-mono text-2xl font-semibold leading-none ${
          highlight ? 'text-teal-300' : 'text-white'
        }`}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </div>
    </div>
  )
}
