import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useHistory } from '../hooks/useHistory'
import { useToast } from '../components/Toast'
import ErrorBoundary from '../components/ErrorBoundary'
import { HistorySkeleton } from '../components/Skeleton'

const RANGES = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'all' },
]

const COLORS = {
  energy: '#14b8a6',
  focus: '#5eead4',
  mood: '#0f6e56',
}

const PAGE_SIZE = 10

export default function History() {
  const [range, setRange] = useState('30d')
  const [tag, setTag] = useState(null)
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState(null)

  const { show } = useToast()

  const {
    logs,
    loading,
    timeSeries,
    weeklyPattern,
    tagCounts,
    allTags,
    deleteLog,
    updateLog,
  } = useHistory({ range, tag })

  useEffect(() => {
    setPage(0)
  }, [range, tag])

  const pageCount = Math.max(1, Math.ceil(logs.length / PAGE_SIZE))
  const pageSlice = logs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return
    const res = await deleteLog(id)
    if (res.error) show(`could not delete — ${res.error}`, { variant: 'error' })
    else show('entry deleted', { variant: 'info' })
  }

  return (
    <div className="stagger mx-auto max-w-5xl space-y-6 px-4 py-10 sm:space-y-8 sm:px-6 sm:py-16">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-neutral-500">
          archive
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tightest sm:text-5xl">
          <span className="text-white">your</span>{' '}
          <span className="font-display italic text-teal-300">history.</span>
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          the raw record — trends, patterns, and every check-in you've logged.
        </p>
      </header>

      <FilterBar
        range={range}
        setRange={setRange}
        tag={tag}
        setTag={setTag}
        allTags={allTags}
      />

      {loading ? (
        <HistorySkeleton />
      ) : logs.length === 0 ? (
        <EmptyState hasTag={!!tag} onClear={() => setTag(null)} />
      ) : (
        <>
          <ErrorBoundary title="trends chart unavailable.">
            <ChartCard title="trends" subtitle="energy · focus · mood over time">
              <TrendsChart data={timeSeries} />
            </ChartCard>
          </ErrorBoundary>

          <ErrorBoundary title="weekly pattern unavailable.">
            <ChartCard title="weekly pattern" subtitle="avg by day of week">
              <WeeklyPatternChart data={weeklyPattern} />
            </ChartCard>
          </ErrorBoundary>

          {tagCounts.length > 0 && (
            <ErrorBoundary title="tag cloud unavailable.">
              <TopTags tagCounts={tagCounts} onPick={setTag} active={tag} />
            </ErrorBoundary>
          )}

          <ErrorBoundary title="entry list unavailable.">
            <EntriesSection
              entries={pageSlice}
              total={logs.length}
              page={page}
              pageCount={pageCount}
              onPage={setPage}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          </ErrorBoundary>
        </>
      )}

      {editing && (
        <EditModal
          log={editing}
          onClose={() => setEditing(null)}
          onSave={async (updates) => {
            const res = await updateLog(editing.id, updates)
            if (res.error) {
              show(`could not save — ${res.error}`, { variant: 'error' })
              return
            }
            show('entry updated')
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------
function FilterBar({ range, setRange, tag, setTag, allTags }) {
  return (
    <section className="flex flex-wrap items-center gap-3">
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

      {allTags.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={tag ?? ''}
              onChange={(e) => setTag(e.target.value || null)}
              className="ring-focus appearance-none rounded-full border border-white/[0.08] bg-white/[0.02] py-1.5 pl-4 pr-9 font-mono text-[11px] uppercase tracking-wider text-neutral-300 outline-none transition hover:border-white/20"
            >
              <option value="">all tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
            <svg
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
          {tag && (
            <button
              onClick={() => setTag(null)}
              className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 transition hover:text-teal-300"
            >
              clear ×
            </button>
          )}
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------
function ChartCard({ title, subtitle, children }) {
  return (
    <section className="surface p-5 sm:p-6">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
            {title}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-sm text-neutral-300">{subtitle}</p>
          )}
        </div>
        <Legend />
      </div>
      <div className="h-[240px] w-full">{children}</div>
    </section>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
      {Object.entries(COLORS).map(([k, c]) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: c, boxShadow: `0 0 6px ${c}60` }}
          />
          {k}
        </span>
      ))}
    </div>
  )
}

function TrendsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#1f1f1f" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="#404040"
          tick={{ fill: '#737373', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          stroke="#404040"
          tick={{ fill: '#737373', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ stroke: '#404040', strokeDasharray: '3 3' }}
        />
        <Line
          type="monotone"
          dataKey="energy"
          stroke={COLORS.energy}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: '#0f0f0f', strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="focus"
          stroke={COLORS.focus}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: '#0f0f0f', strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="mood"
          stroke={COLORS.mood}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: '#0f0f0f', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function WeeklyPatternChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#1f1f1f" vertical={false} />
        <XAxis
          dataKey="day"
          stroke="#404040"
          tick={{ fill: '#737373', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 5]}
          ticks={[0, 1, 2, 3, 4, 5]}
          stroke="#404040"
          tick={{ fill: '#737373', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
        />
        <Bar dataKey="energy" fill={COLORS.energy} radius={[2, 2, 0, 0]} />
        <Bar dataKey="focus" fill={COLORS.focus} radius={[2, 2, 0, 0]} />
        <Bar dataKey="mood" fill={COLORS.mood} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-white/10 bg-black/90 px-3 py-2 text-xs text-neutral-200 shadow-lg backdrop-blur">
      <div className="font-medium text-white">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="mt-1 flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-neutral-400">{p.dataKey}</span>
          <span className="ml-3 font-medium text-white">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Top tags cloud
// ---------------------------------------------------------------------------
function TopTags({ tagCounts, onPick, active }) {
  const max = tagCounts[0].count
  const min = tagCounts[tagCounts.length - 1].count
  const scale = (c) => (max === min ? 0.5 : (c - min) / (max - min))

  return (
    <section className="surface p-5 sm:p-6">
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
            top tags
          </div>
          <p className="mt-1.5 text-sm text-neutral-300">
            size reflects frequency
          </p>
        </div>
        <span className="tabular font-mono text-[10px] uppercase tracking-wider text-neutral-500">
          {tagCounts.length} total
        </span>
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        {tagCounts.map(({ tag, count }) => {
          const s = scale(count)
          const fontSize = 12 + s * 14 // 12–26px
          const isActive = active === tag
          return (
            <button
              key={tag}
              onClick={() => onPick(isActive ? null : tag)}
              className={`inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1 font-mono tracking-tight transition-all duration-200 hover:-translate-y-0.5 ${
                isActive
                  ? 'border-teal-300/70 bg-teal-400/20 text-teal-100 shadow-glow-soft'
                  : 'border-teal-500/20 bg-teal-500/[0.08] text-teal-300 hover:border-teal-400/50 hover:bg-teal-500/15'
              }`}
              style={{
                fontSize,
                opacity: 0.55 + s * 0.45,
              }}
            >
              #{tag}
              <span className="tabular text-[10px] text-teal-400/70">
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Entries list
// ---------------------------------------------------------------------------
function EntriesSection({
  entries,
  total,
  page,
  pageCount,
  onPage,
  onEdit,
  onDelete,
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
            entries
          </div>
          <p className="mt-1.5 text-sm text-neutral-300">
            every check-in, newest first
          </p>
        </div>
        <span className="tabular font-mono text-[10px] uppercase tracking-wider text-neutral-500">
          {total} total
        </span>
      </div>
      <div className="surface divide-y divide-white/[0.05] overflow-hidden p-0">
        {entries.map((e) => (
          <EntryRow
            key={e.id}
            entry={e}
            onEdit={() => onEdit(e)}
            onDelete={() => onDelete(e.id)}
          />
        ))}
      </div>

      {pageCount > 1 && (
        <div className="mt-5 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-neutral-500">
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 0}
            className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-1.5 transition hover:border-teal-400/40 hover:text-teal-300 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-neutral-500"
          >
            ← prev
          </button>
          <span className="tabular">
            page <span className="text-teal-300">{page + 1}</span> of {pageCount}
          </span>
          <button
            onClick={() => onPage(page + 1)}
            disabled={page >= pageCount - 1}
            className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-1.5 transition hover:border-teal-400/40 hover:text-teal-300 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-neutral-500"
          >
            next →
          </button>
        </div>
      )}
    </section>
  )
}

function EntryRow({ entry, onEdit, onDelete }) {
  const d = parseISO(entry.logged_at)
  return (
    <div className="group flex flex-col gap-3 p-4 transition-colors hover:bg-white/[0.015] sm:flex-row sm:items-center sm:gap-5 sm:p-5">
      <div className="flex min-w-[80px] flex-col sm:pr-2">
        <span className="text-base text-neutral-100">{format(d, 'MMM d')}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
          {format(d, 'EEE')}
        </span>
      </div>

      <div className="flex shrink-0 gap-1.5">
        <ScoreBadge label="E" value={entry.energy} />
        <ScoreBadge label="F" value={entry.focus} />
        <ScoreBadge label="M" value={entry.mood} />
      </div>

      <div className="min-w-0 flex-1">
        {entry.note && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
            {entry.note}
          </p>
        )}
        {entry.tags?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-neutral-400"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
        {!entry.note && !(entry.tags?.length > 0) && (
          <span className="font-display text-sm italic text-neutral-600">—</span>
        )}
      </div>

      <div className="flex shrink-0 gap-2 font-mono text-[11px] uppercase tracking-wider sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-neutral-300 transition hover:border-teal-400/40 hover:bg-teal-500/[0.08] hover:text-teal-300"
        >
          edit
        </button>
        <button
          onClick={onDelete}
          className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-neutral-300 transition hover:border-red-400/40 hover:bg-red-500/[0.08] hover:text-red-300"
        >
          delete
        </button>
      </div>
    </div>
  )
}

function ScoreBadge({ label, value }) {
  const tone =
    value >= 4
      ? 'border-teal-500/30 bg-teal-500/[0.08] text-teal-200 shadow-[0_0_12px_-4px_rgba(20,184,166,0.4)]'
      : value >= 3
        ? 'border-white/10 bg-white/[0.03] text-neutral-300'
        : 'border-orange-500/25 bg-orange-500/[0.06] text-orange-300'
  return (
    <div
      className={`flex h-11 w-11 flex-col items-center justify-center rounded-lg border transition-transform group-hover:scale-105 ${tone}`}
    >
      <span className="font-mono text-[9px] uppercase tracking-wider opacity-60">
        {label}
      </span>
      <span className="tabular -mt-0.5 font-mono text-base font-semibold">
        {value}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ hasTag, onClear }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-12 text-center">
      <p className="text-sm text-neutral-400">
        {hasTag ? 'no entries match this tag.' : 'no entries in this range yet.'}
      </p>
      {hasTag ? (
        <button
          onClick={onClear}
          className="mt-3 text-xs text-teal-400 hover:text-teal-300"
        >
          clear filter
        </button>
      ) : (
        <Link
          to="/log"
          className="mt-3 inline-block text-xs text-teal-400 hover:text-teal-300"
        >
          log a check-in →
        </Link>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Edit modal
// ---------------------------------------------------------------------------
function EditModal({ log, onClose, onSave }) {
  const [energy, setEnergy] = useState(log.energy)
  const [focus, setFocus] = useState(log.focus)
  const [mood, setMood] = useState(log.mood)
  const [note, setNote] = useState(log.note ?? '')
  const [tagsText, setTagsText] = useState(
    (log.tags ?? []).map((t) => `#${t}`).join(' '),
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const tags = [
      ...new Set(
        tagsText
          .split(/[\s,]+/)
          .map((t) => t.replace(/^#+/, '').trim().toLowerCase())
          .filter(Boolean),
      ),
    ]
    setSaving(true)
    await onSave({ energy, focus, mood, note: note.trim() || null, tags })
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151515] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-medium text-white">edit entry</h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              {format(parseISO(log.logged_at), 'EEE, MMM d yyyy')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none text-neutral-500 transition hover:text-white"
            aria-label="close"
          >
            ×
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <RatingRow label="energy" value={energy} onChange={setEnergy} />
          <RatingRow label="focus" value={focus} onChange={setFocus} />
          <RatingRow label="mood" value={mood} onChange={setMood} />

          <div>
            <label className="text-xs text-neutral-400">note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="what were you working on?"
              className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-teal-500/60 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400">tags</label>
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="#react #flow"
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-teal-500/60 focus:ring-2 focus:ring-teal-500/20"
            />
            <p className="mt-1 text-[10px] text-neutral-600">
              separate with spaces or commas
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-neutral-400 transition hover:text-white"
          >
            cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-teal-400 disabled:opacity-60"
          >
            {saving ? 'saving…' : 'save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RatingRow({ label, value, onChange }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-xs text-neutral-400">{label}</label>
        <span className="text-xs text-teal-400">{value}/5</span>
      </div>
      <div className="mt-1.5 grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`rounded-md border py-2 text-sm transition ${
              value === n
                ? 'border-teal-500 bg-teal-500/10 text-teal-300'
                : 'border-white/10 bg-white/[0.02] text-neutral-500 hover:border-white/20'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
