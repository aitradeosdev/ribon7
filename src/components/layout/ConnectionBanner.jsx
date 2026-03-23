import { WifiOff, Loader2 } from 'lucide-react'
import { useWsConnectionStore } from '../../store/wsConnectionStore'

export default function ConnectionBanner() {
  const status = useWsConnectionStore((s) => s.connectionStatus)
  if (status === 'connected') return null

  return (
    <div className="w-full px-4 py-2 flex items-center gap-2 text-xs text-[var(--color-warn)] border-b border-[var(--color-warn)]/20 bg-[var(--color-warn)]/10 shrink-0">
      {status === 'reconnecting'
        ? <Loader2 size={13} className="animate-spin" />
        : <WifiOff size={13} />
      }
      <span>{status === 'reconnecting' ? 'MT5 connection lost — reconnecting…' : 'MT5 disconnected'}</span>
    </div>
  )
}
