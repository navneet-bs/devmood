import { differenceInCalendarDays, format, parseISO } from 'date-fns'

// Badge catalog + derivation. All badges are computed client-side from the
// user's mood_logs — unlockedAt is the timestamp of the log that triggered it.

export const BADGES = [
  {
    id: 'first_log',
    title: 'First Log',
    description: 'Your first check-in.',
    icon: '🌱',
  },
  {
    id: 'seven_day_streak',
    title: '7-Day Streak',
    description: 'One full week of consistency.',
    icon: '🔥',
    target: 7,
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Logged after midnight.',
    icon: '🦉',
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Logged before 7am.',
    icon: '🐦',
  },
  {
    id: 'flow_master',
    title: 'Flow Master',
    description: '10 days with focus locked in.',
    icon: '🎯',
    target: 10,
  },
  {
    id: 'consistent',
    title: 'Consistent',
    description: '30 check-ins in a single month.',
    icon: '📅',
    target: 30,
  },
]

// Night Owl: hours 0–4 (post-midnight coding)
// Early Bird: hours 5–6 (genuinely early start, non-overlapping with Night Owl)
const isNightOwl = (d) => d.getHours() >= 0 && d.getHours() < 5
const isEarlyBird = (d) => d.getHours() >= 5 && d.getHours() < 7

// Returns [{ ...badge, unlockedAt, progress }] in catalog order.
// `logs` should contain at minimum { logged_at, focus }. Order doesn't matter;
// we sort internally.
export function evaluateBadges(logs) {
  const sorted = [...logs].sort((a, b) =>
    a.logged_at.localeCompare(b.logged_at),
  )

  const unlock = {}
  const progress = {}

  // --- First Log ---
  if (sorted.length > 0) unlock.first_log = sorted[0].logged_at

  // --- Night Owl / Early Bird (first qualifying log) ---
  for (const l of sorted) {
    const d = parseISO(l.logged_at)
    if (!unlock.night_owl && isNightOwl(d)) unlock.night_owl = l.logged_at
    if (!unlock.early_bird && isEarlyBird(d)) unlock.early_bird = l.logged_at
    if (unlock.night_owl && unlock.early_bird) break
  }

  // --- 7-Day Streak (first day the running streak hit 7) ---
  // Collapse logs to unique calendar days, then walk them.
  const daySet = new Map() // yyyy-MM-dd → first log of that day
  for (const l of sorted) {
    const day = format(parseISO(l.logged_at), 'yyyy-MM-dd')
    if (!daySet.has(day)) daySet.set(day, l)
  }
  const days = [...daySet.keys()].sort()

  let run = 0
  let maxRun = 0
  let prev = null
  for (const day of days) {
    const dDate = parseISO(day)
    if (prev) {
      run = differenceInCalendarDays(dDate, prev) === 1 ? run + 1 : 1
    } else {
      run = 1
    }
    maxRun = Math.max(maxRun, run)
    if (run === 7 && !unlock.seven_day_streak) {
      unlock.seven_day_streak = daySet.get(day).logged_at
    }
    prev = dDate
  }
  progress.seven_day_streak = { current: Math.min(maxRun, 7), target: 7 }

  // --- Flow Master (10 unique days with focus === 5) ---
  const flowDays = new Set()
  let flowMasterAt = null
  for (const l of sorted) {
    if (l.focus !== 5) continue
    const day = format(parseISO(l.logged_at), 'yyyy-MM-dd')
    if (flowDays.has(day)) continue
    flowDays.add(day)
    if (flowDays.size === 10 && !flowMasterAt) {
      flowMasterAt = l.logged_at
    }
  }
  if (flowMasterAt) unlock.flow_master = flowMasterAt
  progress.flow_master = { current: Math.min(flowDays.size, 10), target: 10 }

  // --- Consistent (30 logs in a single calendar month) ---
  const byMonth = new Map() // yyyy-MM → logs[] (chronological)
  for (const l of sorted) {
    const key = format(parseISO(l.logged_at), 'yyyy-MM')
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key).push(l)
  }
  let maxMonth = 0
  for (const [, mLogs] of byMonth) {
    maxMonth = Math.max(maxMonth, mLogs.length)
    if (mLogs.length >= 30 && !unlock.consistent) {
      unlock.consistent = mLogs[29].logged_at
    }
  }
  progress.consistent = { current: Math.min(maxMonth, 30), target: 30 }

  return BADGES.map((b) => ({
    ...b,
    unlockedAt: unlock[b.id] ?? null,
    progress: progress[b.id] ?? null,
  }))
}
