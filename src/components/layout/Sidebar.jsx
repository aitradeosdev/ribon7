import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Zap, History, BarChart2, Calendar, LineChart, Bell, User, Settings } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const NAV = [
  { to: '/home', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hub', icon: Zap, label: 'Hub' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/chart', icon: LineChart, label: 'Chart' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
]
const BOTTOM_NAV = [
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)

  return (
    <div
      id="sidebar"
      className="group flex flex-col h-full bg-[var(--color-surface-1)] border-r border-[var(--color-border)] overflow-hidden transition-all duration-200"
      style={{ width: 60 }}
      onMouseEnter={(e) => { e.currentTarget.style.width = '220px' }}
      onMouseLeave={(e) => { e.currentTarget.style.width = '60px' }}
    >
      {/* Logo */}
      <div className="h-[52px] flex items-center px-4 border-b border-[var(--color-border)] shrink-0 overflow-hidden">
        <span className="text-[var(--color-accent)] font-bold text-sm whitespace-nowrap">R7</span>
        <span className="ml-2 text-[var(--color-text-pri)] font-semibold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">Ribon7</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-hidden">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors whitespace-nowrap overflow-hidden ${
              isActive
                ? 'border-l-2 border-[var(--color-accent)] bg-[var(--color-surface-2)] text-[var(--color-text-pri)]'
                : 'border-l-2 border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-sec)] hover:bg-[var(--color-surface-2)]'
            }`
          }>
            <Icon size={18} className="shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="py-2 border-t border-[var(--color-border)] overflow-hidden">
        {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors whitespace-nowrap overflow-hidden ${
              isActive
                ? 'border-l-2 border-[var(--color-accent)] bg-[var(--color-surface-2)] text-[var(--color-text-pri)]'
                : 'border-l-2 border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-sec)] hover:bg-[var(--color-surface-2)]'
            }`
          }>
            <Icon size={18} className="shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">{label}</span>
          </NavLink>
        ))}
        {/* Avatar */}
        <div className="flex items-center gap-3 px-4 py-2.5 overflow-hidden">
          <div className="w-[18px] h-[18px] rounded-full bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center text-[9px] font-semibold text-[var(--color-accent)] shrink-0 overflow-hidden">
            {user?.avatar_url
              ? <img src={`http://localhost:8000${user.avatar_url}`} alt="" className="w-full h-full object-cover" />
              : (user?.name?.[0] || 'U').toUpperCase()
            }
          </div>
          <span className="text-xs text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 truncate">{user?.username}</span>
        </div>
      </div>
    </div>
  )
}
