import React, { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, X, Check, AlertTriangle } from 'lucide-react'
import { useHubSocket } from '../../hooks/useHubSocket'
import { closePosition, modifyPosition, placeOrder, cancelOrder } from '../../api/hub'
import { searchSymbols } from '../../api/symbols'
import { useAccountStore } from '../../store/accountStore'
import { useNotifStore } from '../../store/notifStore'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

// ── Stat strip ────────────────────────────────────────────────────────────────
function StatStrip({ summary }) {
  if (!summary) return (
    <div className="grid grid-cols-3 gap-px bg-[var(--color-border)] border-b border-[var(--color-border)]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-[var(--color-surface-1)] px-4 py-3 h-16 animate-pulse" />
      ))}
    </div>
  )

  const pl = summary.profit ?? 0
  const marginLevel = summary.margin_level ?? 0
  const mlColor = marginLevel === 0 ? 'var(--color-text-muted)' : marginLevel < 100 ? 'var(--color-loss)' : marginLevel < 200 ? 'var(--color-warn)' : 'var(--color-profit)'
  const plColor = pl >= 0 ? 'var(--color-profit)' : 'var(--color-loss)'
  const plGlow = pl >= 0 ? '0 0 12px rgba(52,211,153,0.3)' : '0 0 12px rgba(248,113,113,0.3)'

  const stats = [
    { label: 'Balance', value: summary.balance?.toFixed(2), prefix: '$' },
    { label: 'Equity', value: summary.equity?.toFixed(2), prefix: '$' },
    { label: 'P&L', value: (pl >= 0 ? '+' : '') + pl.toFixed(2), prefix: '$', color: plColor, glow: plGlow },
    { label: 'Margin', value: summary.margin?.toFixed(2), prefix: '$' },
    { label: 'Free Margin', value: summary.free_margin?.toFixed(2), prefix: '$' },
    { label: 'Margin Level', value: marginLevel > 0 ? marginLevel.toFixed(1) + '%' : '—', color: mlColor },
  ]

  return (
    <div className="grid grid-cols-3 gap-px bg-[var(--color-border)] border-b border-[var(--color-border)]">
      {stats.map((s) => (
        <div key={s.label} className="bg-[var(--color-surface-1)] px-4 py-3">
          <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">{s.label}</p>
          <p className="text-sm font-semibold" style={{ fontFamily: 'var(--mono)', color: s.color || 'var(--color-text-pri)', textShadow: s.glow }}>
            {s.prefix}{s.value ?? '—'}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Profit cell with flash ────────────────────────────────────────────────────
function ProfitCell({ value }) {
  const prevRef = useRef(null)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    if (prevRef.current !== null && value !== prevRef.current) {
      setFlash(value > prevRef.current ? 'up' : 'down')
      const t = setTimeout(() => setFlash(null), 400)
      return () => clearTimeout(t)
    }
    prevRef.current = value
  }, [value])

  useEffect(() => { prevRef.current = value }, [value])

  const base = value >= 0 ? 'var(--color-profit)' : 'var(--color-loss)'
  const flashColor = flash === 'up' ? 'var(--color-profit)' : flash === 'down' ? 'var(--color-loss)' : base

  return (
    <span style={{ fontFamily: 'var(--mono)', color: flashColor, transition: 'color 0.3s' }}>
      {value >= 0 ? '+' : ''}{value?.toFixed(2)}
    </span>
  )
}

// ── Positions table ───────────────────────────────────────────────────────────
function PositionsTable({ positions, onRefresh }) {
  const [modifying, setModifying] = useState(null) // ticket
  const [modifyVals, setModifyVals] = useState({ sl: '', tp: '' })
  const [closing, setClosing] = useState(null) // ticket
  const [loading, setLoading] = useState(null)
  const addNotif = useNotifStore((s) => s.addNotification)

  const handleModifySave = async (ticket) => {
    setLoading(ticket)
    try {
      await modifyPosition(ticket, { sl: parseFloat(modifyVals.sl) || 0, tp: parseFloat(modifyVals.tp) || 0 })
      addNotif({ type: 'success', title: 'Position modified' })
      setModifying(null)
    } catch (e) {
      addNotif({ type: 'error', title: 'Modify failed', message: e.response?.data?.detail })
    }
    setLoading(null)
  }

  const handleClose = async (ticket) => {
    setLoading(ticket)
    try {
      await closePosition(ticket)
      addNotif({ type: 'success', title: 'Position closed' })
      setClosing(null)
    } catch (e) {
      addNotif({ type: 'error', title: 'Close failed', message: e.response?.data?.detail })
    }
    setLoading(null)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[700px]">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {['Ticket', 'Symbol', 'Type', 'Volume', 'Open', 'Current', 'SL', 'TP', 'Swap', 'Profit', ''].map((h) => (
              <th key={h} className={`px-3 py-2 text-left text-[var(--color-text-muted)] font-medium whitespace-nowrap ${h === 'Profit' ? 'sticky right-10 bg-[var(--color-surface-1)]' : ''} ${h === '' ? 'sticky right-0 bg-[var(--color-surface-1)]' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.length === 0 && (
            <tr><td colSpan={11} className="px-3 py-8 text-center text-[var(--color-text-muted)]">No open positions</td></tr>
          )}
          {positions.map((p) => (
            <React.Fragment key={p.ticket}>
              <tr className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-2)]/50 transition-colors">
                <td className="px-3 py-2.5 text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--mono)' }}>{p.ticket}</td>
                <td className="px-3 py-2.5 font-semibold text-[var(--color-text-pri)]">{p.symbol}</td>
                <td className="px-3 py-2.5"><Badge variant={p.type === 'buy' ? 'profit' : 'loss'}>{p.type.toUpperCase()}</Badge></td>
                <td className="px-3 py-2.5" style={{ fontFamily: 'var(--mono)' }}>{p.volume}</td>
                <td className="px-3 py-2.5" style={{ fontFamily: 'var(--mono)' }}>{p.open_price}</td>
                <td className="px-3 py-2.5" style={{ fontFamily: 'var(--mono)' }}>{p.current_price}</td>
                <td className="px-3 py-2.5 text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--mono)' }}>{p.sl || '—'}</td>
                <td className="px-3 py-2.5 text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--mono)' }}>{p.tp || '—'}</td>
                <td className="px-3 py-2.5 text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--mono)' }}>{p.swap?.toFixed(2)}</td>
                <td className="px-3 py-2.5 sticky right-10 bg-[var(--color-surface-1)]"><ProfitCell value={p.profit} /></td>
                <td className="px-3 py-2.5 sticky right-0 bg-[var(--color-surface-1)]">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setModifying(modifying === p.ticket ? null : p.ticket); setModifyVals({ sl: p.sl || '', tp: p.tp || '' }); setClosing(null) }}
                      className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-2)] transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => { setClosing(closing === p.ticket ? null : p.ticket); setModifying(null) }}
                      className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-loss)] hover:bg-[var(--color-surface-2)] transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                </td>
              </tr>

              {modifying === p.ticket && (
                <tr>
                  <td colSpan={11} className="px-3 pb-3 bg-[var(--color-surface-2)]/50">
                    <div className="flex items-center gap-3 pt-2">
                      <span className="text-[var(--color-text-muted)] text-xs">Modify SL/TP</span>
                      <input value={modifyVals.sl} onChange={(e) => setModifyVals((v) => ({ ...v, sl: e.target.value }))}
                        placeholder="SL" className="w-28 px-2 py-1 text-xs bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-md text-[var(--color-text-pri)] outline-none focus:border-[var(--color-accent)]" style={{ fontFamily: 'var(--mono)' }} />
                      <input value={modifyVals.tp} onChange={(e) => setModifyVals((v) => ({ ...v, tp: e.target.value }))}
                        placeholder="TP" className="w-28 px-2 py-1 text-xs bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-md text-[var(--color-text-pri)] outline-none focus:border-[var(--color-accent)]" style={{ fontFamily: 'var(--mono)' }} />
                      <Button size="sm" disabled={loading === p.ticket} onClick={() => handleModifySave(p.ticket)}><Check size={12} /> Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setModifying(null)}>Cancel</Button>
                    </div>
                  </td>
                </tr>
              )}

              {closing === p.ticket && (
                <tr>
                  <td colSpan={11} className="px-3 pb-3 bg-[var(--color-loss)]/5">
                    <div className="flex items-center gap-3 pt-2">
                      <AlertTriangle size={13} className="text-[var(--color-loss)]" />
                      <span className="text-xs text-[var(--color-text-sec)]">Close this position?</span>
                      <Button size="sm" variant="danger" disabled={loading === p.ticket} onClick={() => handleClose(p.ticket)}>Yes, close</Button>
                      <Button size="sm" variant="ghost" onClick={() => setClosing(null)}>Cancel</Button>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Orders table ──────────────────────────────────────────────────────────────
function OrdersTable({ orders }) {
  const [cancelling, setCancelling] = useState(null)
  const addNotif = useNotifStore((s) => s.addNotification)

  const handleCancel = async (ticket) => {
    setCancelling(ticket)
    try {
      await cancelOrder(ticket)
      addNotif({ type: 'success', title: 'Order cancelled' })
    } catch (e) {
      addNotif({ type: 'error', title: 'Cancel failed', message: e.response?.data?.detail })
    }
    setCancelling(null)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[500px]">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {['Ticket', 'Symbol', 'Type', 'Volume', 'Price', 'SL', 'TP', ''].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-[var(--color-text-muted)] font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 && (
            <tr><td colSpan={8} className="px-3 py-8 text-center text-[var(--color-text-muted)]">No pending orders</td></tr>
          )}
          {orders.map((o) => (
            <tr key={o.ticket} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-2)]/50 transition-colors">
              <td className="px-3 py-2.5 text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--mono)' }}>{o.ticket}</td>
              <td className="px-3 py-2.5 font-semibold text-[var(--color-text-pri)]">{o.symbol}</td>
              <td className="px-3 py-2.5"><Badge variant="neutral">{o.type}</Badge></td>
              <td className="px-3 py-2.5" style={{ fontFamily: 'var(--mono)' }}>{o.volume}</td>
              <td className="px-3 py-2.5" style={{ fontFamily: 'var(--mono)' }}>{o.price}</td>
              <td className="px-3 py-2.5 text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--mono)' }}>{o.sl || '—'}</td>
              <td className="px-3 py-2.5 text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--mono)' }}>{o.tp || '—'}</td>
              <td className="px-3 py-2.5">
                <Button size="sm" variant="ghost" disabled={cancelling === o.ticket} onClick={() => handleCancel(o.ticket)}>
                  <X size={12} /> Cancel
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── New Order modal ───────────────────────────────────────────────────────────
const ORDER_TYPES = [
  { value: 'buy', label: 'Buy (Market)' },
  { value: 'sell', label: 'Sell (Market)' },
  { value: 'buy_limit', label: 'Buy Limit' },
  { value: 'sell_limit', label: 'Sell Limit' },
  { value: 'buy_stop', label: 'Buy Stop' },
  { value: 'sell_stop', label: 'Sell Stop' },
]

function NewOrderModal({ open, onClose }) {
  const account = useAccountStore((s) => s.activeAccount)
  const addNotif = useNotifStore((s) => s.addNotification)
  const [form, setForm] = useState({ symbol: '', type: 'buy', volume: '0.01', price: '', sl: '', tp: '', comment: '' })
  const [symbolQuery, setSymbolQuery] = useState('')
  const [symbolResults, setSymbolResults] = useState([])
  const [loading, setLoading] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    if (!symbolQuery || !account?.id) { setSymbolResults([]); return }
    const t = setTimeout(() => {
      searchSymbols(symbolQuery, account.id).then(setSymbolResults).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [symbolQuery, account?.id])

  const isMarket = ['buy', 'sell'].includes(form.type)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await placeOrder({
        symbol: form.symbol,
        type: form.type,
        volume: parseFloat(form.volume),
        price: isMarket ? undefined : parseFloat(form.price) || undefined,
        sl: parseFloat(form.sl) || 0,
        tp: parseFloat(form.tp) || 0,
        comment: form.comment,
      })
      addNotif({ type: 'success', title: 'Order placed', message: `${form.type.toUpperCase()} ${form.symbol}` })
      onClose()
    } catch (e) {
      addNotif({ type: 'error', title: 'Order failed', message: e.response?.data?.detail })
    }
    setLoading(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="New Order">
      <div className="flex flex-col gap-4">
        {/* Symbol search */}
        <div className="relative">
          <Input label="Symbol" value={symbolQuery} onChange={(e) => { setSymbolQuery(e.target.value); set('symbol', e.target.value) }} placeholder="e.g. EURUSDm" />
          {symbolResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg shadow-xl z-10 max-h-40 overflow-y-auto">
              {symbolResults.map((r) => (
                <button key={r.symbol} onClick={() => { set('symbol', r.symbol); setSymbolQuery(r.symbol); setSymbolResults([]) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-surface-3)] transition-colors">
                  <span className="font-medium text-[var(--color-text-pri)]">{r.symbol}</span>
                  <span className="text-[var(--color-text-muted)] ml-2">{r.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Select label="Order Type" value={form.type} onChange={(e) => set('type', e.target.value)} options={ORDER_TYPES} />
        <Input label="Volume" type="number" step="0.01" value={form.volume} onChange={(e) => set('volume', e.target.value)} />
        {!isMarket && <Input label="Price" type="number" step="0.00001" value={form.price} onChange={(e) => set('price', e.target.value)} />}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Stop Loss" type="number" step="0.00001" value={form.sl} onChange={(e) => set('sl', e.target.value)} placeholder="0 = none" />
          <Input label="Take Profit" type="number" step="0.00001" value={form.tp} onChange={(e) => set('tp', e.target.value)} placeholder="0 = none" />
        </div>

        <Input label="Comment" value={form.comment} onChange={(e) => set('comment', e.target.value)} placeholder="Optional" />

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={!form.symbol || !form.volume || loading} onClick={handleSubmit}>
            {loading ? 'Placing…' : 'Place Order'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Hub page ──────────────────────────────────────────────────────────────────
export default function Hub() {
  const { summary, positions, orders } = useHubSocket()
  const [newOrderOpen, setNewOrderOpen] = useState(false)

  return (
    <div className="flex flex-col h-full">
      <StatStrip summary={summary} />

      <div className="flex-1 overflow-y-auto">
        {/* Positions */}
        <div className="border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--color-text-pri)]">Positions</span>
              <Badge variant={positions.length > 0 ? 'live' : 'neutral'}>{positions.length}</Badge>
            </div>
            <Button size="sm" onClick={() => setNewOrderOpen(true)}><Plus size={13} /> New Order</Button>
          </div>
          <PositionsTable positions={positions} />
        </div>

        {/* Orders */}
        <div>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
            <span className="text-sm font-semibold text-[var(--color-text-pri)]">Pending Orders</span>
            <Badge variant="neutral">{orders.length}</Badge>
          </div>
          <OrdersTable orders={orders} />
        </div>
      </div>

      <NewOrderModal open={newOrderOpen} onClose={() => setNewOrderOpen(false)} />
    </div>
  )
}
