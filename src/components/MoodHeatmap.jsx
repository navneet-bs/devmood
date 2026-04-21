import { useMemo, useState } from 'react'
import {
  eachDayOfInterval,
  format,
  parseISO,
  startOfWeek,
  subWeeks,
} from 'date-fns'

const WEEKS = 26
const CELL = 12
const GAP = 2
const STRIDE = CELL + GAP
const PAD_LEFT = 28
const PAD_TOP = 18

const COLORS = {
  empty: '#1a1a1a',
  1: '#0d3d30',
  2: '#0f6e56',
  3: '#14b8a6',
  4: '#5eead4',
  5: '#99f6e4',
}

// GitHub-style mood heatmap. Weeks run Mon → Sun down each column; columns go
// left → right over the last 6 months.
export default function MoodHeatmap({ logs = [] }) {
  const { weeks, monthLabels, byDate } = useMemo(
    () => buildGrid(logs),
    [logs],
  )
  const [hover, setHover] = useState(null)

  const width = PAD_LEFT + weeks.length * STRIDE
  const height = PAD_TOP + 7 * STRIDE

  return (
    <div className="relative inline-block">
      <svg
        width={width}
        height={height}
        className="block select-none"
        style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
      >
        {/* Month labels */}
        {monthLabels.map(
          (m, i) =>
            m && (
              <text
                key={`m-${i}`}
                x={PAD_LEFT + i * STRIDE}
                y={11}
                fontSize={10}
                fill="#737373"
              >
                {m}
              </text>
            ),
        )}

        {/* Day-of-week labels (rows 0=Mon, 2=Wed, 4=Fri) */}
        {[
          [0, 'Mon'],
          [2, 'Wed'],
          [4, 'Fri'],
        ].map(([row, label]) => (
          <text
            key={label}
            x={0}
            y={PAD_TOP + row * STRIDE + CELL - 2}
            fontSize={9}
            fill="#525252"
          >
            {label}
          </text>
        ))}

        {/* Cells */}
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            if (!day) return null
            const key = format(day, 'yyyy-MM-dd')
            const dayLogs = byDate.get(key)
            const score = scoreFor(dayLogs)
            const fill = score ? COLORS[score] : COLORS.empty
            const isHover =
              hover && format(hover.date, 'yyyy-MM-dd') === key
            return (
              <rect
                key={`${wi}-${di}`}
                x={PAD_LEFT + wi * STRIDE}
                y={PAD_TOP + di * STRIDE}
                width={CELL}
                height={CELL}
                rx={2}
                ry={2}
                fill={fill}
                stroke={isHover ? '#99f6e4' : 'rgba(255,255,255,0.04)'}
                strokeWidth={isHover ? 1.5 : 1}
                style={{
                  cursor: 'pointer',
                  transition: 'fill 200ms ease, stroke 200ms ease, filter 200ms ease',
                  filter: isHover
                    ? 'drop-shadow(0 0 6px rgba(20,184,166,0.7))'
                    : 'none',
                  transformOrigin: 'center',
                  transformBox: 'fill-box',
                  transform: isHover ? 'scale(1.25)' : 'scale(1)',
                }}
                onMouseEnter={() =>
                  setHover({
                    date: day,
                    logs: dayLogs,
                    x: PAD_LEFT + wi * STRIDE + CELL / 2,
                    y: PAD_TOP + di * STRIDE,
                  })
                }
                onMouseLeave={() => setHover(null)}
              />
            )
          }),
        )}
      </svg>

      {hover && <Tooltip hover={hover} />}
    </div>
  )
}

function Tooltip({ hover }) {
  const { date, logs, x, y } = hover
  const head = format(date, 'EEE MMM d')

  let body
  if (!logs || logs.length === 0) {
    body = 'No log'
  } else if (logs.length === 1) {
    const l = logs[0]
    body = `Energy ${l.energy} · Focus ${l.focus} · Mood ${l.mood}`
  } else {
    const avg = (k) =>
      Math.round(logs.reduce((s, l) => s + l[k], 0) / logs.length)
    body = `Energy ${avg('energy')} · Focus ${avg('focus')} · Mood ${avg('mood')}`
  }

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border border-white/10 bg-black/90 px-2.5 py-1.5 text-xs text-neutral-200 shadow-lg backdrop-blur"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, calc(-100% - 8px))',
      }}
    >
      <span className="font-medium text-white">{head}</span>
      <span className="mx-1.5 text-neutral-600">·</span>
      <span className="text-neutral-300">{body}</span>
    </div>
  )
}

function scoreFor(dayLogs) {
  if (!dayLogs || dayLogs.length === 0) return null
  const avg = dayLogs.reduce((s, l) => s + l.mood, 0) / dayLogs.length
  const rounded = Math.round(avg)
  return Math.min(5, Math.max(1, rounded))
}

function buildGrid(logs) {
  const byDate = new Map()
  for (const l of logs) {
    const key = format(parseISO(l.logged_at), 'yyyy-MM-dd')
    const arr = byDate.get(key) ?? []
    arr.push(l)
    byDate.set(key, arr)
  }

  const today = new Date()
  const start = startOfWeek(subWeeks(today, WEEKS - 1), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start, end: today })

  const weeks = []
  let current = []
  for (const d of days) {
    current.push(d)
    // Sunday (0) closes a Mon-start week
    if (d.getDay() === 0) {
      weeks.push(current)
      current = []
    }
  }
  if (current.length) {
    while (current.length < 7) current.push(null)
    weeks.push(current)
  }

  const lastWeeks = weeks.slice(-WEEKS)

  const monthLabels = lastWeeks.map((w, i) => {
    const first = w.find(Boolean)
    if (!first) return null
    if (i === 0) return format(first, 'MMM')
    const prev = lastWeeks[i - 1]?.find(Boolean)
    if (!prev) return format(first, 'MMM')
    return first.getMonth() !== prev.getMonth() ? format(first, 'MMM') : null
  })

  return { weeks: lastWeeks, monthLabels, byDate }
}
