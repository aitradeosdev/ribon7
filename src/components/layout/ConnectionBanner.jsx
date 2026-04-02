import { WifiOff, Loader2, AlertTriangle } from 'lucide-react'
import { useWsConnectionStore } from '../../store/wsConnectionStore'
import { useServerStore } from '../../store/serverStore'

export default function ConnectionBanner() {
  const wsStatus = useWsConnectionStore((s) => s.connectionStatus)
  const serverDown = useServerStore((s) => s.serverDown)
  
  // Show server down banner first (more critical)
  if (serverDown) {
    return (
      <div className="w-full px-4 py-2 flex items-center gap-2 text-xs text-[var(--color-loss)] border-b border-[var(--color-loss)]/20 bg-[var(--color-loss)]/10 shrink-0">
        <AlertTriangle size={13} />
        <span>Backend server disconnected — reconnecting…</span>
      </div>
    )
  }
  
  // Show WebSocket status if server is up but WS is down
  if (wsStatus !== 'connected') {
    return (
      <div className="w-full px-4 py-2 flex items-center gap-2 text-xs text-[var(--color-warn)] border-b border-[var(--color-warn)]/20 bg-[var(--color-warn)]/10 shrink-0">
        {wsStatus === 'reconnecting'
          ? <Loader2 size={13} className="animate-spin" />
          : <WifiOff size={13} />
        }
        <span>{wsStatus === 'reconnecting' ? 'MT5 connection lost — reconnecting…' : 'MT5 disconnected'}</span>
      </div>
    )
  }
  
  return null
}
