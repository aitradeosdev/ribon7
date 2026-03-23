import { useQuery } from '@tanstack/react-query'
import { getSummary } from '../../api/analytics'
import { useAccountStore } from '../../store/accountStore'
import { formatPL } from '../../utils/format'

export default function FloatingPLTicker() {
  const account = useAccountStore((s) => s.activeAccount)
  const today = new Date().toISOString().slice(0, 10)

  const { data } = useQuery({
    queryKey: ['pl-today', account?.id],
    queryFn: () => getSummary(account.id, { date_from: today, date_to: today }),
    enabled: !!account?.id,
    refetchInterval: 60000,
  })

  if (!account || !data) return null
  const pl = data.total_profit ?? 0
  const positive = pl >= 0

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'var(--floating-bottom, 16px)',
        right: 16,
        zIndex: 40,
      }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-sm shadow-lg ${
        positive
          ? 'bg-[var(--color-profit)]/10 border-[var(--color-profit)]/20 text-[var(--color-profit)] shadow-[0_0_12px_var(--color-profit)]/20'
          : 'bg-[var(--color-loss)]/10 border-[var(--color-loss)]/20 text-[var(--color-loss)] shadow-[0_0_12px_var(--color-loss)]/20'
      }`}
    >
      <span className="text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--sans)' }}>Today</span>
      <span style={{ fontFamily: 'var(--mono)' }}>{formatPL(pl)}</span>
    </div>
  )
}
