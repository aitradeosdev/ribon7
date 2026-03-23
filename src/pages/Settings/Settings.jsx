import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, Download } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'
import { useAccountStore } from '../../store/accountStore'
import { useNotifStore } from '../../store/notifStore'
import { getAccounts, createAccount, deleteAccount, activateAccount, getBrokers, getBrokerTerminals, getAccountStatus } from '../../api/accounts'
import { updateSettings } from '../../api/users'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'

const BASE_API = import.meta.env.VITE_API_BASE_URL

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden">
      {title && <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{title}</span>
      </div>}
      <div className="p-4">{children}</div>
    </div>
  )
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-surface-2)] w-fit">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className="px-4 py-1.5 rounded-md text-xs font-medium transition-all"
          style={{
            background: value === o.value ? 'var(--color-surface-1)' : 'transparent',
            color: value === o.value ? 'var(--color-text-pri)' : 'var(--color-text-muted)',
            boxShadow: value === o.value ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// 3-step add account modal
function AddAccountModal({ onClose, onAdded }) {
  const [step, setStep] = useState(0)
  const [broker, setBroker] = useState('')
  const [terminalId, setTerminalId] = useState('')
  const [creds, setCreds] = useState({ login: '', password: '', server: '' })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const addNotif = useNotifStore((s) => s.addNotification)

  const { data: brokers = [] } = useQuery({ queryKey: ['brokers'], queryFn: getBrokers })
  const { data: terminals = [] } = useQuery({
    queryKey: ['terminals', broker], queryFn: () => getBrokerTerminals(broker), enabled: !!broker,
  })

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const acc = await createAccount({ 
        broker, 
        terminal_id: terminalId, 
        ...creds, 
        login: parseInt(creds.login),
        account_name: `${broker} - ${creds.login}`
      })
      const status = await getAccountStatus(acc.id)
      setTestResult(status?.connected ? 'success' : 'fail')
      if (status?.connected) { onAdded(); onClose() }
    } catch (e) {
      setTestResult('fail')
      const errorMessage = e.response?.data?.detail || 'Connection failed'
      addNotif({ type: 'error', title: 'Connection failed', message: errorMessage })
    }
    setTesting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-sm bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--color-text-pri)]">Add MT5 Account</span>
          <button onClick={onClose}><X size={16} className="text-[var(--color-text-muted)]" /></button>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2">
          {['Broker', 'Terminal', 'Credentials'].map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: step >= i ? 'var(--color-accent)' : 'var(--color-surface-2)', color: step >= i ? '#fff' : 'var(--color-text-muted)' }}>
                {step > i ? '\u2713' : i + 1}
              </div>
              <span className="text-[10px] text-[var(--color-text-muted)]">{s}</span>
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-[var(--color-text-sec)]">Select Broker</label>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {brokers.length === 0
                ? <p className="text-xs text-[var(--color-text-muted)]">Loading brokers…</p>
                : brokers.map((b) => (
                  <button key={b.broker} onClick={() => setBroker(b.broker)}
                    className="text-left px-3 py-2 rounded-lg text-xs transition-colors"
                    style={{ background: broker === b.broker ? 'var(--color-accent)' : 'var(--color-surface-2)', color: broker === b.broker ? '#fff' : 'var(--color-text-pri)' }}>
                    {b.broker}
                    {b.status === 'unavailable' && <span className="ml-2 text-[var(--color-text-muted)]">(unavailable)</span>}
                  </button>
                ))
              }
            </div>
            <Button disabled={!broker} onClick={() => setStep(1)}>Next</Button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-[var(--color-text-sec)]">Select Terminal</label>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {terminals.length === 0
                ? <p className="text-xs text-[var(--color-text-muted)]">No terminals found for {broker}.</p>
                : terminals.map((t) => {
                    const isAvailable = t.status === 'available'
                    return (
                      <button 
                        key={t.path} 
                        onClick={() => isAvailable && setTerminalId(t.path)}
                        disabled={!isAvailable}
                        className={`text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                          !isAvailable 
                            ? 'opacity-50 cursor-not-allowed bg-[var(--color-surface-3)]' 
                            : terminalId === t.path 
                              ? 'bg-[var(--color-accent)] text-white' 
                              : 'bg-[var(--color-surface-2)] text-[var(--color-text-pri)] hover:bg-[var(--color-surface-3)]'
                        }`}>
                        <div className="flex items-center justify-between">
                          <span>{t.path}</span>
                          <span className={`text-[10px] capitalize ${
                            t.status === 'available' ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'
                          }`}>
                            {t.status === 'available' ? 'Available' : t.status === 'in_use' ? 'In use' : 'Unavailable'}
                          </span>
                        </div>
                      </button>
                    )
                  })
              }
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button disabled={!terminalId} onClick={() => setStep(2)} className="flex-1">Next</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <Input label="Login (Account Number)" type="number" value={creds.login} onChange={(e) => setCreds((c) => ({ ...c, login: e.target.value }))} />
            <Input label="Password" type="password" value={creds.password} onChange={(e) => setCreds((c) => ({ ...c, password: e.target.value }))} />
            <Input label="Server" value={creds.server} onChange={(e) => setCreds((c) => ({ ...c, server: e.target.value }))} placeholder="e.g. Exness-MT5Trial9" />
            {testResult === 'fail' && <p className="text-xs text-[var(--color-loss)]">Connection failed. Check credentials.</p>}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button disabled={testing || !creds.login || !creds.password || !creds.server} onClick={handleTest} className="flex-1">
                {testing ? 'Testing…' : 'Connect & Test'}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

const SHORTCUTS = [
  { key: 'Ctrl+K', desc: 'Open command palette' },
  { key: 'Ctrl+H', desc: 'Go to Home' },
  { key: 'Ctrl+T', desc: 'Go to Trading Hub' },
  { key: 'Ctrl+/', desc: 'Go to Chart' },
  { key: 'Esc', desc: 'Close modal / panel' },
]

export default function Settings() {
  const { theme, setTheme } = useThemeStore()
  const { activeAccount, setActiveAccount } = useAccountStore()
  const addNotif = useNotifStore((s) => s.addNotification)
  const qc = useQueryClient()
  const [showAddAccount, setShowAddAccount] = useState(false)

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: getAccounts })

  const handleThemeChange = async (t) => {
    setTheme(t)
    await updateSettings({ theme_preference: t }).catch(() => {})
  }

  const handleActivate = async (acc) => {
    await activateAccount(acc.id).catch(() => {})
    setActiveAccount(acc)
    qc.invalidateQueries({ queryKey: ['accounts'] })
    addNotif({ type: 'success', title: `Switched to ${acc.broker}` })
  }

  const handleDelete = async (id) => {
    await deleteAccount(id).catch(() => {})
    qc.invalidateQueries({ queryKey: ['accounts'] })
    addNotif({ type: 'success', title: 'Account removed' })
  }

  const handleExport = (path, filename) => {
    const { accessToken } = JSON.parse(localStorage.getItem('ribon7-auth') || '{}')?.state || {}
    const url = `${BASE_API}${path}?account_id=${activeAccount?.id}`
    fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = filename
        a.click()
        URL.revokeObjectURL(a.href)
      })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4">

        {/* Appearance */}
        <Card title="Appearance">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-pri)]">Theme</p>
              <p className="text-xs text-[var(--color-text-muted)]">Choose your preferred color scheme</p>
            </div>
            <SegmentedControl
              options={[{ value: 'system', label: 'System' }, { value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
              value={theme}
              onChange={handleThemeChange}
            />
          </div>
        </Card>

        {/* MT5 Accounts */}
        <Card title="MT5 Accounts">
          <div className="flex flex-col gap-2">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-2)]">
                <span className={`w-2 h-2 rounded-full shrink-0 ${acc.id === activeAccount?.id ? 'bg-[var(--color-profit)]' : 'bg-[var(--color-border)]'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text-pri)]">{acc.broker}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--mono)' }}>{acc.login}</p>
                </div>
                {acc.id === activeAccount?.id
                  ? <Badge variant="profit">Active</Badge>
                  : <Button size="sm" variant="secondary" onClick={() => handleActivate(acc)}>Set Active</Button>
                }
                <button onClick={() => handleDelete(acc.id)}
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-loss)] transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={() => setShowAddAccount(true)} className="mt-1 w-fit">
              <Plus size={13} /> Add Account
            </Button>
          </div>
        </Card>

        {/* Data Export */}
        <Card title="Data Export">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Trades CSV', path: '/export/trades/csv', file: 'trades.csv' },
              { label: 'Trades PDF', path: '/export/trades/pdf', file: 'trades.pdf' },
              { label: 'Analytics PDF', path: '/export/analytics/pdf', file: 'analytics.pdf' },
            ].map((e) => (
              <Button key={e.label} variant="secondary" size="sm" onClick={() => handleExport(e.path, e.file)}>
                <Download size={12} /> {e.label}
              </Button>
            ))}
          </div>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card title="Keyboard Shortcuts">
          <div className="flex flex-col gap-0">
            {SHORTCUTS.map((s) => (
              <div key={s.key} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                <span className="text-xs text-[var(--color-text-sec)]">{s.desc}</span>
                <kbd className="px-2 py-0.5 rounded text-[10px] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--mono)' }}>
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {showAddAccount && (
          <AddAccountModal
            onClose={() => setShowAddAccount(false)}
            onAdded={() => qc.invalidateQueries({ queryKey: ['accounts'] })}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
