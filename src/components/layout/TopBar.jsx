import { useLocation } from 'react-router-dom'
import { Search, Bell } from 'lucide-react'
import AccountSwitcher from './AccountSwitcher'
import { useAuthStore } from '../../store/authStore'
import Tooltip from '../ui/Tooltip'

const TITLES = {
  '/home': 'Dashboard', '/hub': 'Trading Hub', '/history': 'Trade History',
  '/analytics': 'Analytics', '/calendar': 'Calendar', '/chart': 'Chart',
  '/alerts': 'Alerts', '/profile': 'Profile', '/settings': 'Settings',
  '/symbol': 'Symbol Info',
}

export default function TopBar({ onSearchOpen, onCmdOpen }) {
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)
  const title = Object.entries(TITLES).find(([k]) => pathname.startsWith(k))?.[1] || 'Ribon7'

  return (
    <div className="h-[52px] flex items-center justify-between px-4 border-b border-[var(--color-border)] bg-[var(--color-surface-1)] shrink-0">
      <h1 className="text-sm font-semibold text-[var(--color-text-pri)]">{title}</h1>
      <div className="flex items-center gap-2">
        <AccountSwitcher />
        <Tooltip content="Search (Ctrl+K)">
          <button onClick={() => { onCmdOpen?.(); onSearchOpen?.() }} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-pri)] hover:bg-[var(--color-surface-2)] transition-colors">
            <Search size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Notifications">
          <button className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-pri)] hover:bg-[var(--color-surface-2)] transition-colors">
            <Bell size={16} />
          </button>
        </Tooltip>
        <div className="w-7 h-7 rounded-full bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 flex items-center justify-center text-[10px] font-semibold text-[var(--color-accent)] overflow-hidden">
          {user?.avatar_url
            ? <img src={`http://localhost:8000${user.avatar_url}`} alt="" className="w-full h-full object-cover" />
            : (user?.name?.[0] || 'U').toUpperCase()
          }
        </div>
      </div>
    </div>
  )
}
