import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'
import PageHeader from '../components/PageHeader'

// ---------------------------------------------------------------------------
// Scroll reveal hook
// ---------------------------------------------------------------------------
function useInView(options = { threshold: 0.15, rootMargin: '-10% 0px' }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        obs.disconnect()
      }
    }, options)
    obs.observe(el)
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return [ref, inView]
}

function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const [ref, inView] = useInView()
  return (
    <Tag
      ref={ref}
      className={`reveal ${inView ? 'in-view' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------
export default function Landing() {
  const { session } = useAuth()
  const authed = !!session
  const ctaHref = authed ? '/home' : '/login'
  const ctaLabel = authed ? 'open dashboard →' : 'begin →'

  // Lock scroll progress bar
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement
      const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight || 1)
      setProgress(Math.min(1, Math.max(0, scrolled)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0a0b] text-white selection:bg-teal-400/30 selection:text-white">
      {/* scroll progress — thin teal hair at top */}
      <div
        className="fixed left-0 top-0 z-50 h-[2px] origin-left bg-gradient-to-r from-teal-300 to-teal-500 shadow-[0_0_12px_rgba(20,184,166,0.8)]"
        style={{ width: '100%', transform: `scaleX(${progress})` }}
      />

      <Nav authed={authed} />
      <Hero authed={authed} ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <Interlude />
      <Pillars />
      <DashboardShowcase />
      <LeaderboardShowcase authed={authed} />
      <FeaturesGrid />
      <FinalCTA authed={authed} ctaHref={ctaHref} />
      <Footer />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------
function Nav({ authed }) {
  return (
    <PageHeader logoAnimated>
      <nav className="flex items-center gap-5 text-xs">
        <a
          href="#ritual"
          className="hidden font-mono uppercase tracking-[0.2em] text-neutral-500 transition hover:text-teal-300 sm:inline"
        >
          ritual
        </a>
        <a
          href="#leaderboard"
          className="hidden font-mono uppercase tracking-[0.2em] text-neutral-500 transition hover:text-teal-300 sm:inline"
        >
          ranks
        </a>
        <a
          href="#features"
          className="hidden font-mono uppercase tracking-[0.2em] text-neutral-500 transition hover:text-teal-300 sm:inline"
        >
          features
        </a>
        {authed ? (
          <Link
            to="/home"
            className="rounded-full bg-teal-400 px-4 py-1.5 text-xs font-medium text-black shadow-glow-soft transition hover:bg-teal-300 hover:shadow-glow"
          >
            dashboard →
          </Link>
        ) : (
          <Link
            to="/login"
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-neutral-200 transition hover:border-teal-400/50 hover:bg-teal-500/10 hover:text-teal-200"
          >
            sign in
          </Link>
        )}
      </nav>
    </PageHeader>
  )
}

// ---------------------------------------------------------------------------
// Hero — mouse-follow spotlight + animated mini heatmap
// ---------------------------------------------------------------------------
function Hero({ ctaHref, ctaLabel }) {
  const heroRef = useRef(null)
  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / rect.width) * 100
      const my = ((e.clientY - rect.top) / rect.height) * 100
      el.style.setProperty('--mx', `${mx}%`)
      el.style.setProperty('--my', `${my}%`)
    }
    el.addEventListener('mousemove', onMove)
    return () => el.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 pb-24 pt-28 sm:pb-40 sm:pt-36"
    >
      {/* ambient layers */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-orb bg-orb--one" />
        <div className="bg-orb bg-orb--two" />
        <div className="bg-grid" />
        <div className="spotlight absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-[#0a0a0b]" />
      </div>

      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center text-center">
        {/* eyebrow */}
        <Reveal className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-teal-300/80">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.9)]" />
          a ritual for developers
          <span className="text-neutral-700">·</span>
          <span className="text-neutral-500">est. 2026</span>
        </Reveal>

        {/* headline */}
        <Reveal
          delay={80}
          className="mt-10 text-6xl font-semibold leading-[0.95] tracking-tightest sm:text-8xl md:text-[128px]"
        >
          <span className="text-white">code</span>
          <br />
          <span className="font-display italic text-teal-300">with intent.</span>
        </Reveal>

        {/* subhead */}
        <Reveal
          delay={180}
          className="mt-10 max-w-xl text-base leading-relaxed text-neutral-400 sm:text-lg"
        >
          a quiet journal that tracks your{' '}
          <span className="text-neutral-200">energy</span>,{' '}
          <span className="text-neutral-200">focus</span>, and{' '}
          <span className="text-neutral-200">mood</span> — so you can see how
          you actually work, not how you remember it.
        </Reveal>

        {/* CTAs */}
        <Reveal
          delay={280}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link
            to={ctaHref}
            className="group relative overflow-hidden rounded-full bg-teal-400 px-7 py-3.5 text-sm font-semibold text-black shadow-glow-soft transition hover:bg-teal-300 hover:shadow-glow"
          >
            <span className="relative z-10">{ctaLabel}</span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </Link>
          <a
            href="#ritual"
            className="inline-flex items-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-wider text-neutral-400 transition hover:text-teal-300"
          >
            see the ritual ↓
          </a>
        </Reveal>

        {/* "new" pill teasing GitHub leaderboard */}
        <Reveal delay={340}>
          <a
            href="#leaderboard"
            className="group mt-6 inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/[0.06] px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-teal-200 transition hover:border-teal-300/60 hover:bg-teal-500/[0.12]"
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.9)]" />
            <span className="text-teal-400">new</span>
            <span className="text-teal-100/90">
              github leaderboard — rank by merged PRs
            </span>
            <span className="text-teal-400 transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </a>
        </Reveal>

        {/* live mini heatmap */}
        <Reveal delay={400} className="mt-20 w-full max-w-3xl">
          <HeroHeatmap />
        </Reveal>

        {/* ticker */}
        <Reveal delay={500} className="mt-12 w-full max-w-3xl overflow-hidden">
          <TickerStrip />
        </Reveal>
      </div>

      {/* scroll hint */}
      <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-600">
        <div className="mx-auto mb-2 h-8 w-px animate-[reveal_1.6s_ease-in-out_infinite] bg-gradient-to-b from-transparent to-teal-400/60" />
        scroll
      </div>
    </section>
  )
}

// Staggered animated heatmap (12w × 7d, "typed in" over time)
function HeroHeatmap() {
  const COLS = 24
  const ROWS = 7
  const cells = useRef(
    Array.from({ length: COLS * ROWS }, (_, i) => {
      // synthetic data: higher density in recent weeks, mostly teal mood levels 3-5
      const week = Math.floor(i / ROWS)
      const rec = week / COLS // recency 0..1
      const roll = Math.random()
      if (roll < 0.15 - rec * 0.1) return 0 // empty
      const base = 1 + Math.floor(Math.random() * 5)
      return Math.min(5, Math.max(1, base + (rec > 0.7 ? 1 : 0)))
    }),
  )
  const COLORS = {
    0: '#1a1a1a',
    1: '#0d3d30',
    2: '#0f6e56',
    3: '#14b8a6',
    4: '#5eead4',
    5: '#99f6e4',
  }

  return (
    <div className="surface relative overflow-hidden p-6">
      <div className="mb-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
        <span>your rhythm · last 6 months</span>
        <span className="flex items-center gap-1.5">
          live
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300 shadow-[0_0_6px_rgba(20,184,166,0.8)]" />
        </span>
      </div>
      <div
        className="grid gap-[3px]"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridAutoFlow: 'column',
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
      >
        {cells.current.map((v, i) => (
          <div
            key={i}
            className="aspect-square rounded-[3px] transition-transform hover:scale-125"
            style={{
              background: COLORS[v],
              animation: `reveal 0.5s cubic-bezier(0.22,1,0.36,1) both`,
              animationDelay: `${(i % COLS) * 18 + Math.floor(i / COLS) * 6}ms`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function TickerStrip() {
  const items = [
    '◊ react · flow state',
    '◊ focus 5/5',
    '⬢ merged 3 prs today',
    '◊ mood 4/5',
    '◊ 21-day streak',
    '⬢ reviewed 7 · rank #4',
    '◊ locked in since 6am',
    '◊ energy trending up',
    '⬢ +1,248 lines · -321',
    '◊ fewer meetings = higher focus',
    '◊ deep work · 4 hrs',
    '⬢ repo: acme/api · main',
    '◊ debugging · #rust',
    '⬢ ship date friday',
  ]
  const doubled = [...items, ...items]
  return (
    <div className="relative opacity-50">
      <div className="absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#0a0a0b] to-transparent" />
      <div className="absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#0a0a0b] to-transparent" />
      <div className="marquee-track flex gap-10 whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-neutral-500">
        {doubled.map((s, i) => (
          <span key={i} className="shrink-0">
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Interlude — quiet problem framing
// ---------------------------------------------------------------------------
function Interlude() {
  return (
    <section className="relative px-5 py-32 sm:py-48">
      <div className="mx-auto max-w-3xl">
        <Reveal className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-neutral-500">
          <span className="h-px w-10 bg-neutral-700" />
          the truth
        </Reveal>
        <Reveal delay={100} className="mt-10">
          <p className="text-3xl leading-snug tracking-tight text-neutral-200 sm:text-5xl sm:leading-[1.1]">
            <span className="font-display italic text-white">you've had that day</span>
            <br />
            <span className="text-neutral-500">where nothing clicks.</span>
          </p>
        </Reveal>
        <Reveal delay={240} className="mt-14 max-w-xl space-y-6 text-base leading-relaxed text-neutral-400 sm:text-lg">
          <p>
            you blame yourself. but maybe you slept four hours. maybe the last
            four days were meetings.
          </p>
          <p>
            you'd see the pattern — if you tracked it.
          </p>
          <p className="font-display text-xl italic text-teal-200 sm:text-2xl">
            devmood is how you track it.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// The Ritual — three pillars with interactive micro-demos
// ---------------------------------------------------------------------------
function Pillars() {
  return (
    <section id="ritual" className="relative px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-teal-300/70">
          <span className="h-px w-10 bg-teal-400/40" />
          the ritual
          <span className="h-px w-10 bg-teal-400/40" />
        </Reveal>
        <Reveal delay={100} className="mx-auto mt-8 max-w-2xl text-center text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          <span className="text-white">fifteen seconds.</span>{' '}
          <span className="font-display italic text-teal-300">every day.</span>
        </Reveal>
        <Reveal delay={200} className="mx-auto mt-6 max-w-xl text-center text-base text-neutral-500 sm:text-lg">
          three questions. no journaling prompts. no cheer-leading. just a
          signal, logged.
        </Reveal>

        <div className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Reveal delay={0}>
            <PillarCheckIn />
          </Reveal>
          <Reveal delay={120}>
            <PillarPatterns />
          </Reveal>
          <Reveal delay={240}>
            <PillarRecap />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function PillarCheckIn() {
  const [val, setVal] = useState(4)
  return (
    <div className="surface surface-hover group relative flex h-full flex-col overflow-hidden p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-teal-300/80">
          01 · check-in
        </span>
        <span className="font-mono text-[10px] text-neutral-600">live</span>
      </div>
      <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">
        a pulse, not a prompt.
      </h3>
      <p className="mt-2 text-sm text-neutral-400">
        rate energy, focus, and mood 1–5. add a note if it matters. done.
      </p>
      <div className="mt-6 rounded-xl border border-white/[0.06] bg-black/30 p-4">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
            try it
          </span>
          <span className="font-mono text-[10px] text-teal-300">
            {val}/5
          </span>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setVal(n)}
              className={`rounded-md border py-2.5 text-xl transition-all ${
                val === n
                  ? 'border-teal-400/60 bg-teal-500/15 shadow-glow-soft'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <span
                className={
                  val === n
                    ? 'drop-shadow-[0_0_8px_rgba(20,184,166,0.8)]'
                    : 'opacity-60'
                }
              >
                {['😴', '😪', '😌', '💪', '⚡'][n - 1]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function PillarPatterns() {
  // small live heatmap (8w × 7d)
  const COLS = 10
  const ROWS = 7
  const cells = useRef(
    Array.from({ length: COLS * ROWS }, () => {
      const r = Math.random()
      if (r < 0.2) return 0
      return 1 + Math.floor(r * 5)
    }),
  )
  const COLORS = {
    0: '#1a1a1a',
    1: '#0d3d30',
    2: '#0f6e56',
    3: '#14b8a6',
    4: '#5eead4',
    5: '#99f6e4',
  }
  return (
    <div className="surface surface-hover group relative flex h-full flex-col overflow-hidden p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-teal-300/80">
          02 · patterns
        </span>
      </div>
      <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">
        see your rhythm.
      </h3>
      <p className="mt-2 text-sm text-neutral-400">
        a heatmap of how you actually felt, not how you remember it. zoom into
        any day.
      </p>
      <div className="mt-6 rounded-xl border border-white/[0.06] bg-black/30 p-4">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
            last 10 weeks
          </span>
          <span className="font-mono text-[10px] text-neutral-600">mood</span>
        </div>
        <div
          className="mt-3 grid gap-[3px]"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridAutoFlow: 'column',
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          }}
        >
          {cells.current.map((v, i) => (
            <div
              key={i}
              className="aspect-square rounded-[3px] transition-transform hover:scale-125"
              style={{ background: COLORS[v] }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function PillarRecap() {
  return (
    <div className="surface surface-hover group relative flex h-full flex-col overflow-hidden p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-teal-300/80">
          03 · recap
        </span>
      </div>
      <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">
        ai sees what you miss.
      </h3>
      <p className="mt-2 text-sm text-neutral-400">
        weekly insights from claude. no fluff. grounded in your actual data.
      </p>
      <div className="mt-6 space-y-2">
        {[
          {
            t: 'you code best early.',
            b: 'mood and focus peak before 10am on 4 of 7 days.',
          },
          {
            t: 'meetings drain focus.',
            b: 'tagged #meetings = avg focus 2.3. others = 4.1.',
          },
          {
            t: 'friday dip is real.',
            b: 'energy drops ~1.4 points on fridays vs monday.',
          },
        ].map((i, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-white/[0.06] bg-black/30 p-3"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-teal-400/30 bg-teal-500/10 font-mono text-[9px] text-teal-300">
                {idx + 1}
              </span>
              <div>
                <p className="text-[13px] font-medium text-white">{i.t}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-400">
                  {i.b}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard Showcase — tilted mock of the real dashboard
// ---------------------------------------------------------------------------
function DashboardShowcase() {
  return (
    <section className="relative px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-teal-300/70">
          <span className="h-px w-10 bg-teal-400/40" />
          your control center
          <span className="h-px w-10 bg-teal-400/40" />
        </Reveal>
        <Reveal delay={100} className="mx-auto mt-8 max-w-3xl text-center text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          <span className="text-white">every signal,</span>{' '}
          <span className="font-display italic text-teal-300">at a glance.</span>
        </Reveal>

        <Reveal delay={200} className="relative mt-20">
          {/* glow platform */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-20 -bottom-10 -top-10"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(20,184,166,0.25) 0%, transparent 60%)',
            }}
          />
          <MockDashboard />
        </Reveal>
      </div>
    </section>
  )
}

function MockDashboard() {
  return (
    <div className="relative mx-auto max-w-4xl">
      <div
        className="relative rounded-3xl border border-white/10 bg-[#0f0f12] p-4 shadow-[0_40px_120px_-30px_rgba(20,184,166,0.4),0_0_60px_-20px_rgba(0,0,0,0.8)] sm:p-6"
        style={{ transform: 'perspective(1800px) rotateX(4deg)' }}
      >
        {/* fake window chrome */}
        <div className="mb-5 flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <div className="ml-4 flex-1 rounded-md border border-white/[0.04] bg-black/40 px-3 py-1 font-mono text-[10px] text-neutral-600">
            devmood.app / home
          </div>
        </div>

        {/* streak hero mock */}
        <div className="surface relative overflow-hidden p-5">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-teal-500/20 blur-3xl"
          />
          <div className="relative">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-neutral-500">
              current streak
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-4xl">🔥</span>
              <span className="tabular font-mono text-6xl font-semibold leading-none tracking-tightest text-white">
                21
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-500">
                days
              </span>
            </div>
            <p className="mt-4 max-w-md font-display text-base italic leading-relaxed text-neutral-300">
              three weeks in. this is a habit now.
            </p>
          </div>
        </div>

        {/* stats row */}
        <div className="mt-3 grid grid-cols-4 gap-3">
          {[
            { l: 'avg energy', v: '4.2', s: '/5' },
            { l: 'avg focus', v: '3.8', s: '/5' },
            { l: 'logs', v: '21', s: '' },
            { l: 'best day', v: 'TUE', s: '' },
          ].map((s) => (
            <div key={s.l} className="surface p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                {s.l}
              </div>
              <div className="tabular mt-2 font-mono text-xl font-semibold text-white">
                {s.v}
                <span className="text-xs text-neutral-600">{s.s}</span>
              </div>
            </div>
          ))}
        </div>

        {/* mini heatmap */}
        <div className="mt-3 surface p-4">
          <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-500">
            activity
          </div>
          <div
            className="grid gap-[2px]"
            style={{
              gridTemplateColumns: 'repeat(26, 1fr)',
              gridAutoFlow: 'column',
              gridTemplateRows: 'repeat(7, 1fr)',
            }}
          >
            {Array.from({ length: 26 * 7 }).map((_, i) => {
              const r = ((i * 137) % 100) / 100
              const shades = [
                '#1a1a1a',
                '#1a1a1a',
                '#0d3d30',
                '#0f6e56',
                '#14b8a6',
                '#5eead4',
                '#99f6e4',
              ]
              const idx = Math.min(6, Math.floor(r * 7))
              return (
                <div
                  key={i}
                  className="aspect-square rounded-[2px]"
                  style={{ background: shades[idx] }}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Leaderboard showcase — GitHub OAuth ship tracking
// ---------------------------------------------------------------------------
function LeaderboardShowcase({ authed }) {
  return (
    <section id="leaderboard" className="relative px-5 py-24 sm:py-36">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute left-1/4 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/12 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/8 blur-3xl"
          aria-hidden
        />
      </div>

      <div className="mx-auto max-w-6xl">
        {/* Centered header */}
        <div className="text-center">
          <Reveal className="flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-teal-300/80">
            <span className="h-px w-10 bg-teal-400/40" />
            <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.9)]" />
            ship tracking · live
            <span className="h-px w-10 bg-teal-400/40" />
          </Reveal>
          <Reveal
            delay={100}
            className="mx-auto mt-8 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-tightest sm:text-7xl md:text-[96px]"
          >
            <span className="text-white">code commits.</span>
            <br />
            <span className="font-display italic text-teal-300">
              counted.
            </span>
          </Reveal>
          <Reveal
            delay={200}
            className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-neutral-400 sm:text-lg"
          >
            connect GitHub and devmood pulls your merged pull requests,
            reviews, and repo activity every day — then stacks you against
            every other opted-in dev on a live leaderboard.{' '}
            <span className="text-neutral-200">
              public and private repos, read-only.
            </span>
          </Reveal>
        </div>

        {/* What gets counted — three icon cards */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Reveal delay={0}>
            <BenefitCard
              eyebrow="01 · merged prs"
              title="shipped work."
              body="every merged PR, private or public. batched by repo so monorepos still count."
              icon={<PrIcon />}
            />
          </Reveal>
          <Reveal delay={120}>
            <BenefitCard
              eyebrow="02 · reviews"
              title="teamwork."
              body="reviews you leave on others' PRs. unblocking the team counts as shipping."
              icon={<ReviewIcon />}
              highlight
            />
          </Reveal>
          <Reveal delay={240}>
            <BenefitCard
              eyebrow="03 · repos touched"
              title="breadth."
              body="unique repos you merged into. range matters, not just volume."
              icon={<ForkIcon />}
            />
          </Reveal>
        </div>

        {/* Live-looking leaderboard mock */}
        <Reveal delay={150} className="mt-16">
          <div className="grid items-start gap-10 md:grid-cols-[1fr_1.15fr]">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                how it works
              </div>
              <ol className="mt-5 space-y-5">
                {[
                  {
                    n: '1',
                    t: 'connect github',
                    d: 'oauth from profile. 2 clicks. read-only repo scope.',
                  },
                  {
                    n: '2',
                    t: 'daily sync',
                    d: 'we count yesterday\'s merges and reviews at 03:10 UTC. one api call per user.',
                  },
                  {
                    n: '3',
                    t: 'climb',
                    d: 'daily / weekly / all-time leaderboards. disconnect wipes your data.',
                  },
                ].map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-teal-400/40 bg-teal-500/10 font-mono text-xs font-semibold text-teal-300">
                      {s.n}
                    </span>
                    <div>
                      <div className="font-mono text-sm font-semibold text-white">
                        {s.t}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-400">
                        {s.d}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to={authed ? '/leaderboard' : '/login'}
                  className="group relative overflow-hidden rounded-full bg-teal-400 px-6 py-3 text-sm font-semibold text-black shadow-glow-soft transition hover:bg-teal-300 hover:shadow-glow"
                >
                  <span className="relative z-10 inline-flex items-center gap-2">
                    <GithubIcon className="h-4 w-4" />
                    {authed ? 'see leaderboard →' : 'connect github →'}
                  </span>
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </Link>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">
                  opt-in · disconnect anytime
                </span>
              </div>

              {/* Social proof stat */}
              <div className="mt-10 flex items-baseline gap-6 border-t border-white/[0.05] pt-6">
                <div>
                  <div className="tabular font-mono text-4xl font-semibold text-teal-300">
                    24h
                  </div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    sync cadence
                  </div>
                </div>
                <div>
                  <div className="tabular font-mono text-4xl font-semibold text-white">
                    0
                  </div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    repos shared
                  </div>
                </div>
                <div>
                  <div className="tabular font-mono text-4xl font-semibold text-white">
                    read
                  </div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    only scope
                  </div>
                </div>
              </div>
            </div>

            <MockLeaderboard />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function BenefitCard({ eyebrow, title, body, icon, highlight = false }) {
  return (
    <div
      className={`surface surface-hover group relative h-full overflow-hidden p-6 ${
        highlight
          ? 'border-teal-500/30 bg-gradient-to-br from-teal-500/[0.06] via-white/[0.02] to-transparent'
          : ''
      }`}
    >
      {highlight && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-400/15 blur-3xl"
        />
      )}
      <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-teal-300 transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <div className="relative mt-5 font-mono text-[10px] uppercase tracking-[0.25em] text-teal-300/80">
        {eyebrow}
      </div>
      <h3 className="relative mt-3 font-display text-2xl italic leading-tight text-white">
        {title}
      </h3>
      <p className="relative mt-2 text-sm leading-relaxed text-neutral-400">
        {body}
      </p>
    </div>
  )
}

function PrIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <path d="M6 9v12" />
      <path d="M21 6h-7a4 4 0 0 0-4 4v11" />
      <circle cx="15" cy="21" r="3" />
    </svg>
  )
}

function ReviewIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <path d="m9 11 2 2 4-4" />
    </svg>
  )
}

function ForkIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="6" r="3" />
      <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" />
      <path d="M12 12v3" />
    </svg>
  )
}

function GithubIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  )
}

function MockLeaderboard() {
  const rows = [
    { rank: 1, user: 'ada', prs: 127, color: 'from-[#C5B358] to-[#FEE38C]' },
    { rank: 2, user: 'linus', prs: 94, color: 'from-[#B8B8B8] to-[#E3E3E3]' },
    { rank: 3, user: 'nova', prs: 71, color: 'from-[#CD7F32] to-[#EAB780]' },
    { rank: 4, user: 'orion', prs: 48 },
    { rank: 5, user: 'maya', prs: 32 },
  ]
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-teal-500/10 blur-3xl"
      />
      <div
        className="relative rounded-2xl border border-white/10 bg-[#0f0f12] p-4 shadow-[0_40px_120px_-30px_rgba(20,184,166,0.4),0_0_60px_-20px_rgba(0,0,0,0.8)]"
        style={{ transform: 'perspective(1400px) rotateY(-4deg) rotateX(2deg)' }}
      >
        {/* fake window chrome */}
        <div className="mb-3 flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <div className="h-2 w-2 rounded-full bg-white/10" />
          <div className="ml-3 flex-1 rounded-md border border-white/[0.04] bg-black/40 px-2.5 py-0.5 font-mono text-[10px] text-neutral-600">
            devmood.app / leaderboard
          </div>
        </div>

        {/* tabs */}
        <div className="mb-3 inline-flex rounded-full border border-white/[0.08] bg-white/[0.02] p-1 text-[10px]">
          <span className="rounded-full px-3 py-1 font-mono uppercase tracking-wider text-neutral-500">
            daily
          </span>
          <span className="rounded-full bg-teal-500/15 px-3 py-1 font-mono uppercase tracking-wider text-teal-200 shadow-[0_0_12px_-3px_rgba(20,184,166,0.4)]">
            weekly
          </span>
          <span className="rounded-full px-3 py-1 font-mono uppercase tracking-wider text-neutral-500">
            all-time
          </span>
        </div>

        {/* rows */}
        <div className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.06] bg-black/30">
          {rows.map((r) => (
            <div
              key={r.user}
              className="flex items-center gap-3 p-3"
            >
              <div className="flex h-7 w-7 items-center justify-center">
                {r.rank <= 3 ? (
                  <span className="text-lg drop-shadow-[0_0_8px_rgba(20,184,166,0.4)]">
                    {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'}
                  </span>
                ) : (
                  <span className="tabular font-mono text-xs text-neutral-600">
                    {String(r.rank).padStart(2, '0')}
                  </span>
                )}
              </div>
              <div
                className={`h-8 w-8 rounded-full border ${
                  r.rank === 1
                    ? 'border-teal-300/60 shadow-[0_0_16px_-4px_rgba(20,184,166,0.6)]'
                    : 'border-white/10'
                } bg-gradient-to-br ${r.color ?? 'from-neutral-600 to-neutral-800'}`}
              />
              <span className="flex-1 font-mono text-sm text-white">
                {r.user}
              </span>
              <div className="text-right">
                <div
                  className={`tabular font-mono text-xl font-semibold leading-none ${
                    r.rank === 1 ? 'text-teal-200' : 'text-white'
                  }`}
                >
                  {r.prs}
                </div>
                <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-neutral-600">
                  prs
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Features grid
// ---------------------------------------------------------------------------
function FeaturesGrid() {
  const features = [
    { num: '01', t: 'streaks', d: 'current + longest, tracked to the day.' },
    { num: '02', t: 'badges', d: 'night owl, flow master, first log, 7-day streak, more.' },
    { num: '03', t: 'ai recap', d: 'weekly insights powered by claude.' },
    { num: '04', t: 'github leaderboard', d: 'merged prs + reviews, ranked across all devs.' },
    { num: '05', t: 'share cards', d: 'og-ready pngs of your streak, one click.' },
    { num: '06', t: 'heatmap', d: 'six months of mood, colored by average.' },
    { num: '07', t: 'trends', d: 'line charts per metric. weekly day-of-week pattern.' },
    { num: '08', t: 'tags', d: '#flow, #debugging, #meetings — filter everything.' },
    { num: '09', t: 'reminders', d: 'daily nudge at your chosen hour. email only if you missed.' },
  ]
  return (
    <section id="features" className="relative px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-teal-300/70">
          <span className="h-px w-10 bg-teal-400/40" />
          what's inside
          <span className="h-px w-10 bg-teal-400/40" />
        </Reveal>
        <Reveal delay={100} className="mx-auto mt-8 max-w-3xl text-center text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          <span className="text-white">built for the way</span>{' '}
          <span className="font-display italic text-teal-300">you actually work.</span>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.04] sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.num} delay={(i % 3) * 60} className="group">
              <div className="relative h-full bg-[#0a0a0b] p-6 transition-colors hover:bg-[#0f0f12]">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-teal-300/60">
                  {f.num}
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">
                  {f.t}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  {f.d}
                </p>
                <div className="mt-4 h-px w-8 bg-teal-400/30 transition-all duration-300 group-hover:w-16 group-hover:bg-teal-300/80" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Final CTA
// ---------------------------------------------------------------------------
function FinalCTA({ authed, ctaHref }) {
  return (
    <section className="relative overflow-hidden px-5 py-32 sm:py-48">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-orb bg-orb--one" style={{ top: '10%', left: '10%' }} />
        <div className="bg-orb bg-orb--two" style={{ bottom: '10%', right: '10%' }} />
        <div className="bg-grid" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0b]/20 via-transparent to-[#0a0a0b]" />
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <Reveal className="flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-teal-300/70">
          <span className="h-px w-10 bg-teal-400/40" />
          ready?
          <span className="h-px w-10 bg-teal-400/40" />
        </Reveal>
        <Reveal delay={120} className="mt-10 text-5xl font-semibold leading-[1.05] tracking-tightest sm:text-7xl">
          <span className="text-white">it starts with</span>{' '}
          <span className="font-display italic text-teal-300">one check-in.</span>
        </Reveal>
        <Reveal delay={240} className="mt-8 text-base text-neutral-400 sm:text-lg">
          fifteen seconds. then tomorrow. then the pattern emerges.
          <br />
          <span className="text-neutral-500">
            connect github — the leaderboard starts counting your merges the
            same day.
          </span>
        </Reveal>
        <Reveal delay={360} className="mt-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to={ctaHref}
            className="group relative overflow-hidden rounded-full bg-teal-400 px-10 py-4 text-sm font-semibold text-black shadow-glow-soft transition hover:bg-teal-300 hover:shadow-glow"
          >
            <span className="relative z-10">
              {authed ? 'open dashboard →' : 'begin for free →'}
            </span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">
            no credit card · just an email
          </span>
        </Reveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function Footer() {
  return (
    <footer className="relative border-t border-white/[0.04] px-5 py-12 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <Link to="/" aria-label="devmood home" className="transition-opacity hover:opacity-80">
            <Logo size="sm" />
          </Link>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">
            built quietly · a ritual, not a product
          </p>
        </div>
        <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
          <a href="#ritual" className="transition hover:text-teal-300">
            ritual
          </a>
          <a href="#features" className="transition hover:text-teal-300">
            features
          </a>
          <Link to="/login" className="transition hover:text-teal-300">
            sign in
          </Link>
        </div>
      </div>
    </footer>
  )
}
