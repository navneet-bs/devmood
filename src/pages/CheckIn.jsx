import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMoodLog } from '../hooks/useMoodLog'
import { useToast } from '../components/Toast'
import Skeleton from '../components/Skeleton'

const ENERGY = [
  { value: 1, emoji: '😴', label: 'drained' },
  { value: 2, emoji: '😪', label: 'low' },
  { value: 3, emoji: '😌', label: 'steady' },
  { value: 4, emoji: '💪', label: 'strong' },
  { value: 5, emoji: '⚡', label: 'peak' },
]

const FOCUS = [
  { value: 1, label: 'scattered' },
  { value: 2, label: 'drifting' },
  { value: 3, label: 'neutral' },
  { value: 4, label: 'sharp' },
  { value: 5, label: 'locked in' },
]

const MOOD = [
  { value: 1, emoji: '😞', label: 'rough' },
  { value: 2, emoji: '😕', label: 'meh' },
  { value: 3, emoji: '😐', label: 'ok' },
  { value: 4, emoji: '🙂', label: 'good' },
  { value: 5, emoji: '😄', label: 'great' },
]

export default function CheckIn() {
  const { user } = useAuth()
  const { todayLog, streak, loading, saving, error, saveLog, updateLog } =
    useMoodLog()
  const { show } = useToast()

  const [username, setUsername] = useState(null)
  const [editing, setEditing] = useState(false)

  const [energy, setEnergy] = useState(3)
  const [focus, setFocus] = useState(3)
  const [mood, setMood] = useState(3)
  const [note, setNote] = useState('')
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')

  const today = useMemo(() => format(new Date(), 'EEEE, MMMM d'), [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      setUsername(data?.username || user.email?.split('@')[0] || 'friend')
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  // Seed the form with the existing log when the user clicks edit.
  useEffect(() => {
    if (editing && todayLog) {
      setEnergy(todayLog.energy)
      setFocus(todayLog.focus)
      setMood(todayLog.mood)
      setNote(todayLog.note ?? '')
      setTags(todayLog.tags ?? [])
    }
  }, [editing, todayLog])

  const addTag = (raw) => {
    const t = raw.replace(/^#+/, '').trim().toLowerCase()
    if (!t || tags.includes(t)) return
    setTags([...tags, t])
  }

  const handleTagKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
      setTagInput('')
    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags(tags.slice(0, -1))
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const payload = { energy, focus, mood, note: note.trim(), tags }
    const result =
      editing && todayLog ? await updateLog(payload) : await saveLog(payload)
    if (result.error) return

    setEditing(false)
    setTagInput('')

    if (editing) {
      show('entry updated')
      return
    }

    const next = result.streak ?? streak
    const current = next?.current_streak ?? 1
    const longest = next?.longest_streak ?? 1
    const isFirstEver = current === 1 && longest === 1
    const isMilestone = [7, 30, 100].includes(current)

    if (isFirstEver) {
      show('first check-in 🎉 welcome aboard.', {
        variant: 'milestone',
        duration: 5000,
      })
    } else if (isMilestone) {
      show(`${current} day streak! 🔥 incredible consistency.`, {
        variant: 'milestone',
        duration: 5000,
      })
    } else {
      show(`logged — streak: ${current} 🔥`)
    }
  }

  const alreadyLogged = todayLog && !editing

  return (
    <div className="relative">
      {/* ambient depth — subtle, doesn't compete with picker clarity */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -top-20 overflow-hidden"
      >
        <div
          className="absolute -left-40 top-0 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(20,184,166,0.25) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute -right-40 top-40 h-80 w-80 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(8,145,178,0.2) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="stagger relative mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
        <header className="mb-12 sm:mb-16">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-teal-300/80">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.9)]" />
            check-in
            <span className="text-neutral-700">·</span>
            <span className="tabular text-neutral-500">
              {format(new Date(), 'HH:mm')}
            </span>
          </div>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tightest sm:text-5xl">
            How's your coding energy
            <br />
            <span className="font-display italic text-teal-300">
              today
              {username && (
                <span className="not-italic text-white">, {username}</span>
              )}
            </span>
            ?
          </h1>
          <p className="mt-5 text-sm text-neutral-400 sm:text-base">
            three quick signals. add a note if something matters. close the
            tab.
          </p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
            {today}
          </p>
        </header>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28" rounded="rounded-2xl" />
          <Skeleton className="h-28" rounded="rounded-2xl" />
          <Skeleton className="h-28" rounded="rounded-2xl" />
          <Skeleton className="h-20" rounded="rounded-2xl" />
          <Skeleton className="h-12" rounded="rounded-xl" />
        </div>
      ) : alreadyLogged ? (
          <AlreadyLoggedCard
            log={todayLog}
            streak={streak}
            onEdit={() => setEditing(true)}
          />
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <Picker
              title="energy level"
              subtitleLeft="😴"
              subtitleRight="⚡"
              options={ENERGY}
              value={energy}
              onChange={setEnergy}
              variant="emoji"
            />
            <Picker
              title="focus"
              subtitleLeft="scattered"
              subtitleRight="locked in"
              options={FOCUS}
              value={focus}
              onChange={setFocus}
              variant="dot"
            />
            <Picker
              title="mood"
              subtitleLeft="rough"
              subtitleRight="great"
              options={MOOD}
              value={mood}
              onChange={setMood}
              variant="emoji"
            />

            <Card>
              <Label>
                note{' '}
                <span className="font-normal text-neutral-600">(optional)</span>
              </Label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What are you working on? Any blockers?"
                rows={3}
                className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-teal-500/60 focus:ring-2 focus:ring-teal-500/20"
              />
            </Card>

            <Card>
              <div className="flex items-baseline justify-between">
                <Label>tags</Label>
                <span className="text-xs text-neutral-600">
                  press enter to add
                </span>
              </div>
              <div className="mt-3 flex min-h-[48px] flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 transition focus-within:border-teal-500/60 focus-within:ring-2 focus-within:ring-teal-500/20">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-md border border-teal-500/20 bg-teal-500/10 px-2 py-1 text-xs text-teal-300"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="text-teal-500/70 transition hover:text-teal-200"
                      aria-label={`remove tag ${t}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKey}
                  placeholder={
                    tags.length ? '' : '#react  #debugging  #flow'
                  }
                  className="min-w-[120px] flex-1 bg-transparent py-1 text-sm text-white placeholder-neutral-600 outline-none"
                />
              </div>
            </Card>

            <div className="flex items-center gap-3 pt-1">
              {editing && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-xl border border-white/10 px-4 py-4 text-sm text-neutral-400 transition hover:bg-white/5"
                >
                  cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="group relative flex-1 overflow-hidden rounded-xl bg-teal-400 px-4 py-4 text-sm font-semibold text-black shadow-glow-soft transition-all duration-300 hover:bg-teal-300 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  {saving ? (
                    <>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-black/70" />
                      saving…
                    </>
                  ) : editing ? (
                    <>update entry →</>
                  ) : (
                    <>log today's mood →</>
                  )}
                </span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </button>
            </div>

            {error && (
              <p className="text-center text-xs text-red-400">{error}</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

function Card({ children }) {
  return <div className="surface p-5">{children}</div>
}

function Label({ children }) {
  return (
    <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-400">
      {children}
    </h2>
  )
}

function Picker({ title, subtitleLeft, subtitleRight, options, value, onChange, variant }) {
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <Label>{title}</Label>
        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600">
          {subtitleLeft}{' '}
          <span className="text-neutral-700">→</span> {subtitleRight}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-5 gap-2">
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`group relative flex flex-col items-center gap-2 rounded-xl border py-3.5 transition-all duration-200 ${
                active
                  ? 'border-teal-400/60 bg-teal-500/10 shadow-glow-soft'
                  : 'border-white/10 bg-white/[0.02] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              {active && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  style={{
                    background:
                      'radial-gradient(circle at center, rgba(20,184,166,0.15) 0%, transparent 70%)',
                  }}
                />
              )}
              {variant === 'emoji' ? (
                <div
                  className={`text-2xl transition-all duration-300 ${
                    active
                      ? 'scale-110 drop-shadow-[0_0_12px_rgba(20,184,166,0.6)]'
                      : 'group-hover:scale-105'
                  }`}
                >
                  {opt.emoji}
                </div>
              ) : (
                <FocusDot level={opt.value} active={active} />
              )}
              <div
                className={`relative font-mono text-[9px] font-medium uppercase tracking-wider ${
                  active ? 'text-teal-200' : 'text-neutral-500'
                }`}
              >
                {opt.label}
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function FocusDot({ level, active }) {
  const size = 6 + level * 3
  return (
    <div className="flex h-8 items-center justify-center">
      <div
        style={{ width: size, height: size }}
        className={`rounded-full transition ${
          active
            ? 'bg-teal-400 shadow-[0_0_12px_#14b8a6]'
            : 'bg-neutral-600 group-hover:bg-neutral-500'
        }`}
      />
    </div>
  )
}

function AlreadyLoggedCard({ log, streak, onEdit }) {
  return (
    <div className="surface relative overflow-hidden border-teal-500/25 bg-gradient-to-br from-teal-500/[0.08] via-white/[0.02] to-transparent p-6 sm:p-8">
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
          logged · {format(new Date(), 'HH:mm')}
        </span>
      </div>

      <p className="relative mt-4 font-display text-2xl italic leading-snug text-white sm:text-3xl">
        today is captured.
      </p>

      <div className="relative mt-6 grid grid-cols-3 gap-2">
        <Stat label="energy" value={log.energy} />
        <Stat label="focus" value={log.focus} />
        <Stat label="mood" value={log.mood} />
      </div>

      {log.note && (
        <p className="relative mt-5 whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-black/30 p-4 text-sm leading-relaxed text-neutral-300">
          {log.note}
        </p>
      )}

      {log.tags?.length > 0 && (
        <div className="relative mt-4 flex flex-wrap gap-2">
          {log.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-neutral-300"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="relative mt-6 flex items-center justify-between border-t border-white/[0.05] pt-5">
        {streak && (
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
            <span className="text-base">🔥</span>
            <span className="tabular text-teal-300">
              {streak.current_streak}
            </span>
            <span>day{streak.current_streak === 1 ? '' : 's'}</span>
          </div>
        )}
        <button
          onClick={onEdit}
          className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-neutral-300 transition hover:border-teal-400/40 hover:bg-teal-500/[0.08] hover:text-teal-300"
        >
          edit →
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3 text-center">
      <div className="tabular font-mono text-3xl font-semibold text-teal-300">
        {value}
        <span className="text-sm text-neutral-600">/5</span>
      </div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </div>
    </div>
  )
}
