import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import PageHeader from './PageHeader'

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <TopBar />
      <div
        key={location.pathname}
        className="animate-page-in min-h-[calc(100vh-140px)] pb-44 sm:pb-40"
      >
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}

function TopBar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [username, setUsername] = useState(null)
  const [avatar, setAvatar] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      setUsername(data?.username || user.email?.split('@')[0] || 'friend')
      setAvatar(data?.avatar_url ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  // Close on outside click or Escape while the menu is open.
  useEffect(() => {
    if (!menuOpen) return

    const handlePointer = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  // Close on route change (e.g. navigating via "profile" link).
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const initial = (username ?? 'u').charAt(0).toUpperCase()

  return (
    <PageHeader>
      <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] py-1 pl-1 pr-3 transition hover:border-white/20 hover:bg-white/5"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="user menu"
          >
            {avatar ? (
              <img
                src={avatar}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-teal-500/30 bg-teal-500/10 text-xs font-semibold text-teal-300">
                {initial}
              </div>
            )}
            <span className="hidden text-xs text-neutral-400 sm:inline">
              {username ?? '…'}
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#151515] shadow-xl"
            >
              <Link
                to="/profile"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm text-neutral-300 transition hover:bg-white/5 hover:text-white"
              >
                profile
              </Link>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  signOut()
                }}
                className="block w-full border-t border-white/5 px-4 py-2.5 text-left text-sm text-neutral-500 transition hover:bg-white/5 hover:text-white"
              >
                sign out
              </button>
            </div>
          )}
        </div>
    </PageHeader>
  )
}

function BottomNav() {
  const location = useLocation()
  const containerRef = useRef(null)
  const [indicator, setIndicator] = useState(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const measure = () => {
      const active = container.querySelector('[data-nav-active="true"]')
      if (!active) {
        setIndicator(null)
        return
      }
      const a = active.getBoundingClientRect()
      const c = container.getBoundingClientRect()
      setIndicator({ left: a.left - c.left, width: a.width })
    }

    // Measure after the next paint so NavLink has finished rendering.
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [location.pathname])

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4 pt-2 sm:pb-6">
      <div
        ref={containerRef}
        className="pointer-events-auto relative flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#121214]/85 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_1px_0_0_rgba(255,255,255,0.04)_inset] backdrop-blur-2xl"
        role="tablist"
      >
        {/* Sliding teal pill — tracks the active tab */}
        {indicator && (
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-1.5 top-1.5 rounded-full bg-teal-400 shadow-[0_0_32px_rgba(20,184,166,0.5),0_4px_20px_rgba(20,184,166,0.4)]"
            style={{
              left: `${indicator.left}px`,
              width: `${indicator.width}px`,
              transition:
                'left 450ms cubic-bezier(0.22, 1, 0.36, 1), width 450ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        )}
        <NavItem to="/home" icon={<HomeIcon />} label="home" end />
        <NavItem to="/log" icon={<PlusIcon />} label="log" />
        <NavItem to="/history" icon={<ChartIcon />} label="history" />
        <NavItem to="/leaderboard" icon={<TrophyIcon />} label="ranks" />
      </div>
    </nav>
  )
}

function NavItem({ to, icon, label, end = false }) {
  const location = useLocation()
  const isActive = end
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(to + '/')

  return (
    <NavLink
      to={to}
      end={end}
      data-nav-active={isActive ? 'true' : 'false'}
      className={`group relative z-10 flex min-w-[60px] flex-col items-center gap-0.5 rounded-full px-3.5 py-2 transition-colors duration-500 sm:min-w-[64px] sm:px-4 ${
        isActive ? 'text-black' : 'text-neutral-500 hover:text-neutral-200'
      }`}
    >
      <span
        className={`h-5 w-5 transition-transform duration-300 ${
          isActive ? 'scale-110' : 'group-hover:-translate-y-0.5'
        }`}
      >
        {icon}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider">
        {label}
      </span>
    </NavLink>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 14v4" />
      <path d="M12 9v9" />
      <path d="M17 5v13" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}
