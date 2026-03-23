import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, format, isToday,
} from 'date-fns'
import html2canvas from 'html2canvas'
import { ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react'
import { useAccountStore } from '../../store/accountStore'
import { getCalendar, getTrades } from '../../api/trades'
import Badge from '../../components/ui/Badge'

const MONO = { fontFamily: 'var(--mono)' }
const DAYS_FULL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// Mon-based offset: getDay returns 0=Sun, convert to 0=Mon
function monOffset(date) {
  return (getDay(date) + 6) % 7
}

function fmt(n, dp = 2) {
  if (n == null) return '—'
  return (n >= 0 ? '+' : '') + n.toFixed(dp)
}

function DayCell({ day, data, isCurrentMonth, onClick, selected }) {
  const pnl = data?.total_pnl ?? null
  const hasTrades = data?.trades_count > 0

  let bg = 'transparent'
  if (hasTrades) {
    bg = pnl >= 0 ? 'rgba(52,211,153,0.07)' : 'rgba(248,113,113,0.07)'
  }

  const isSelected = selected && format(day, 'yyyy-MM-dd') === format(selected, 'yyyy-MM-dd')
  const todayRing = isToday(day)

  // Shorten P&L for narrow cells: drop decimals if >= 100
  const pnlLabel = pnl == null ? null
    : Math.abs(pnl) >= 1000 ? `${pnl >= 0 ? '+' : ''}${(pnl / 1000).toFixed(1)}k`
    : Math.abs(pnl) >= 100 ? `${pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}`
    : fmt(pnl)

  return (
    <div
      onClick={() => isCurrentMonth && onClick(day)}
      style={{
        minHeight: 'clamp(48px, 10vw, 80px)',
        background: isSelected ? 'var(--color-surface-2)' : bg,
        cursor: isCurrentMonth ? 'pointer' : 'default',
        opacity: isCurrentMonth ? 1 : 0.25,
        outline: todayRing ? '1px solid var(--color-accent)' : isSelected ? '1px solid var(--color-border)' : 'none',
        outlineOffset: '-1px',
        borderRadius: 6,
        padding: '4px 4px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        transition: 'background 0.15s',
      }}
    >
      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', lineHeight: 1 }}>
        {format(day, 'd')}
      </span>
      {hasTrades && (
        <span
          style={{
            ...MONO,
            fontSize: 'clamp(9px, 1.8vw, 12px)',
            fontWeight: 700,
            color: pnl >= 0 ? 'var(--color-profit)' : 'var(--color-loss)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
            textAlign: 'right',
            lineHeight: 1.2,
          }}
        >
          {pnlLabel}
        </span>
      )}
    </div>
  )
}

export default function Calendar() {
  const account = useAccountStore((s) => s.activeAccount)
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedDay, setSelectedDay] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const gridRef = useRef(null)
  const exportRef = useRef(null)

  const { data: calData = {} } = useQuery({
    queryKey: ['calendar', account?.id, year, month],
    queryFn: () => getCalendar(account.id, year, month),
    enabled: !!account?.id,
  })

  // Trades for selected day panel
  const selectedDateStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null
  const { data: dayTradesData } = useQuery({
    queryKey: ['trades-day', account?.id, selectedDateStr],
    queryFn: () => getTrades({ account_id: account.id, date_from: selectedDateStr, date_to: selectedDateStr, limit: 100 }),
    enabled: !!account?.id && !!selectedDateStr,
  })
  const dayTrades = dayTradesData?.trades || []

  // Close export dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return
    const handler = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [exportOpen])

  // Build calendar grid
  const monthStart = startOfMonth(new Date(year, month - 1))
  const monthEnd = endOfMonth(monthStart)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const leadingBlanks = monOffset(monthStart)
  const trailingBlanks = (7 - ((leadingBlanks + days.length) % 7)) % 7

  // Summary stats from calData
  const entries = Object.values(calData)
  const totalTrades = entries.reduce((s, d) => s + (d.trades_count || 0), 0)
  const wins = entries.filter((d) => d.total_pnl > 0).length
  const winRate = entries.length ? ((wins / entries.filter(d => d.trades_count > 0).length) * 100) : 0
  const netPnl = entries.reduce((s, d) => s + (d.total_pnl || 0), 0)
  const bestDay = entries.length ? Math.max(...entries.map((d) => d.total_pnl)) : null
  const worstDay = entries.length ? Math.min(...entries.map((d) => d.total_pnl)) : null

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    const n = new Date()
    if (year > n.getFullYear() || (year === n.getFullYear() && month >= n.getMonth() + 1)) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  const handleShareImage = async () => {
    if (!gridRef.current) return
    setExporting(true)
    setExportOpen(false)
    try {
      const canvas = await html2canvas(gridRef.current, { backgroundColor: '#080810', scale: 2 })
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `ribon7-calendar-${month}-${year}.png`
      a.click()
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadPdf = () => {
    setExportOpen(false)
    const { accessToken } = JSON.parse(localStorage.getItem('ribon7-auth') || '{}')?.state || {}
    const url = `${import.meta.env.VITE_API_BASE_URL}/export/trades/pdf?account_id=${account.id}`
    // Fetch with auth then trigger download
    fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `ribon7-trades-${month}-${year}.pdf`
        a.click()
        URL.revokeObjectURL(a.href)
      })
  }

  const isAtMax = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="h-full flex overflow-hidden">
      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="shrink-0 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-1)] flex flex-wrap items-center gap-2">
          {/* Nav + month */}
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
              <ChevronLeft size={15} className="text-[var(--color-text-sec)]" />
            </button>
            <span className="text-sm font-semibold text-[var(--color-text-pri)] w-28 text-center">
              {format(new Date(year, month - 1), 'MMM yyyy')}
            </span>
            <button onClick={nextMonth} disabled={isAtMax}
              className="p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors disabled:opacity-30">
              <ChevronRight size={15} className="text-[var(--color-text-sec)]" />
            </button>
          </div>

          {/* Summary badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="neutral">{totalTrades}t</Badge>
            <Badge variant={winRate >= 50 ? 'profit' : 'loss'}>
              {totalTrades ? winRate.toFixed(0) : '—'}% WR
            </Badge>
            <span className="text-xs font-semibold" style={{ ...MONO, color: netPnl >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' }}>
              {fmt(netPnl)}
            </span>
            {bestDay != null && bestDay !== -Infinity && (
              <span className="text-xs hidden sm:inline" style={{ ...MONO, color: 'var(--color-profit)' }}>↑{fmt(bestDay)}</span>
            )}
            {worstDay != null && worstDay !== Infinity && (
              <span className="text-xs hidden sm:inline" style={{ ...MONO, color: 'var(--color-loss)' }}>↓{fmt(worstDay)}</span>
            )}
          </div>

          {/* Export */}
          <div className="ml-auto relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen(o => !o)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-colors text-[var(--color-text-sec)]"
            >
              {exporting ? '…' : 'Export'} <ChevronDown size={11} />
            </button>
            {exportOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded-xl border border-[var(--color-border)] overflow-hidden shadow-lg"
                style={{ background: 'var(--color-surface-2)', minWidth: 160 }}
              >
                <button onClick={handleShareImage}
                  className="w-full text-left px-4 py-2.5 text-xs text-[var(--color-text-sec)] hover:bg-[var(--color-surface-1)] transition-colors">
                  Share as Image
                </button>
                <button onClick={handleDownloadPdf}
                  className="w-full text-left px-4 py-2.5 text-xs text-[var(--color-text-sec)] hover:bg-[var(--color-surface-1)] transition-colors border-t border-[var(--color-border)]">
                  Download PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div ref={gridRef} style={{ background: 'var(--color-bg)' }}>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-0.5">
              {DAYS_FULL.map((d, i) => (
                <div key={d} className="text-center py-1">
                  <span className="hidden sm:inline text-[10px] font-medium text-[var(--color-text-muted)]">{d}</span>
                  <span className="sm:hidden text-[10px] font-medium text-[var(--color-text-muted)]">{DAYS_SHORT[i]}</span>
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-0.5">
              {/* Leading blanks */}
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div key={`lead-${i}`} style={{ minHeight: 80 }} />
              ))}

              {/* Month days */}
              {days.map((day) => {
                const d = day.getDate()
                return (
                  <DayCell
                    key={d}
                    day={day}
                    data={calData[d]}
                    isCurrentMonth
                    onClick={setSelectedDay}
                    selected={selectedDay}
                  />
                )
              })}

              {/* Trailing blanks */}
              {Array.from({ length: trailingBlanks }).map((_, i) => (
                <div key={`trail-${i}`} style={{ minHeight: 80 }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Day detail panel */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed sm:relative inset-y-0 right-0 sm:inset-auto z-40"
            style={{
              width: 'min(320px, 100vw)',
              borderLeft: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-pri)]">
                  {format(selectedDay, 'EEEE, MMM d')}
                </p>
                {calData[selectedDay.getDate()] && (
                  <p
                    className="text-xs font-bold mt-0.5"
                    style={{
                      ...MONO,
                      color: calData[selectedDay.getDate()].total_pnl >= 0
                        ? 'var(--color-profit)'
                        : 'var(--color-loss)',
                    }}
                  >
                    {fmt(calData[selectedDay.getDate()].total_pnl)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-surface-1)] transition-colors"
              >
                <X size={15} className="text-[var(--color-text-muted)]" />
              </button>
            </div>

            {/* Trade list */}
            <div className="flex-1 overflow-y-auto">
              {dayTrades.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] p-4">No trades on this day.</p>
              ) : (
                dayTrades.map((t) => {
                  const profit = t.profit || 0
                  return (
                    <div
                      key={t.id}
                      className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[var(--color-text-pri)]">{t.symbol}</span>
                          <Badge variant={t.trade_type === 'buy' ? 'profit' : 'loss'}>
                            {t.trade_type?.toUpperCase()}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-[var(--color-text-muted)]" style={MONO}>
                          {t.open_price?.toFixed(5)} → {t.close_price?.toFixed(5)}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          {t.close_time ? format(new Date(t.close_time), 'HH:mm') : '—'} · {t.volume} lot
                        </span>
                      </div>
                      <span
                        className="text-xs font-bold shrink-0"
                        style={{ ...MONO, color: profit >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' }}
                      >
                        {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
