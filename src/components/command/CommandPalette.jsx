import { useState, useEffect, useCallback } from 'react'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Home, Activity, BarChart2, Calendar, Bell,
  User, Settings, TrendingUp, Search,
} from 'lucide-react'
import { useAccountStore } from '../../store/accountStore'
import { useNotifStore } from '../../store/notifStore'
import { searchSymbols } from '../../api/symbols'
import { getAccounts, activateAccount } from '../../api/accounts'

const NAV_ITEMS = [
  { label: 'Home', icon: Home, path: '/home' },
  { label: 'Trading Hub', icon: Activity, path: '/hub' },
  { label: 'Trade History', icon: TrendingUp, path: '/history' },
  { label: 'Analytics', icon: BarChart2, path: '/analytics' },
  { label: 'Calendar', icon: Calendar, path: '/calendar' },
  { label: 'Alerts', icon: Bell, path: '/alerts' },
  { label: 'Profile', icon: User, path: '/profile' },
  { label: 'Settings', icon: Settings, path: '/settings' },
]

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const { activeAccount, setActiveAccount } = useAccountStore()
  const addNotif = useNotifStore((s) => s.addNotification)
  const [query, setQuery] = useState('')
  const [accounts, setAccounts] = useState([])
  const [symbols, setSymbols] = useState([])
  const [symbolLoading, setSymbolLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSymbols([])
      getAccounts().then(setAccounts).catch(() => {})
    }
  }, [open])

  // Symbol search with debounce
  useEffect(() => {
    if (!query || query.length < 2 || !activeAccount?.id) { setSymbols([]); return }
    setSymbolLoading(true)
    const t = setTimeout(() => {
      searchSymbols(query, activeAccount.id)
        .then((res) => setSymbols(res.slice(0, 6)))
        .catch(() => setSymbols([]))
        .finally(() => setSymbolLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [query, activeAccount?.id])

  const go = (path) => { navigate(path); onClose() }

  const switchAccount = async (acc) => {
    await activateAccount(acc.id).catch(() => {})
    setActiveAccount(acc)
    addNotif({ type: 'success', title: `Switched to ${acc.broker}` })
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-lg"
          >
            <Command
              className="rounded-2xl border border-[var(--color-border-hi)] shadow-2xl overflow-hidden"
              style={{ background: 'var(--color-surface-1)' }}
              shouldFilter={false}
            >
              <div className="flex items-center gap-2 px-4 border-b border-[var(--color-border)]">
                <Search size={15} className="text-[var(--color-text-muted)] shrink-0" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search pages, symbols, accounts…"
                  className="flex-1 py-3.5 text-sm bg-transparent outline-none text-[var(--color-text-pri)] placeholder:text-[var(--color-text-muted)]"
                  autoFocus
                />
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)]">Esc</kbd>
              </div>

              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                  {symbolLoading ? 'Searching…' : 'No results found.'}
                </Command.Empty>

                {/* Navigation */}
                {(!query || NAV_ITEMS.some((n) => n.label.toLowerCase().includes(query.toLowerCase()))) && (
                  <Command.Group heading={<span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase px-2">Navigation</span>}>
                    {NAV_ITEMS
                      .filter((n) => !query || n.label.toLowerCase().includes(query.toLowerCase()))
                      .map((item) => {
                        const Icon = item.icon
                        return (
                          <Command.Item
                            key={item.path}
                            value={item.label}
                            onSelect={() => go(item.path)}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer text-[var(--color-text-sec)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-pri)] transition-colors aria-selected:bg-[var(--color-surface-2)] aria-selected:text-[var(--color-text-pri)]"
                          >
                            <Icon size={14} />
                            {item.label}
                          </Command.Item>
                        )
                      })}
                  </Command.Group>
                )}

                {/* Accounts */}
                {accounts.length > 1 && (!query || accounts.some((a) => a.broker.toLowerCase().includes(query.toLowerCase()))) && (
                  <Command.Group heading={<span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase px-2">Switch Account</span>}>
                    {accounts
                      .filter((a) => !query || a.broker.toLowerCase().includes(query.toLowerCase()))
                      .map((acc) => (
                        <Command.Item
                          key={acc.id}
                          value={`account-${acc.id}`}
                          onSelect={() => switchAccount(acc)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer text-[var(--color-text-sec)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-pri)] transition-colors aria-selected:bg-[var(--color-surface-2)] aria-selected:text-[var(--color-text-pri)]"
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${acc.id === activeAccount?.id ? 'bg-[var(--color-profit)]' : 'bg-[var(--color-border)]'}`} />
                          <span>{acc.broker}</span>
                          <span className="ml-auto text-xs text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--mono)' }}>{acc.login}</span>
                        </Command.Item>
                      ))}
                  </Command.Group>
                )}

                {/* Symbol search results */}
                {symbols.length > 0 && (
                  <Command.Group heading={<span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase px-2">Symbols</span>}>
                    {symbols.map((s) => (
                      <Command.Item
                        key={s.symbol}
                        value={`symbol-${s.symbol}`}
                        onSelect={() => go(`/chart/${s.symbol}`)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer text-[var(--color-text-sec)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-pri)] transition-colors aria-selected:bg-[var(--color-surface-2)] aria-selected:text-[var(--color-text-pri)]"
                      >
                        <BarChart2 size={14} />
                        <span className="font-medium text-[var(--color-text-pri)]">{s.symbol}</span>
                        <span className="text-xs text-[var(--color-text-muted)] truncate">{s.description}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
