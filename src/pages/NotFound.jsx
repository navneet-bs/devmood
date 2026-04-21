import { Link } from 'react-router-dom'
import { LogoMark } from '../components/Logo'
import PageHeader from '../components/PageHeader'

export default function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0b] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-orb bg-orb--one" />
        <div className="bg-orb bg-orb--two" />
        <div className="bg-grid" />
      </div>

      <PageHeader>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
          not found
        </span>
      </PageHeader>

      <div className="relative z-10 flex min-h-[calc(100vh-60px)] items-center justify-center px-6">
        <div className="max-w-md text-center">
          <LogoMark
            size={40}
            className="mx-auto mb-8 opacity-80 drop-shadow-[0_0_16px_rgba(20,184,166,0.5)]"
          />
          <div className="tabular font-mono text-7xl font-semibold tracking-tightest sm:text-8xl">
            4<span className="text-teal-300">0</span>4
          </div>
          <p className="mt-6 font-display text-2xl italic text-neutral-200">
            this page took a mental health day.
          </p>
          <p className="mt-3 text-sm text-neutral-500">
            that's fair — but we can't find what you were looking for.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-1.5 rounded-lg bg-teal-400 px-5 py-2.5 text-sm font-medium text-black shadow-glow-soft transition hover:bg-teal-300 hover:shadow-glow"
          >
            back home →
          </Link>
        </div>
      </div>
    </div>
  )
}
