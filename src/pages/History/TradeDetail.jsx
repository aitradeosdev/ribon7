import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, X } from 'lucide-react'
import { useAccountStore } from '../../store/accountStore'
import { getTradeById, updateTags, updateNotes } from '../../api/trades'
import { getSymbolInfo, getSymbolCandles } from '../../api/symbols'
import { useNotifStore } from '../../store/notifStore'
import CandlestickChart from '../../components/charts/CandlestickChart'
import Badge from '../../components/ui/Badge'

const MONO = { fontFamily: 'var(--mono)' }

function Row({ label, value, colored }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <span
        className="text-xs font-medium"
        style={{
          ...MONO,
          color: colored != null
            ? colored >= 0 ? 'var(--color-profit)' : 'var(--color-loss)'
            : 'var(--color-text-pri)',
        }}
      >
        {value ?? '—'}
      </span>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <span className="text-xs font-semibold text-[var(--color-text-sec)] uppercase tracking-wider">{title}</span>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

function fmtDuration(openTime, closeTime) {
  if (!openTime || !closeTime) return '—'
  const s = Math.round((new Date(closeTime) - new Date(openTime)) / 1000)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return [h && `${h}h`, m && `${m}m`, `${sec}s`].filter(Boolean).join(' ')
}

function calcRR(trade) {
  const { open_price, sl, tp } = trade
  if (!open_price || !sl || !tp) return null
  const risk = Math.abs(open_price - sl)
  const reward = Math.abs(tp - open_price)
  if (!risk) return null
  return (reward / risk).toFixed(2)
}

function calcPips(trade) {
  if (!trade.open_price || !trade.close_price || !trade.digits) return null
  const raw = (trade.close_price - trade.open_price) * Math.pow(10, trade.digits)
  return (trade.trade_type === 'sell' ? -raw : raw).toFixed(1)
}

export default function TradeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const account = useAccountStore((s) => s.activeAccount)
  const addNotif = useNotifStore((s) => s.addNotification)

  const chartRef = useRef(null)
  const [tags, setTags] = useState([])
  const [notes, setNotes] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [candles, setCandles] = useState([])
  const saveTimerRef = useRef(null)
  const initializedRef = useRef(false)

  const { data: trade, isLoading } = useQuery({
    queryKey: ['trade', id],
    queryFn: () => getTradeById(id),
    enabled: !!id,
  })

  const { data: symbolInfo } = useQuery({
    queryKey: ['symbol-info', trade?.symbol, account?.id],
    queryFn: () => getSymbolInfo(trade.symbol, account.id),
    enabled: !!trade?.symbol && !!account?.id,
  })

  // Load candles for mini chart
  useEffect(() => {
    if (!trade?.symbol || !account?.id || !trade.open_time) return
    const from = new Date(new Date(trade.open_time).getTime() - 30 * 60 * 1000).toISOString()
    const to = trade.close_time
      ? new Date(new Date(trade.close_time).getTime() + 30 * 60 * 1000).toISOString()
      : new Date().toISOString()
    getSymbolCandles(trade.symbol, account.id, 'M15', from, to)
      .then((data) => {
        setCandles(data.map((c) => ({ t: c.time, o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume })))
      })
      .catch(() => {})
  }, [trade?.symbol, trade?.open_time, trade?.close_time, account?.id])

  // Init tags/notes from trade
  useEffect(() => {
    if (trade && !initializedRef.current) {
      setTags(trade.tags || [])
      setNotes(trade.notes || '')
      initializedRef.current = true
    }
  }, [trade])

  // Auto-save with 800ms debounce
  useEffect(() => {
    if (!initializedRef.current || !trade) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await Promise.all([
          updateTags(id, tags),
          updateNotes(id, notes),
        ])
        addNotif({ type: 'success', title: 'Saved ✓', duration: 1500 })
      } catch {
        addNotif({ type: 'error', title: 'Save failed' })
      }
    }, 800)
    return () => clearTimeout(saveTimerRef.current)
  }, [tags, notes])

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const val = tagInput.trim()
      if (!tags.includes(val)) setTags((prev) => [...prev, val])
      setTagInput('')
    }
  }

  const removeTag = (tag) => setTags((prev) => prev.filter((t) => t !== tag))

  // Build markers for mini chart
  const markers = []
  if (trade?.open_time) {
    markers.push({ time: trade.open_time, shape: trade.trade_type === 'buy' ? 'arrowUp' : 'arrowDown', color: trade.trade_type === 'buy' ? '#34d399' : '#f87171' })
  }
  if (trade?.close_time) {
    markers.push({ time: trade.close_time, shape: 'circle', color: (trade.profit || 0) >= 0 ? '#34d399' : '#f87171' })
  }

  if (isLoading) return <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">Loading…</div>
  if (!trade) return <div className="p-8 text-center text-xs text-[var(--color-loss)]">Trade not found.</div>

  const profit = trade.profit || 0
  const net = profit + (trade.commission || 0) + (trade.swap || 0)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/history')}
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <ArrowLeft size={16} className="text-[var(--color-text-sec)]" />
          </button>
          <div>
            <h1 className="text-base font-bold text-[var(--color-text-pri)]" style={MONO}>#{trade.ticket}</h1>
            <p className="text-xs text-[var(--color-text-muted)]">{trade.symbol} · {trade.trade_type?.toUpperCase()}</p>
          </div>
          <div className="ml-auto">
            <span
              className="text-lg font-bold"
              style={{ ...MONO, color: profit >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' }}
            >
              {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Left */}
          <div className="flex flex-col gap-4">
            <Card title="Trade Details">
              <Row label="Ticket" value={trade.ticket} />
              <Row label="Symbol" value={trade.symbol} />
              <Row label="Type" value={trade.trade_type?.toUpperCase()} />
              <Row label="Volume" value={trade.volume} />
              <Row label="Open Price" value={trade.open_price?.toFixed(5)} />
              <Row label="Close Price" value={trade.close_price?.toFixed(5)} />
              <Row label="Stop Loss" value={trade.sl?.toFixed(5) || '—'} />
              <Row label="Take Profit" value={trade.tp?.toFixed(5) || '—'} />
              <Row label="Open Time" value={trade.open_time ? new Date(trade.open_time).toLocaleString() : '—'} />
              <Row label="Close Time" value={trade.close_time ? new Date(trade.close_time).toLocaleString() : '—'} />
              <Row label="Duration" value={fmtDuration(trade.open_time, trade.close_time)} />
              <Row label="Commission" value={trade.commission?.toFixed(2)} colored={trade.commission} />
              <Row label="Swap" value={trade.swap?.toFixed(2)} colored={trade.swap} />
              <Row label="Net Profit" value={net.toFixed(2)} colored={net} />
              <Row label="R:R" value={calcRR(trade)} />
              <Row label="Pips" value={calcPips(trade)} colored={parseFloat(calcPips(trade))} />
            </Card>

            {/* Mini chart */}
            <Card title="Chart (M15)">
              <div style={{ height: 160 }}>
                <CandlestickChart
                  ref={chartRef}
                  candles={candles}
                  markers={markers}
                  priceLines={[]}
                  indicators={{}}
                  mini={false}
                  height={160}
                />
              </div>
            </Card>
          </div>

          {/* Right */}
          <div className="flex flex-col gap-4">
            {symbolInfo && (
              <Card title="Symbol Specs">
                <Row label="Description" value={symbolInfo.description} />
                <Row label="Contract Size" value={symbolInfo.contract_size?.toLocaleString()} />
                <Row label="Tick Value" value={symbolInfo.tick_value?.toFixed(5)} />
                <Row label="Digits" value={symbolInfo.digits} />
                <Row label="Spread" value={symbolInfo.spread} />
                <Row label="Swap Long" value={symbolInfo.swap_long?.toFixed(4)} colored={symbolInfo.swap_long} />
                <Row label="Swap Short" value={symbolInfo.swap_short?.toFixed(4)} colored={symbolInfo.swap_short} />
              </Card>
            )}

            <Card title="Journal">
              {/* Tags */}
              <div className="flex flex-col gap-2 mb-3">
                <label className="text-xs font-medium text-[var(--color-text-sec)]">Tags</label>
                <div className="flex flex-wrap gap-1 min-h-[28px]">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border"
                      style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', color: 'var(--color-text-sec)' }}
                    >
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-[var(--color-loss)]">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Type tag and press Enter…"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                  className="px-3 py-2 text-xs bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-pri)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[var(--color-text-sec)]">Notes</label>
                <textarea
                  rows={5}
                  placeholder="Add trade notes…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="px-3 py-2 text-xs bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-pri)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)] resize-none"
                />
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}
