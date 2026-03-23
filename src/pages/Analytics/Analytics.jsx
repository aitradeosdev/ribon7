import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth } from 'date-fns'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { useAccountStore } from '../../store/accountStore'
import {
  getSummary, getEquityCurve, getDrawdown,
  getBySymbol, getByWeekday, getBySession,
} from '../../api/analytics'

// ── Resolve all chart colors once from CSS variables ─────────────────────────
function useChartColors() {
  return useMemo(() => {
    const s = getComputedStyle(document.documentElement)
    const v = (k) => s.getPropertyValue(k).trim()
    return {
      accent:   v('--color-accent'),
      profit:   v('--color-profit'),
      loss:     v('--color-loss'),
      warn:     v('--color-warn'),
      live:     v('--color-live'),
      border:   v('--color-border'),
      surface2: v('--color-surface-2'),
      surface3: v('--color-surface-3'),
      textMuted: v('--color-text-muted'),
      textSec:  v('--color-text-sec'),
      mono:     v('--mono'),
    }
  }, [])
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 ${className}`}>
      {children}
    </div>
  )
}

function StatCard({ label, value, mono = false, color, glow = false, sub }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{label}</span>
      <span
        className="text-2xl font-bold leading-tight"
        style={{
          fontFamily: mono ? 'var(--mono)' : undefined,
          color: color || 'var(--color-text-pri)',
          textShadow: glow && color ? `0 0 16px ${color}55` : undefined,
        }}
      >
        {value ?? '—'}
      </span>
      {sub && <span className="text-xs text-[var(--color-text-muted)]">{sub}</span>}
    </Card>
  )
}

function SectionTitle({ children }) {
  return <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">{children}</h2>
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, c, valueFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: c.surface3, border: `1px solid ${c.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 11, fontFamily: c.mono }}>
      <p style={{ color: c.textMuted, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || c.accent }}>
          {p.name}: {valueFormatter ? valueFormatter(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Analytics() {
  const account = useAccountStore((s) => s.activeAccount)
  const c = useChartColors()

  const today = format(new Date(), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const [dateFrom, setDateFrom] = useState(monthStart)
  const [dateTo, setDateTo] = useState(today)

  const params = { date_from: dateFrom, date_to: dateTo }
  const enabled = !!account?.id

  const { data: summary } = useQuery({ queryKey: ['analytics-summary', account?.id, dateFrom, dateTo], queryFn: () => getSummary(account.id, params), enabled })
  const { data: equityCurve = [] } = useQuery({ queryKey: ['analytics-equity', account?.id, dateFrom, dateTo], queryFn: () => getEquityCurve(account.id, params), enabled })
  const { data: drawdown } = useQuery({ queryKey: ['analytics-drawdown', account?.id, dateFrom, dateTo], queryFn: () => getDrawdown(account.id, params), enabled })
  const { data: bySymbol = [] } = useQuery({ queryKey: ['analytics-symbol', account?.id, dateFrom, dateTo], queryFn: () => getBySymbol(account.id, params), enabled })
  const { data: byWeekday = [] } = useQuery({ queryKey: ['analytics-weekday', account?.id, dateFrom, dateTo], queryFn: () => getByWeekday(account.id, params), enabled })
  const { data: bySession = [] } = useQuery({ queryKey: ['analytics-session', account?.id, dateFrom, dateTo], queryFn: () => getBySession(account.id, params), enabled })

  // Equity curve: format date labels
  const equityData = useMemo(() =>
    equityCurve.map((d) => ({ ...d, time: d.time?.slice(0, 10) })),
    [equityCurve]
  )

  // Drawdown: build series from max_drawdown scalar — show as single bar for now,
  // or if backend returns a series use it directly
  const drawdownData = useMemo(() => {
    if (Array.isArray(drawdown)) return drawdown.map((d) => ({ ...d, time: d.time?.slice(0, 10) }))
    // scalar response: build a simple display
    return equityData.map((d, i) => {
      // recompute running drawdown from equity curve
      const slice = equityData.slice(0, i + 1)
      const peak = Math.max(...slice.map((x) => x.equity))
      return { time: d.time, drawdown: +(d.equity - peak).toFixed(2) }
    })
  }, [drawdown, equityData])

  // Session pie colors
  const SESSION_COLORS = { Asian: c.live, London: c.accent, NewYork: c.profit }

  const fmtMoney = (v) => (v >= 0 ? '+' : '') + Number(v).toFixed(2)
  const fmtPct = (v) => Number(v).toFixed(1) + '%'

  const totalProfit = summary?.total_profit ?? null
  const profitColor = totalProfit == null ? undefined : totalProfit >= 0 ? c.profit : c.loss

  const axisProps = { tick: { fill: c.textMuted, fontSize: 10, fontFamily: c.mono }, tickLine: false, axisLine: false }
  const gridProps = { stroke: c.border, strokeDasharray: '4 4', vertical: false }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 flex flex-col gap-5">

        {/* Date range */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-[var(--color-text-pri)]">Analytics</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[var(--color-text-muted)] uppercase">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="px-2 py-1.5 text-xs bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-pri)] outline-none focus:border-[var(--color-accent)]" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[var(--color-text-muted)] uppercase">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="px-2 py-1.5 text-xs bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-pri)] outline-none focus:border-[var(--color-accent)]" />
            </div>
          </div>
        </div>

        {/* Row 1 — 4 stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Trades" value={summary?.total_trades ?? '—'} />
          <StatCard label="Win Rate" value={summary ? `${summary.win_rate}%` : '—'} color={summary?.win_rate >= 50 ? c.profit : c.loss} />
          <StatCard label="Profit Factor" value={summary?.profit_factor != null ? summary.profit_factor.toFixed(2) : '—'} color={summary?.profit_factor >= 1 ? c.profit : c.loss} />
          <StatCard label="Avg Duration" value={summary?.avg_duration_sec != null ? fmtDuration(summary.avg_duration_sec) : '—'} />
        </div>

        {/* Row 2 — 3 P&L cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Net Profit"
            value={totalProfit != null ? fmtMoney(totalProfit) : '—'}
            mono color={profitColor} glow
          />
          <StatCard
            label="Avg Win"
            value={summary?.avg_profit != null && summary.avg_profit > 0 ? `+${summary.avg_profit.toFixed(2)}` : '—'}
            mono color={c.profit}
          />
          <StatCard
            label="Avg Loss"
            value={summary?.worst_trade != null ? fmtMoney(summary.worst_trade) : '—'}
            mono color={c.loss}
          />
        </div>

        {/* Equity Curve */}
        <div>
          <SectionTitle>Equity Curve</SectionTitle>
          <Card>
            {equityData.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-8 text-center">No data for selected range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={equityData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c.accent} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={c.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="time" {...axisProps} interval="preserveStartEnd" />
                  <YAxis {...axisProps} width={55} tickFormatter={(v) => v.toFixed(0)} />
                  <Tooltip content={<ChartTooltip c={c} valueFormatter={fmtMoney} />} />
                  <Area type="monotone" dataKey="equity" stroke={c.accent} strokeWidth={1.5} fill="url(#eqGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Drawdown */}
        <div>
          <SectionTitle>Drawdown</SectionTitle>
          <Card>
            {drawdownData.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-8 text-center">No data for selected range.</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={drawdownData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c.loss} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={c.loss} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="time" {...axisProps} interval="preserveStartEnd" />
                  <YAxis {...axisProps} width={55} tickFormatter={(v) => v.toFixed(0)} reversed />
                  <Tooltip content={<ChartTooltip c={c} valueFormatter={fmtMoney} />} />
                  <Area type="monotone" dataKey="drawdown" stroke={c.loss} strokeWidth={1.5} fill="url(#ddGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Bottom row — 3 breakdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* By Symbol */}
          <div>
            <SectionTitle>By Symbol</SectionTitle>
            <Card>
              {bySymbol.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">No data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={bySymbol} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid {...gridProps} horizontal={false} vertical />
                    <XAxis type="number" {...axisProps} tickFormatter={(v) => v.toFixed(0)} />
                    <YAxis type="category" dataKey="symbol" {...axisProps} width={64} tick={{ fill: c.textMuted, fontSize: 9, fontFamily: c.mono }} />
                    <Tooltip content={<ChartTooltip c={c} valueFormatter={fmtMoney} />} />
                    <Bar dataKey="total_profit" radius={[0, 3, 3, 0]}>
                      {bySymbol.map((entry, i) => (
                        <Cell key={i} fill={entry.total_profit >= 0 ? c.profit : c.loss} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* By Weekday */}
          <div>
            <SectionTitle>By Weekday</SectionTitle>
            <Card>
              {byWeekday.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">No data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byWeekday} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="weekday" {...axisProps} tickFormatter={(v) => v.slice(0, 3)} />
                    <YAxis {...axisProps} width={45} tickFormatter={(v) => v.toFixed(0)} />
                    <Tooltip content={<ChartTooltip c={c} valueFormatter={fmtMoney} />} />
                    <Bar dataKey="total_profit" radius={[3, 3, 0, 0]}>
                      {byWeekday.map((entry, i) => (
                        <Cell key={i} fill={entry.total_profit >= 0 ? c.profit : c.loss} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* By Session */}
          <div>
            <SectionTitle>By Session</SectionTitle>
            <Card>
              {bySession.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">No data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={bySession}
                      dataKey="total_trades"
                      nameKey="session"
                      cx="50%" cy="45%"
                      outerRadius={70}
                      strokeWidth={0}
                    >
                      {bySession.map((entry, i) => (
                        <Cell key={i} fill={SESSION_COLORS[entry.session] || c.accent} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip c={c} />} />
                    <Legend
                      iconType="circle" iconSize={8}
                      formatter={(v) => <span style={{ color: c.textSec, fontSize: 10, fontFamily: c.mono }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDuration(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ') || '<1m'
}
