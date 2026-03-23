import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Zap, History, BarChart2, MoreHorizontal, X, Calendar, LineChart, Bell, User, Settings } from 'lucide-react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const MAIN = [
  { to: '/home', icon: LayoutDashboard, label: 'Home' },
  { to: '/hub', icon: Zap, label: 'Hub' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
]
const MORE = [
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/chart', icon: LineChart, label: 'Chart' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <div
        id="bottom-nav"
        className="h-[60px] flex items-center justify-around border-t border-[var(--color-border)] bg-[var(--color-surface-1)] shrink-0"
      >
        {MAIN.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] transition-colors ${isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}`
          }>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] text-[var(--color-text-muted)]"
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </div>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col justify-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} />
            <motion.div
              className="relative bg-[var(--color-surface-1)] border-t border-[var(--color-border)] rounded-t-2xl p-4"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-[var(--color-text-pri)]">More</span>
                <button onClick={() => setMoreOpen(false)} className="text-[var(--color-text-muted)]"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {MORE.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to} to={to}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--color-surface-2)] text-[var(--color-text-sec)] hover:text-[var(--color-text-pri)] transition-colors text-xs"
                  >
                    <Icon size={22} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
