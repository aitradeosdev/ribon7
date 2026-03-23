import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { useAccountStore } from '../../store/accountStore'
import { getTrades } from '../../api/trades'
import Badge from '../../components/ui/Badge'

const MONO = { fontFamily: 'var(--mono)' }

function fmtDuration(openTime, closeTime) {
  if (!openTime || !closeTime) return '—'
  const s = Math.round((new Date(closeTime) - new Date(openTime)) / 1000)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return [h && `${h}h`, m && `${m}m`, `${sec}s`].filter(Boolean).join(' ')
}

function TradePreviewCard({ trade, onViewFull }) {
  const net = ((trade.profit || 0) + (trade.commission || 0) + (trade.swap || 0))
  return (
    <div className="px-4 py-3 bg-[var(--color-surface-2)] flex flex-col gap-2">
      <div className="flex flex-wrap gap-4 text-xs">
        <span className="text-[var(--color-text-muted)]">Duration <span style={MONO} className="text-[var(--color-text-sec)]">{fmtDuration(trade.open_time, trade.close_time)}</span></span>
        <span className="text-[var(--color-text-muted)]">Commission <span style={MONO} className="text-[var(--color-text-sec)]">{trade.commission?.toFixed(2) ?? '—'}</span></span>
        <span className="text-[var(--color-text-muted)]">Swap <span style={MONO} className="text-[var(--color-text-sec)]">{trade.swap?.toFixed(2) ?? '—'}</span></span>
        <span className="text-[var(--color-text-muted)]">Net <span style={{ ...MONO, color: net >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' }}>{net >= 0 ? '+' : ''}{net.toFixed(2)}</span></span>
      </div>
      {trade.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {trade.tags.map((t) => <Badge key={t} variant="neutral">{t}</Badge>)}
        </div>
      )}
      {trade.notes && (
        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">{trade.notes}</p>
      )}
      <button
        onClick={onViewFull}
        className="self-start text-xs font-medium text-[var(--color-accent)] hover:underline flex items-center gap-0.5"
      >
        View Full Detail <ChevronRight size={12} />
      </button>
    </div>
  )
}

export default function History() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const account = useAccountStore((s) => s.activeAccount)
  const [expandedId, setExpandedId] = useState(null)

  const filters = {
    date_from: searchParams.get('date_from') || '',
    date_to: searchParams.get('date_to') || '',
    symbol: searchParams.get('symbol') || '',
    trade_type: searchParams.get('trade_type') || '',
    result: searchParams.get('result') || '',
  }

  const setFilter = (key, val) => {
    const next = new URLSearchParams(searchParams)
    if (val) next.set(key, val)
    else next.delete(key)
    setSearchParams(next)
  }

  const queryParams = { account_id: account?.id, limit: 100 }
  if (filters.date_from) queryParams.date_from = filters.date_from
  if (filters.date_to) queryParams.date_to = filters.date_to
  if (filters.symbol) queryParams.symbol = filters.symbol
  if (filters.trade_type) queryParams.trade_type = filters.trade_type

  const { data, isLoading } = useQuery({
    queryKey: ['trades', account?.id, filters],
    queryFn: () => getTrades(queryParams),
    enabled: !!account?.id,
  })

  let trades = data?.trades || []
  if (filters.result === 'win') trades = trades.filter((t) => (t.profit || 0) > 0)
  if (filters.result === 'loss') trades = trades.filter((t) => (t.profit || 0) < 0)
  if (filters.result === 'be') trades = trades.filter((t) => (t.profit || 0) === 0)

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Filter bar */}
      <div className="shrink-0 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-1)] flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase">From</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilter('date_from', e.target.value)}
            className="px-2 py-1.5 text-xs bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-pri)] outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase">To</label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilter('date_to', e.target.value)}
            className="px-2 py-1.5 text-xs bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-pri)] outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase">Symbol</label>
          <input
            type="text"
            placeholder="e.g. EURUSDm"
            value={filters.symbol}
            onChange={(e) => setFilter('symbol', e.target.value)}
            className="px-2 py-1.5 text-xs bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-pri)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)] w-28"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase">Type</label>
          <select
            value={filters.trade_type}
            onChange={(e) => setFilter('trade_type', e.target.value)}
            className="px-2 py-1.5 text-xs bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-pri)] outline-none focus:border-[var(--color-accent)] appearance-none cursor-pointer"
          >
            <option value="">All</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase">Result</label>
          <select
            value={filters.result}
            onChange={(e) => setFilter('result', e.target.value)}
            className="px-2 py-1.5 text-xs bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-pri)] outline-none focus:border-[var(--color-accent)] appearance-none cursor-pointer"
          >
            <option value="">All</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="be">Break Even</option>
          </select>
        </div>
        <span className="ml-auto text-xs text-[var(--color-text-muted)] self-center">
          {trades.length} trade{trades.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">Loading…</div>
        ) : trades.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">No trades found.</div>
        ) : (
          <div className="w-full">
            {/* Header row */}
            <div className="sticky top-0 z-10 bg-[var(--color-surface-1)] border-b border-[var(--color-border)] grid text-[10px] font-medium text-[var(--color-text-muted)] uppercase"
              style={{ gridTemplateColumns: '90px 90px 60px 60px 90px 90px 1fr 1fr 80px' }}>
              {['Ticket','Symbol','Type','Vol','Open','Close','Open Time','Close Time','Profit'].map((h) => (
                <div key={h} className="px-3 py-2.5 whitespace-nowrap">{h}</div>
              ))}
            </div>

            {trades.map((t) => {
              const isExpanded = expandedId === t.id
              const profit = t.profit || 0
              return (
                <div key={t.id} className="border-b border-[var(--color-border)]">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : t.id)}
                    className="grid hover:bg-[var(--color-surface-2)] cursor-pointer transition-colors"
                    style={{ gridTemplateColumns: '90px 90px 60px 60px 90px 90px 1fr 1fr 80px' }}
                  >
                    <div className="px-3 py-2.5 text-xs" style={MONO}>{t.ticket}</div>
                    <div className="px-3 py-2.5 text-xs font-medium text-[var(--color-text-pri)]">{t.symbol}</div>
                    <div className="px-3 py-2.5">
                      <Badge variant={t.trade_type === 'buy' ? 'profit' : 'loss'}>{t.trade_type?.toUpperCase()}</Badge>
                    </div>
                    <div className="px-3 py-2.5 text-xs" style={MONO}>{t.volume}</div>
                    <div className="px-3 py-2.5 text-xs" style={MONO}>{t.open_price?.toFixed(5)}</div>
                    <div className="px-3 py-2.5 text-xs" style={MONO}>{t.close_price?.toFixed(5)}</div>
                    <div className="px-3 py-2.5 text-xs text-[var(--color-text-muted)]" style={MONO}>
                      {t.open_time ? new Date(t.open_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </div>
                    <div className="px-3 py-2.5 text-xs text-[var(--color-text-muted)]" style={MONO}>
                      {t.close_time ? new Date(t.close_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </div>
                    <div
                      className="px-3 py-2.5 text-xs font-semibold"
                      style={{ ...MONO, color: profit >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' }}
                    >
                      {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <TradePreviewCard trade={t} onViewFull={() => navigate(`/history/${t.id}`)} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
