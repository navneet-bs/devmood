// Reusable devmood logo — SVG mark + wordmark.
//
// <Logo size="sm|md|lg|xl" animated? />
//   sm — topbar / tight contexts  (mark 16px, text-sm)
//   md — default                  (mark 20px, text-base)
//   lg — footer / footers/hero    (mark 24px, text-lg)
//   xl — login / big hero         (mark 56px, text-5xl)
//
// <LogoMark /> renders just the icon (for favicons, og-cards, buttons).

const SIZES = {
  sm: { mark: 16, text: 'text-sm', gap: 'gap-1.5' },
  md: { mark: 20, text: 'text-base', gap: 'gap-2' },
  lg: { mark: 24, text: 'text-lg', gap: 'gap-2.5' },
  xl: { mark: 56, text: 'text-5xl', gap: 'gap-4' },
}

export function LogoMark({ size = 20, animated = false, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      className={className}
      aria-hidden
      role="img"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="dm-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ascending teal bars — energy / focus / mood */}
      <rect x="3" y="17" width="4" height="8" rx="2" fill="#0f6e56" />
      <rect x="12" y="10" width="4" height="15" rx="2" fill="#14b8a6">
        {animated && (
          <animate
            attributeName="opacity"
            values="0.85;1;0.85"
            dur="2.6s"
            repeatCount="indefinite"
          />
        )}
      </rect>
      <rect
        x="21"
        y="3"
        width="4"
        height="22"
        rx="2"
        fill="#5eead4"
        filter="url(#dm-glow)"
      >
        {animated && (
          <animate
            attributeName="opacity"
            values="1;0.8;1"
            dur="3.2s"
            repeatCount="indefinite"
          />
        )}
      </rect>
    </svg>
  )
}

export default function Logo({ size = 'md', animated = false, className = '' }) {
  const s = SIZES[size] ?? SIZES.md
  return (
    <span
      className={`inline-flex items-center font-semibold tracking-tightest leading-none ${s.gap} ${s.text} ${className}`}
    >
      <LogoMark size={s.mark} animated={animated} />
      <span>
        <span className="text-white">dev</span>
        <span className="text-teal-300">mood</span>
      </span>
    </span>
  )
}
