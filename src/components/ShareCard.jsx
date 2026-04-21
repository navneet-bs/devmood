import { forwardRef, useMemo } from 'react'
import {
  eachDayOfInterval,
  format,
  parseISO,
  startOfWeek,
  subWeeks,
} from 'date-fns'

// 1200 × 630 is the canonical OG card size.
export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 630

const HEATMAP_WEEKS = 18
const CELL = 14
const GAP = 3
const STRIDE = CELL + GAP

const MOOD_COLORS = {
  empty: '#1f1f1f',
  1: '#0d3d30',
  2: '#0f6e56',
  3: '#14b8a6',
  4: '#5eead4',
  5: '#99f6e4',
}

// The card is rendered at natural 1200×630 and visually scaled down via CSS
// transform in the modal. html2canvas captures the real pixel dimensions.
const ShareCard = forwardRef(function ShareCard(
  { streak = 0, username = 'there', logs = [] },
  ref,
) {
  const { grid, byDate } = useMemo(() => buildHeatmap(logs), [logs])

  const today = new Date()

  return (
    <div
      ref={ref}
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        background:
          'radial-gradient(ellipse at top right, rgba(20,184,166,0.22), transparent 55%), linear-gradient(180deg, #0f0f0f 0%, #0a0a0a 100%)',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        padding: '56px 64px',
        boxSizing: 'border-box',
      }}
    >
      {/* Decorative grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage:
            'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
      />

      {/* Header row */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          <span style={{ color: '#ffffff' }}>dev</span>
          <span style={{ color: '#5eead4', marginLeft: -6 }}>mood</span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 999,
              background: '#5eead4',
              boxShadow: '0 0 16px #14b8a6',
              marginLeft: 4,
              marginTop: -18,
            }}
          />
        </div>
        <div
          style={{
            textAlign: 'right',
            color: '#a3a3a3',
            fontSize: 18,
            fontWeight: 500,
          }}
        >
          @{username}
        </div>
      </div>

      {/* Streak block */}
      <div style={{ position: 'relative', marginTop: 48 }}>
        <div
          style={{
            fontSize: 14,
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            color: '#5eead4',
            fontWeight: 600,
          }}
        >
          Current Streak
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 16,
            marginTop: 12,
          }}
        >
          <span style={{ fontSize: 96, lineHeight: 1, marginRight: 8 }}>🔥</span>
          <span
            style={{
              fontSize: 176,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              background:
                'linear-gradient(180deg, #ffffff 0%, #d4d4d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: '#ffffff',
            }}
          >
            {streak}
          </span>
          <span style={{ fontSize: 32, color: '#a3a3a3', fontWeight: 500 }}>
            day{streak === 1 ? '' : 's'}
          </span>
        </div>
        <p
          style={{
            marginTop: 28,
            fontSize: 26,
            color: '#d4d4d4',
            fontWeight: 400,
            maxWidth: 720,
            lineHeight: 1.35,
          }}
        >
          "I've logged my dev mood for {streak} day{streak === 1 ? '' : 's'}{' '}
          straight on devmood."
        </p>
      </div>

      {/* Bottom: heatmap + footer */}
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          bottom: 40,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: '#737373',
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            last {HEATMAP_WEEKS * 7} days
          </div>
          <HeatmapSvg grid={grid} byDate={byDate} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: '#737373',
              fontWeight: 600,
            }}
          >
            {format(today, 'MMM d, yyyy')}
          </div>
          <div
            style={{
              fontSize: 14,
              color: '#5eead4',
              marginTop: 4,
              fontWeight: 500,
            }}
          >
            devmood.app
          </div>
        </div>
      </div>
    </div>
  )
})

export default ShareCard

// ---------------------------------------------------------------------------
// Compact heatmap
// ---------------------------------------------------------------------------
function HeatmapSvg({ grid, byDate }) {
  const width = grid.length * STRIDE
  const height = 7 * STRIDE

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {grid.map((week, wi) =>
        week.map((day, di) => {
          if (!day) return null
          const key = format(day, 'yyyy-MM-dd')
          const dayLogs = byDate.get(key)
          const score = scoreFor(dayLogs)
          const fill = score ? MOOD_COLORS[score] : MOOD_COLORS.empty
          return (
            <rect
              key={`${wi}-${di}`}
              x={wi * STRIDE}
              y={di * STRIDE}
              width={CELL}
              height={CELL}
              rx={3}
              ry={3}
              fill={fill}
            />
          )
        }),
      )}
    </svg>
  )
}

function scoreFor(dayLogs) {
  if (!dayLogs || dayLogs.length === 0) return null
  const avg = dayLogs.reduce((s, l) => s + l.mood, 0) / dayLogs.length
  return Math.min(5, Math.max(1, Math.round(avg)))
}

function buildHeatmap(logs) {
  const byDate = new Map()
  for (const l of logs) {
    const key = format(parseISO(l.logged_at), 'yyyy-MM-dd')
    const arr = byDate.get(key) ?? []
    arr.push(l)
    byDate.set(key, arr)
  }

  const today = new Date()
  const start = startOfWeek(subWeeks(today, HEATMAP_WEEKS - 1), {
    weekStartsOn: 1,
  })
  const days = eachDayOfInterval({ start, end: today })

  const weeks = []
  let current = []
  for (const d of days) {
    current.push(d)
    if (d.getDay() === 0) {
      weeks.push(current)
      current = []
    }
  }
  if (current.length) {
    while (current.length < 7) current.push(null)
    weeks.push(current)
  }

  return { grid: weeks.slice(-HEATMAP_WEEKS), byDate }
}
