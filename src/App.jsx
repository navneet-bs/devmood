import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import CheckIn from './pages/CheckIn'
import Profile from './pages/Profile'
import Leaderboard from './pages/Leaderboard'
import OAuthCallback from './pages/OAuthCallback'
import NotFound from './pages/NotFound'
import Skeleton from './components/Skeleton'

// History pulls in recharts (~200KB gzip), so keep it off the critical path.
const History = lazy(() => import('./pages/History'))

const withShell = (El) => (
  <ProtectedRoute>
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 sm:py-10">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-72" rounded="rounded-2xl" />
          </div>
        }
      >
        <El />
      </Suspense>
    </ErrorBoundary>
  </ProtectedRoute>
)

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/oauth/github" element={<OAuthCallback />} />
      <Route element={<Layout />}>
        <Route path="/home" element={withShell(Dashboard)} />
        <Route path="/log" element={withShell(CheckIn)} />
        <Route path="/history" element={withShell(History)} />
        <Route path="/leaderboard" element={withShell(Leaderboard)} />
        <Route path="/profile" element={withShell(Profile)} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
