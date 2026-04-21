import { Link } from 'react-router-dom'
import Logo from './Logo'

// Unified top bar used across every page. Consistent chrome (sticky, blurred,
// hairline bottom border), consistent logo placement & sizing. Right-side
// content is caller-specified via `children` — Landing renders a marketing
// nav, Layout renders an avatar dropdown, Login renders nothing.
export default function PageHeader({ children, logoAnimated = false }) {
  return (
    <div className="sticky top-0 z-30 border-b border-white/[0.05] bg-[#0a0a0b]/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6 sm:py-4">
        <Link
          to="/"
          aria-label="devmood home"
          className="transition-opacity hover:opacity-80"
        >
          <Logo size="md" animated={logoAnimated} />
        </Link>
        {children}
      </div>
    </div>
  )
}
