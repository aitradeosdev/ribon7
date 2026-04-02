import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, Component } from 'react'
import { useAuthStore } from './store/authStore'
import { useAccountStore } from './store/accountStore'
import { useServerStore } from './store/serverStore'
import { getAccounts } from './api/accounts'
import AppShell from './components/layout/AppShell'

// Pages
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Onboarding from './pages/Auth/Onboarding'
import Home from './pages/Home/Home'
import Hub from './pages/Hub/Hub'
import History from './pages/History/History'
import TradeDetail from './pages/History/TradeDetail'
import Analytics from './pages/Analytics/Analytics'
import Calendar from './pages/Calendar/Calendar'
import Chart from './pages/Chart/Chart'
import Alerts from './pages/Alerts/Alerts'
import Profile from './pages/Profile/Profile'
import Settings from './pages/Settings/Settings'
import SymbolInfo from './pages/SymbolInfo/SymbolInfo'
import NotFound from './pages/Errors/NotFound'
import Offline from './pages/Errors/Offline'
import ServerDown from './pages/Errors/ServerDown'

const queryClient = new QueryClient({ 
  defaultOptions: { 
    queries: { 
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) return false
        // Retry up to 3 times for network/server errors
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 30000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true
    } 
  } 
})

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', gap: 12 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '0.2em', color: 'var(--color-accent)', fontWeight: 600 }}>RIBON7</span>
        <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-pri)' }}>Something went wrong</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--mono)', maxWidth: 400, textAlign: 'center' }}>
          {this.state.error?.message}
        </span>
        <button
          onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/home' }}
          style={{ marginTop: 8, padding: '8px 20px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface-1)', color: 'var(--color-text-pri)', fontSize: 13, cursor: 'pointer' }}
        >
          Reload
        </button>
      </div>
    )
  }
}

// ── Offline gate ──────────────────────────────────────────────────────────────
function OfflineGate({ children }) {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  if (!online) return <Offline />
  return children
}

// ── Server-down gate ──────────────────────────────────────────────────────────
function ServerGate({ children }) {
  const serverDown = useServerStore((s) => s.serverDown)
  if (serverDown) return <ServerDown />
  return children
}

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.accessToken)
  const { activeAccount, setActiveAccount } = useAccountStore()
  const [accountLoading, setAccountLoading] = useState(false)

  useEffect(() => {
    if (token && !activeAccount && !accountLoading) {
      setAccountLoading(true)
      getAccounts()
        .then((accs) => { 
          if (accs.length) setActiveAccount(accs[0]) 
        })
        .catch(() => {})
        .finally(() => setAccountLoading(false))
    }
  }, [token, activeAccount, accountLoading])

  if (!token) return <Navigate to="/login" replace />
  
  // Show loading while fetching account
  if (token && !activeAccount && accountLoading) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '0.2em', color: 'var(--color-accent)', fontWeight: 600 }}>RIBON7</span>
          <div style={{ width: 20, height: 20, border: '2px solid var(--color-border)', borderTop: '2px solid var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Loading account...</span>
        </div>
      </div>
    )
  }
  
  return children
}

function OnboardingGuard({ children }) {
  const [checked, setChecked] = useState(false)
  const [hasAccounts, setHasAccounts] = useState(true)

  useEffect(() => {
    getAccounts()
      .then((accs) => { setHasAccounts(accs.length > 0); setChecked(true) })
      .catch(() => setChecked(true))
  }, [])

  if (!checked) return null
  if (!hasAccounts) return <Navigate to="/onboarding" replace />
  return children
}

function ShellRoute({ children }) {
  return (
    <ProtectedRoute>
      <OnboardingGuard>
        <AppShell>{children}</AppShell>
      </OnboardingGuard>
    </ProtectedRoute>
  )
}

function RootRedirect() {
  const token = useAuthStore((s) => s.accessToken)
  return <Navigate to={token ? '/home' : '/login'} replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <OfflineGate>
          <ServerGate>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

                <Route path="/home" element={<ShellRoute><Home /></ShellRoute>} />
                <Route path="/hub" element={<ShellRoute><Hub /></ShellRoute>} />
                <Route path="/history" element={<ShellRoute><History /></ShellRoute>} />
                <Route path="/history/:id" element={<ShellRoute><TradeDetail /></ShellRoute>} />
                <Route path="/analytics" element={<ShellRoute><Analytics /></ShellRoute>} />
                <Route path="/calendar" element={<ShellRoute><Calendar /></ShellRoute>} />
                <Route path="/chart" element={<ShellRoute><Chart /></ShellRoute>} />
                <Route path="/chart/:symbol" element={<ShellRoute><Chart /></ShellRoute>} />
                <Route path="/alerts" element={<ShellRoute><Alerts /></ShellRoute>} />
                <Route path="/profile" element={<ShellRoute><Profile /></ShellRoute>} />
                <Route path="/settings" element={<ShellRoute><Settings /></ShellRoute>} />
                <Route path="/symbol/:symbol" element={<ShellRoute><SymbolInfo /></ShellRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ServerGate>
        </OfflineGate>
      </ErrorBoundary>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </QueryClientProvider>
  )
}
