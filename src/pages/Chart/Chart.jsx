import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronUp, Pencil, X, AlertTriangle, Check } from 'lucide-react'
import { useTickSocket } from '../../hooks/useTickSocket'
import { useHubSocket } from '../../hooks/useHubSocket'
import { tickSocket } from '../../ws/tickSocket'
import { getTrades } from '../../api/trades'
import { placeOrder, modifyPosition, closePosition } from '../../api/hub'
import { searchSymbols } from '../../api/symbols'
import { useAccountStore } from '../../store/accountStore'
import { useNotifStore } from '../../store/notifStore'
import CandlestickChart from '../../components/charts/CandlestickChart'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

const TIMEFRAMES = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1']
const INDICATORS = ['MA', 'EMA', 'BB', 'RSI', 'MACD']

// ── Trading Panel ─────────────────────────────────────────────────────────────
function TradingPanel({ symbol, positions, onClose }) {
  const addNotif = useNotifStore((s) => s.addNotification)
  const [direction, setDirection] = useState(null)
  const [form, setForm] = useState({ volume: '0.01', sl: '', tp: '', orderType: 'market', price: '' })
  const [loading, setLoading] = useState(false)
  const [modifying, setModifying] = useState(false)
  const [modifyVals, setModifyVals] = useState({ sl: '', tp: '' })
  const [confirmClose, setConfirmClose] = useState(false)

  const openPos = positions.find((p) => p.symbol === symbol)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleOrder = async () => {
    if (!direction || !form.volume) return
    setLoading(true)
    try {
      const type = direction === 'buy'
        ? (form.orderType === 'market' ? 'buy' : form.orderType === 'limit' ? 'buy_limit' : 'buy_stop')
        : (form.orderType === 'market' ? 'sell' : form.orderType === 'limit' ? 'sell_limit' : 'sell_stop')
      await placeOrder({
        symbol, type,
        volume: parseFloat(form.volume),
        price: form.orderType !== 'market' ? parseFloat(form.price) || undefined : undefined,
        sl: parseFloat(form.sl) || 0,
        tp: parseFloat(form.tp) || 0,
      })
      addNotif({ type: 'success', title: 'Order placed', message: `${type.toUpperCase()} ${symbol}` })
      setDirection(null)
    } catch (e) {
      addNotif({ type: 'error', title: 'Order failed', message: e.response?.data?.detail })
    }
    setLoading(false)
  }

  const handleModify = async () => {
    if (!openPos) return
    setLoading(true)
    try {
      await modifyPosition(openPos.ticket, { sl: parseFloat(modifyVals.sl) || 0, tp: parseFloat(modifyVals.tp) || 0 })
      addNotif({ type: 'success', title: 'Position modified' })
      setModifying(false)
    } catch (e) {
      addNotif({ type: 'error', title: 'Modify failed', message: e.response?.data?.detail })
    }
    setLoading(false)
  }

  const handleClose = async () => {
    if (!openPos) return
    setLoading(true)
    try {
      await closePosition(openPos.ticket)
      addNotif({ type: 'success', title: 'Position closed' })
      setConfirmClose(false)
    } catch (e) {
      addNotif({ type: 'error', title: 'Close failed', message: e.response?.data?.detail })
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto">
      {/* Buy / Sell */}
      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={() => setDirection(direction === 'buy' ? null : 'buy')}
          className="py-2.5 rounded-lg text-xs font-bold transition-all"
          style={{ background: direction === 'buy' ? 'var(--color-profit)' : 'rgba(52,211,153,0.15)', color: direction === 'buy' ? '#000' : 'var(--color-profit)' }}
        >BUY</button>
        <button
          onClick={() => setDirection(direction === 'sell' ? null : 'sell')}
          className="py-2.5 rounded-lg text-xs font-bold transition-all"
          style={{ background: direction === 'sell' ? 'var(--color-loss)' : 'rgba(248,113,113,0.15)', color: direction === 'sell' ? '#000' : 'var(--color-loss)' }}
        >SELL</button>
      </div>

      {/* Order form */}
      <AnimatePresence>
        {direction && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-2 overflow-hidden">
            <Select label="Type" value={form.orderType} onChange={(e) => set('orderType', e.target.value)}
              options={[{ value: 'market', label: 'Market' }, { value: 'limit', label: 'Limit' }, { value: 'stop', label: 'Stop' }]} />
            <Input label="Volume" type="number" step="0.01" value={form.volume} onChange={(e) => set('volume', e.target.value)} />
            {form.orderType !== 'market' && <Input label="Price" type="number" step="0.00001" value={form.price} onChange={(e) => set('price', e.target.value)} />}
            <div className="grid grid-cols-2 gap-2">
              <Input label="SL" type="number" step="0.00001" value={form.sl} onChange={(e) => set('sl', e.target.value)} placeholder="0" />
              <Input label="TP" type="number" step="0.00001" value={form.tp} onChange={(e) => set('tp', e.target.value)} placeholder="0" />
            </div>
            <Button className="w-full" disabled={loading} onClick={handleOrder}>
              {loading ? 'Placing…' : `${direction.toUpperCase()} ${symbol}`}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Open position card */}
      {openPos && (
        <div className="border border-[var(--color-border)] rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Badge variant={openPos.type === 'buy' ? 'profit' : 'loss'}>{openPos.type.toUpperCase()}</Badge>
            <span className="text-xs text-[var(--color-text-muted)]">#{openPos.ticket}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">Entry</span>
            <span className="text-xs" style={{ fontFamily: 'var(--mono)' }}>{openPos.open_price}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">P&L</span>
            <span className="text-sm font-semibold" style={{ fontFamily: 'var(--mono)', color: openPos.profit >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' }}>
              {openPos.profit >= 0 ? '+' : ''}{openPos.profit?.toFixed(2)}
            </span>
          </div>

          {!modifying && !confirmClose && (
            <div className="grid grid-cols-2 gap-1 mt-1">
              <Button size="sm" variant="secondary" onClick={() => { setModifying(true); setModifyVals({ sl: openPos.sl || '', tp: openPos.tp || '' }) }}>
                <Pencil size={11} /> Modify
              </Button>
              <Button size="sm" variant="danger" onClick={() => setConfirmClose(true)}>
                <X size={11} /> Close
              </Button>
            </div>
          )}

          {modifying && (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Input label="SL" value={modifyVals.sl} onChange={(e) => setModifyVals((v) => ({ ...v, sl: e.target.value }))} />
                <Input label="TP" value={modifyVals.tp} onChange={(e) => setModifyVals((v) => ({ ...v, tp: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <Button size="sm" disabled={loading} onClick={handleModify}><Check size={11} /> Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setModifying(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {confirmClose && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-[var(--color-warn)]">
                <AlertTriangle size={12} /> Close this position?
              </div>
              <div className="grid grid-cols-2 gap-1">
                <Button size="sm" variant="danger" disabled={loading} onClick={handleClose}>Yes</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmClose(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Chart page ────────────────────────────────────────────────────────────────
export default function Chart() {
  const { symbol: paramSymbol } = useParams()
  const symbol = paramSymbol || 'EURUSDm'
  const account = useAccountStore((s) => s.activeAccount)
  const addNotif = useNotifStore((s) => s.addNotification)

  const chartRef = useRef(null)
  const [timeframe, setTimeframe] = useState('H1')
  const [indicators, setIndicators] = useState({ ma: false, ema: false, bb: false })
  const [markers, setMarkers] = useState([])
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [candles, setCandles] = useState([])

  const { bid, ask, spread, dailyChangePct } = useTickSocket(symbol)
  const { positions } = useHubSocket()

  // Handle tick WS messages for candles
  useEffect(() => {
    if (!account?.id) return
    const unsub = tickSocket.onMessage(symbol, (data) => {
      if (data.type === 'candles_history') {
        const mapped = (data.candles || []).map((c) => ({
          t: c.time, o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume,
        }))
        setCandles(mapped)
        pendingCandlesRef.current = null
      } else if (data.type === 'candle_update') {
        const c = data.candle
        if (c) chartRef.current?.updateCandle({ t: c.time, o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume })
      } else if (data.type === 'tick') {
        chartRef.current?.setLiveBid(data.bid)
      }
    })
    return () => unsub()
  }, [symbol, account?.id])

  // Send set_timeframe — retry until socket is open
  useEffect(() => {
    if (!account?.id) return
    setCandles([]) // clear stale candles on timeframe change
    let cancelled = false
    const trySend = () => {
      if (cancelled) return
      const sent = tickSocket.send(symbol, { type: 'set_timeframe', timeframe })
      if (!sent) setTimeout(trySend, 200)
    }
    trySend()
    return () => { cancelled = true }
  }, [timeframe, symbol, account?.id])

  // Trade markers
  useEffect(() => {
    if (!account?.id) return
    getTrades({ account_id: account.id, symbol, limit: 200 }).then((res) => {
      const style = getComputedStyle(document.documentElement)
      const profit = style.getPropertyValue('--color-profit').trim()
      const loss = style.getPropertyValue('--color-loss').trim()
      const m = []
      ;(res.trades || []).forEach((t) => {
        if (t.open_time) m.push({ time: t.open_time, shape: t.trade_type === 'buy' ? 'arrowUp' : 'arrowDown', color: t.trade_type === 'buy' ? profit : loss })
        if (t.close_time) m.push({ time: t.close_time, shape: 'circle', color: (t.profit || 0) >= 0 ? profit : loss })
      })
      setMarkers(m)
    }).catch(() => {})
  }, [symbol, account?.id])

  // Position price lines
  const symPositions = positions.filter((p) => p.symbol === symbol)
  const priceLines = symPositions.flatMap((p) => {
    const style = getComputedStyle(document.documentElement)
    const warn = style.getPropertyValue('--color-warn').trim()
    const loss = style.getPropertyValue('--color-loss').trim()
    const profit = style.getPropertyValue('--color-profit').trim()
    const lines = [{ price: p.open_price, color: warn, label: 'Entry', dash: true }]
    if (p.sl) lines.push({ price: p.sl, color: loss, label: 'SL', dash: true })
    if (p.tp) lines.push({ price: p.tp, color: profit, label: 'TP', dash: true })
    return lines
  })

  const toggleIndicator = (key) => {
    if (key === 'RSI' || key === 'MACD') {
      addNotif({ type: 'info', title: `${key} coming soon` })
      return
    }
    const k = key.toLowerCase()
    setIndicators((prev) => ({ ...prev, [k]: !prev[k] }))
  }

  const changeVariant = dailyChangePct == null ? 'neutral' : dailyChangePct >= 0 ? 'profit' : 'loss'

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Chart wrap */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div className="h-11 flex items-center gap-3 px-4 border-b border-[var(--color-border)] bg-[var(--color-surface-1)] shrink-0">
          <span className="text-sm font-bold text-[var(--color-text-pri)]" style={{ fontFamily: 'var(--mono)' }}>{symbol}</span>
          {bid != null && (
            <>
              <span className="text-sm" style={{ fontFamily: 'var(--mono)', color: 'var(--color-text-pri)' }}>{bid.toFixed(5)}</span>
              <span className="text-xs text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--mono)' }}>{ask?.toFixed(5)}</span>
              {spread != null && <Badge variant="neutral">Spread {spread.toFixed(5)}</Badge>}
            </>
          )}
          <Badge variant={changeVariant}>
            {dailyChangePct != null ? `${dailyChangePct >= 0 ? '+' : ''}${dailyChangePct.toFixed(2)}%` : '—'}
          </Badge>
          <span className="w-2 h-2 rounded-full bg-[var(--color-live)] ml-1" style={{ boxShadow: '0 0 6px var(--color-live)', animation: 'pulse 2s infinite' }} />
        </div>

        {/* Timeframe + Indicators row */}
        <div className="h-[38px] flex items-center gap-1 px-4 border-b border-[var(--color-border)] bg-[var(--color-surface-1)] shrink-0 overflow-x-auto">
          {TIMEFRAMES.map((tf) => (
            <button key={tf} onClick={() => setTimeframe(tf)}
              className="px-3 h-full text-xs font-medium transition-colors whitespace-nowrap"
              style={{
                color: timeframe === tf ? 'var(--color-accent)' : 'var(--color-text-muted)',
                borderBottom: timeframe === tf ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}>
              {tf}
            </button>
          ))}
          <div className="w-px h-4 bg-[var(--color-border)] mx-2" />
          {INDICATORS.map((ind) => {
            const k = ind.toLowerCase()
            const active = indicators[k]
            return (
              <button key={ind} onClick={() => toggleIndicator(ind)}
                className="px-2.5 py-0.5 rounded text-xs font-medium transition-colors"
                style={{
                  background: active ? 'var(--color-accent)' : 'transparent',
                  color: active ? '#fff' : 'var(--color-text-muted)',
                  border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}>
                {ind}
              </button>
            )
          })}
        </div>

        {/* Chart body + Trading panel */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Canvas */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <CandlestickChart
              ref={chartRef}
              candles={candles}
              markers={markers}
              priceLines={priceLines}
              indicators={indicators}
              mini={false}
            />
          </div>

          {/* Trading panel — desktop only */}
          <div
            id="trading-panel"
            style={{ width: 200, borderLeft: '1px solid var(--color-border)', background: 'var(--color-surface-1)', overflow: 'hidden' }}
          >
            <TradingPanel symbol={symbol} positions={symPositions} />
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setMobilePanelOpen(true)}
        className="fixed right-4 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
        style={{ bottom: 'calc(var(--floating-bottom, 16px) + 56px)', background: 'var(--color-accent)', display: 'none' }}
        id="chart-fab"
      >
        <ChevronUp size={20} color="#fff" />
      </button>

      {/* Mobile panel */}
      <AnimatePresence>
        {mobilePanelOpen && (
          <motion.div className="fixed inset-0 z-50 flex flex-col justify-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobilePanelOpen(false)} />
            <motion.div
              className="relative bg-[var(--color-surface-1)] border-t border-[var(--color-border)] rounded-t-2xl max-h-[80vh] overflow-y-auto"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                <span className="text-sm font-semibold">{symbol} — Trade</span>
                <button onClick={() => setMobilePanelOpen(false)}><X size={18} /></button>
              </div>
              <TradingPanel symbol={symbol} positions={symPositions} onClose={() => setMobilePanelOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS for pulse + mobile panel/FAB visibility */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        #app.mobile-mode #trading-panel { display: none !important; }
        #app.mobile-mode #chart-fab { display: flex !important; }
      `}</style>
    </div>
  )
}
