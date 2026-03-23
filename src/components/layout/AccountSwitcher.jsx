import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAccountStore } from '../../store/accountStore'
import { getAccounts, activateAccount } from '../../api/accounts'

export default function AccountSwitcher() {
  const { activeAccount, setActiveAccount } = useAccountStore()
  const [open, setOpen] = useState(false)
  const [accounts, setAccounts] = useState([])
  const ref = useRef(null)

  useEffect(() => {
    getAccounts().then(setAccounts).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = async (acc) => {
    setOpen(false)
    await activateAccount(acc.id).catch(() => {})
    setActiveAccount(acc)
  }

  if (!activeAccount) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-border-hi)] transition-colors text-xs"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-profit)]" />
        <span className="text-[var(--color-text-sec)]">{activeAccount.broker}</span>
        <span className="text-[var(--color-text-pri)] font-mono">{String(activeAccount.login).slice(-6)}</span>
        <ChevronDown size={12} className="text-[var(--color-text-muted)]" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 w-56 bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 overflow-hidden">
          {accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => handleSelect(acc)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-[var(--color-surface-2)] transition-colors ${acc.id === activeAccount.id ? 'bg-[var(--color-surface-2)]' : ''}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${acc.is_active ? 'bg-[var(--color-profit)]' : 'bg-[var(--color-loss)]'}`} />
              <span className="text-[var(--color-text-sec)]">{acc.broker}</span>
              <span className="text-[var(--color-text-pri)] font-mono ml-auto">{String(acc.login).slice(-6)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
