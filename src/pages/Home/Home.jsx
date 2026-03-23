import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Plus, LineChart, Info, X, Bookmark } from 'lucide-react'
import { getWatchlist, searchSymbols, addToWatchlist, removeFromWatchlist } from '../../api/symbols'
import { useAccountStore } from '../../store/accountStore'
import { useTickSocket } from '../../hooks/useTickSocket'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import EmptyState from '../../components/ui/EmptyState'

// ── Per-symbol card with live tick ────────────────────────────────────────────
function WatchlistCard({ item, expanded, onToggle, onRemove }) {
  const navigate = useNavigate()
  const { bid, ask, spread, dailyChangePct } = useTickSocket(item.symbol)
  const prevBidRef = useRef(null)
  const [flash, setFlash] = useState(null) // 'up' | 'down' | null

  useEffect(() => {
    if (bid === null) return
    if (prevBidRef.current !== null) {
      setFlash(bid > prevBidRef.current ? 'up' : bid < prevBidRef.current ? 'down' : null)
      const t = setTimeout(() => setFlash(null), 400)
      return () => clearTimeout(t)
    }
    prevBidRef.current = bid
  }, [bid])

  useEffect(() => { prevBidRef.current = bid }, [bid])

  const changeVariant = dailyChangePct == null ? 'neutral' : dailyChangePct >= 0 ? 'profit' : 'loss'
  const flashColor = flash === 'up' ? 'var(--color-profit)' : flash === 'down' ? 'var(--color-loss)' : 'transparent'

  return (
    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface-1)] transition-colors hover:border-[var(--color-border-hi)]">
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full h-16 flex items-center justify-between px-4 text-left"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-[var(--color-text-pri)]">{item.symbol}</span>
          <span className="text-xs text-[var(--color-text-muted)] truncate max-w-[160px]">{item.description || ''}</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-medium transition-colors duration-300"
            style={{
              fontFamily: 'var(--mono)',
              color: flash ? flashColor : 'var(--color-text-pri)',
            }}
          >
            {bid != null ? bid.toFixed(5) : '—'}
          </span>
          <Badge variant={changeVariant}>
            {dailyChangePct != null ? `${dailyChangePct >= 0 ? '+' : ''}${dailyChangePct.toFixed(2)}%` : '—'}
          </Badge>
        </div>
      </button>

      {/* Expanded action row */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 pb-3 pt-1 border-t border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-text-muted)] mr-1">
                Ask: <span style={{ fontFamily: 'var(--mono)' }}>{ask != null ? ask.toFixed(5) : '—'}</span>
                {spread != null && <span className="ml-2">Spread: <span style={{ fontFamily: 'var(--mono)' }}>{spread.toFixed(5)}</span></span>}
              </span>
              <div className="flex-1" />
              <Button size="sm" variant="secondary" onClick={() => navigate(`/chart/${item.symbol}`)}>
                <LineChart size={13} /> Open Chart
              </Button>
              <Button size="sm" variant="ghost" onClick={() => navigate(`/symbol/${item.symbol}`)}>
                <Info size={13} /> Symbol Info
              </Button>
              <button onClick={() => onRemove(item.id)} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-loss)] transition-colors">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Search overlay ────────────────────────────────────────────────────────────
function SearchOverlay({ open, onClose, accountId, watchlist }) {
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [adding, setAdding] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['symbol-search', debouncedQ, accountId],
    queryFn: () => searchSymbols(debouncedQ, accountId),
    enabled: !!debouncedQ && debouncedQ.length >= 1 && !!accountId,
  })

  const watchlistSymbols = new Set((watchlist || []).map((w) => w.symbol))

  const handleAdd = async (symbol, description) => {
    setAdding(symbol)
    try {
      await addToWatchlist(accountId, symbol)
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    } catch {}
    setAdding(null)
  }

  if (!open) return null

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-auto mt-16 bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          <Search size={16} className="text-[var(--color-text-muted)] shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search symbols… e.g. EUR, BTC, XAU"
            className="flex-1 bg-transparent text-sm text-[var(--color-text-pri)] placeholder:text-[var(--color-text-muted)] outline-none"
          />
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-pri)]">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {!debouncedQ && (
            <p className="text-xs text-[var(--color-text-muted)] text-center py-8">Type to search symbols</p>
          )}
          {isFetching && (
            <p className="text-xs text-[var(--color-text-muted)] text-center py-8">Searching…</p>
          )}
          {!isFetching && debouncedQ && results.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)] text-center py-8">No symbols found</p>
          )}
          {results.map((r) => {
            const added = watchlistSymbols.has(r.symbol)
            return (
              <div key={r.symbol} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface-2)] transition-colors">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-pri)]">{r.symbol}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{r.description}</p>
                </div>
                {added
                  ? <Badge variant="neutral">Added</Badge>
                  : (
                    <Button size="sm" variant="secondary" disabled={adding === r.symbol} onClick={() => handleAdd(r.symbol)}>
                      <Plus size={12} /> Add
                    </Button>
                  )
                }
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

// ── Home page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const account = useAccountStore((s) => s.activeAccount)
  const queryClient = useQueryClient()
  const [expandedSymbol, setExpandedSymbol] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)

  const { data: watchlist = [], isLoading } = useQuery({
    queryKey: ['watchlist', account?.id],
    queryFn: () => getWatchlist(account.id),
    enabled: !!account?.id,
  })

  const handleRemove = async (id) => {
    await removeFromWatchlist(id).catch(() => {})
    queryClient.invalidateQueries({ queryKey: ['watchlist'] })
  }

  // Expose search open to TopBar via custom event
  useEffect(() => {
    const handler = () => setSearchOpen(true)
    window.addEventListener('open-symbol-search', handler)
    return () => window.removeEventListener('open-symbol-search', handler)
  }, [])

  return (
    <>
      <div className="p-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-widest text-[var(--color-text-muted)]">Watchlist</h2>
          <Button size="sm" variant="secondary" onClick={() => setSearchOpen(true)}>
            <Plus size={13} /> Add Symbol
          </Button>
        </div>

        {/* List */}
        {isLoading && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-[var(--color-surface-2)] animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && watchlist.length === 0 && (
          <EmptyState
            icon={Bookmark}
            title="No symbols in watchlist"
            description="Search and add symbols to track live prices."
            action={<Button size="sm" onClick={() => setSearchOpen(true)}><Plus size={13} /> Add Symbol</Button>}
          />
        )}

        {!isLoading && watchlist.length > 0 && (
          <div className="flex flex-col gap-2">
            {watchlist.map((item) => (
              <WatchlistCard
                key={item.id}
                item={item}
                expanded={expandedSymbol === item.symbol}
                onToggle={() => setExpandedSymbol((s) => s === item.symbol ? null : item.symbol)}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <SearchOverlay
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            accountId={account?.id}
            watchlist={watchlist}
          />
        )}
      </AnimatePresence>
    </>
  )
}
