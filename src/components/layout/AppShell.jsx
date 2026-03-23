import { useEffect, useRef, useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import ConnectionBanner from './ConnectionBanner'
import FloatingPLTicker from './FloatingPLTicker'
import Toast from '../ui/Toast'
import CommandPalette from '../command/CommandPalette'
import { useThemeStore } from '../../store/themeStore'

export default function AppShell({ children, onSearchOpen }) {
  const rootRef = useRef(null)
  const theme = useThemeStore((s) => s.theme)
  const [cmdOpen, setCmdOpen] = useState(false)

  // Apply theme class to html element
  useEffect(() => {
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [theme])

  // Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen((o) => !o)
      }
      if (e.key === 'Escape') setCmdOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ResizeObserver for mobile mode — no media queries
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      el.classList.toggle('mobile-mode', entry.contentRect.width < 720)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      id="app"
      ref={rootRef}
      className="flex h-screen overflow-hidden bg-[var(--color-bg)]"
      style={{ '--floating-bottom': '16px' }}
    >
      {/* Sidebar — hidden in mobile-mode via CSS */}
      <style>{`
        #app.mobile-mode #sidebar { display: none; }
        #app:not(.mobile-mode) #bottom-nav { display: none; }
        #app.mobile-mode { --floating-bottom: 72px; }
      `}</style>

      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <ConnectionBanner />
        <TopBar onSearchOpen={onSearchOpen} onCmdOpen={() => setCmdOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
        <BottomNav />
      </div>

      <FloatingPLTicker />
      <Toast />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  )
}
