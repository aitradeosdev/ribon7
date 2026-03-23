import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingDown, Target, DollarSign, Trash2, Plus, X } from 'lucide-react'
import { useAccountStore } from '../../store/accountStore'
import { useNotifStore } from '../../store/notifStore'
import { getAlerts, createAlert, updateAlert, deleteAlert } from '../../api/users'
import { searchSymbols } from '../../api/symbols'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'

const TYPE_ICONS = { price: Target, drawdown: TrendingDown, daily_goal: DollarSign }
const TYPE_LABELS = { price: 'Price Alert', drawdown: 'Drawdown Alert', daily_goal: 'Daily Goal' }

function alertDescription(a) {
  if (a.alert_type === 'price') return `${a.symbol} ${a.condition} ${a.value}`
  if (a.alert_type === 'drawdown') return `Drawdown exceeds ${a.value}%`
  if (a.alert_type === 'daily_goal') return `Daily ${a.condition} ${a.value}`
  return a.condition
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-9 h-5 rounded-full transition-colors shrink-0"
      style={{ background: checked ? 'var(--color-accent)' : 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

function AlertCard({ alert, onToggle, onDelete }) {
  const Icon = TYPE_ICONS[alert.alert_type] || Target
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-colors">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'var(--color-surface-2)' }}>
        <Icon size={15} className="text-[var(--color-accent)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--color-text-pri)]">{alertDescription(alert)}</p>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{TYPE_LABELS[alert.alert_type]}</p>
      </div>
      {alert.is_triggered && <Badge variant="warn">Triggered</Badge>}
      <Toggle checked={alert.is_active} onChange={(v) => onToggle(alert.id, v)} />
      <button onClick={() => onDelete(alert.id)}
        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-loss)] hover:bg-[var(--color-surface-2)] transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function CreateModal({ accountId, onClose, onCreated }) {
  const [type, setType] = useState('price')
  const [symbol, setSymbol] = useState('')
  const [symbolResults, setSymbolResults] = useState([])
  const [condition, setCondition] = useState('above')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const addNotif = useNotifStore((s) => s.addNotification)

  const handleSymbolSearch = async (q) => {
    setSymbol(q)
    if (q.length < 2) { setSymbolResults([]); return }
    const res = await searchSymbols(q, accountId).catch(() => [])
    setSymbolResults(res.slice(0, 6))
  }

  const handleSubmit = async () => {
    if (!value) return
    setLoading(true)
    try {
      const body = { account_id: accountId, alert_type: type, condition, value: parseFloat(value) }
      if (type === 'price') body.symbol = symbol
      await createAlert(body)
      addNotif({ type: 'success', title: 'Alert created' })
      onCreated()
      onClose()
    } catch (e) {
      addNotif({ type: 'error', title: 'Failed', message: e.response?.data?.detail })
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-text-pri)]">Create Alert</h3>
          <button onClick={onClose}><X size={16} className="text-[var(--color-text-muted)]" /></button>
        </div>

        {/* Type selector */}
        <div className="flex gap-1">
          {['price', 'drawdown', 'daily_goal'].map((t) => (
            <button key={t} onClick={() => setType(t)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: type === t ? 'var(--color-accent)' : 'var(--color-surface-2)',
                color: type === t ? '#fff' : 'var(--color-text-muted)',
              }}>
              {t === 'daily_goal' ? 'Goal' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {type === 'price' && (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Input label="Symbol" value={symbol} onChange={(e) => handleSymbolSearch(e.target.value)} placeholder="Search symbol…" />
              {symbolResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] overflow-hidden shadow-lg">
                  {symbolResults.map((s) => (
                    <button key={s.symbol} onClick={() => { setSymbol(s.symbol); setSymbolResults([]) }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-surface-1)] transition-colors text-[var(--color-text-pri)]">
                      {s.symbol} <span className="text-[var(--color-text-muted)]">{s.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs font-medium text-[var(--color-text-sec)]">Condition</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value)}
                  className="px-3 py-2 text-sm bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-pri)] outline-none focus:border-[var(--color-accent)] appearance-none">
                  <option value="above">Above</option>
                  <option value="below">Below</option>
                </select>
              </div>
              <Input label="Price" type="number" step="0.00001" value={value} onChange={(e) => setValue(e.target.value)} className="flex-1" />
            </div>
          </div>
        )}

        {type === 'drawdown' && (
          <Input label="Drawdown %" type="number" value={value || '75'} onChange={(e) => setValue(e.target.value)} placeholder="75" />
        )}

        {type === 'daily_goal' && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs font-medium text-[var(--color-text-sec)]">Type</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value)}
                  className="px-3 py-2 text-sm bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-pri)] outline-none focus:border-[var(--color-accent)] appearance-none">
                  <option value="profit_target">Profit Target</option>
                  <option value="max_loss">Max Loss</option>
                </select>
              </div>
              <Input label="Amount" type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} className="flex-1" />
            </div>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? 'Creating…' : 'Create Alert'}
        </Button>
      </motion.div>
    </div>
  )
}

export default function Alerts() {
  const account = useAccountStore((s) => s.activeAccount)
  const addNotif = useNotifStore((s) => s.addNotification)
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', account?.id],
    queryFn: () => getAlerts(account.id),
    enabled: !!account?.id,
  })

  const active = alerts.filter((a) => !a.is_triggered)
  const triggered = alerts.filter((a) => a.is_triggered)

  const handleToggle = async (id, is_active) => {
    await updateAlert(id, { is_active }).catch(() => {})
    qc.invalidateQueries({ queryKey: ['alerts', account?.id] })
  }

  const handleDelete = async (id) => {
    await deleteAlert(id).catch(() => {})
    qc.invalidateQueries({ queryKey: ['alerts', account?.id] })
    addNotif({ type: 'success', title: 'Alert deleted' })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4">

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--color-text-pri)]">Alerts</span>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> Create Alert
          </Button>
        </div>

        {/* Active */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--color-border)]">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Active ({active.length})</span>
          </div>
          {active.length === 0
            ? <p className="px-4 py-6 text-xs text-[var(--color-text-muted)] text-center">No active alerts.</p>
            : active.map((a) => <AlertCard key={a.id} alert={a} onToggle={handleToggle} onDelete={handleDelete} />)
          }
        </div>

        {/* Triggered */}
        {triggered.length > 0 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[var(--color-border)]">
              <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Triggered ({triggered.length})</span>
            </div>
            {triggered.map((a) => <AlertCard key={a.id} alert={a} onToggle={handleToggle} onDelete={handleDelete} />)}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateModal
            accountId={account?.id}
            onClose={() => setShowCreate(false)}
            onCreated={() => qc.invalidateQueries({ queryKey: ['alerts', account?.id] })}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
