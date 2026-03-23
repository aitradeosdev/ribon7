import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BarChart2 } from 'lucide-react'
import { useAccountStore } from '../../store/accountStore'
import { getSymbolInfo } from '../../api/symbols'
import { getBySymbol } from '../../api/analytics'

const MONO = { fontFamily: 'var(--mono)' }

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

const SESSIONS = [
  { name: 'Sydney',    open: '22:00', close: '07:00' },
  { name: 'Tokyo',     open: '00:00', close: '09:00' },
  { name: 'London',    open: '08:00', close: '17:00' },
  { name: 'New York',  open: '13:00', close: '22:00' },
]

export default function SymbolInfo() {
  const { symbol } = useParams()
  const account = useAccountStore((s) => s.activeAccount)

  const { data: info, isLoading: infoLoading } = useQuery({
    queryKey: ['symbol-info', symbol, account?.id],
    queryFn: () => getSymbolInfo(symbol, account.id),
    enabled: !!account?.id && !!symbol,
  })

  const { data: bySymbol } = useQuery({
    queryKey: ['analytics-by-symbol', account?.id],
    queryFn: () => getBySymbol(account.id),
    enabled: !!account?.id,
  })

  const perf = bySymbol?.find?.((s) => s.symbol === symbol)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/home" className="p-1.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
            <ArrowLeft size={16} className="text-[var(--color-text-sec)]" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-[var(--color-text-pri)]" style={MONO}>{symbol}</h1>
            {info?.description && (
              <p className="text-xs text-[var(--color-text-muted)]">{info.description}</p>
            )}
          </div>
          <Link
            to={`/chart/${symbol}`}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            <BarChart2 size={13} /> Chart
          </Link>
        </div>

        {infoLoading ? (
          <div className="text-xs text-[var(--color-text-muted)] py-8 text-center">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Left column */}
            <div className="flex flex-col gap-4">
              <Card title="Contract Specs">
                <Row label="Symbol" value={info?.symbol} />
                <Row label="Description" value={info?.description} />
                <Row label="Digits" value={info?.digits} />
                <Row label="Contract Size" value={info?.contract_size?.toLocaleString()} />
                <Row label="Tick Value" value={info?.tick_value?.toFixed(5)} />
                <Row label="Spread" value={info?.spread} />
                <Row label="Swap Long" value={info?.swap_long?.toFixed(4)} colored={info?.swap_long} />
                <Row label="Swap Short" value={info?.swap_short?.toFixed(4)} colored={info?.swap_short} />
                <Row
                  label="Daily Change"
                  value={info?.daily_change_pct != null ? `${info.daily_change_pct >= 0 ? '+' : ''}${info.daily_change_pct.toFixed(2)}%` : '—'}
                  colored={info?.daily_change_pct}
                />
              </Card>

              <Card title="Trading Sessions (UTC)">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[var(--color-text-muted)]">
                      <th className="text-left pb-2 font-medium">Session</th>
                      <th className="text-right pb-2 font-medium">Open</th>
                      <th className="text-right pb-2 font-medium">Close</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SESSIONS.map((s) => (
                      <tr key={s.name} className="border-t border-[var(--color-border)]">
                        <td className="py-2 text-[var(--color-text-sec)]">{s.name}</td>
                        <td className="py-2 text-right text-[var(--color-text-pri)]" style={MONO}>{s.open}</td>
                        <td className="py-2 text-right text-[var(--color-text-pri)]" style={MONO}>{s.close}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">
              <Card title="My Performance">
                {!perf ? (
                  <p className="text-xs text-[var(--color-text-muted)]">No trades for {symbol} yet.</p>
                ) : (
                  <>
                    <Row label="Total Trades" value={perf.total_trades} />
                    <Row label="Win Rate" value={`${perf.win_rate?.toFixed(1)}%`} />
                    <Row label="Total Profit" value={perf.total_profit?.toFixed(2)} colored={perf.total_profit} />
                    <Row label="Avg Profit" value={perf.avg_profit?.toFixed(2)} colored={perf.avg_profit} />
                    <Row label="Best Trade" value={perf.best_trade?.toFixed(2)} colored={perf.best_trade} />
                    <Row label="Worst Trade" value={perf.worst_trade?.toFixed(2)} colored={perf.worst_trade} />
                  </>
                )}
              </Card>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
