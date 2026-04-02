import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Server, RefreshCw } from 'lucide-react'
import { useServerStore } from '../../store/serverStore'
import Button from '../../components/ui/Button'

const RETRY_INTERVAL = 15

export default function ServerDown() {
  const setServerDown = useServerStore((s) => s.setServerDown)
  const [countdown, setCountdown] = useState(RETRY_INTERVAL)
  const [retrying, setRetrying] = useState(false)

  const checkConnection = async () => {
    try {
      await fetch(import.meta.env.VITE_API_BASE_URL + '/health', { 
        method: 'GET',
        headers: { 'ngrok-skip-browser-warning': 'true' },
        timeout: 5000 
      })
      setServerDown(false)
    } catch {
      // Still down
    }
  }

  const handleManualRetry = async () => {
    setRetrying(true)
    await checkConnection()
    setRetrying(false)
  }

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          checkConnection()
          return RETRY_INTERVAL
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [setServerDown])

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', gap: 16 }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '0.2em', color: 'var(--color-accent)', fontWeight: 600 }}>RIBON7</span>
        <Server size={48} color="var(--color-text-muted)" strokeWidth={1.5} />
        <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-pri)' }}>Backend unreachable</span>
        <span style={{ fontSize: 13, color: 'var(--color-text-sec)', textAlign: 'center', maxWidth: 320 }}>
          Ribon7 is having trouble connecting to the server. Retrying…
        </span>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--mono)' }}>
          Next retry in {countdown}s
        </span>
        <Button 
          onClick={handleManualRetry} 
          disabled={retrying}
          size="sm"
          style={{ marginTop: 8 }}
        >
          {retrying ? (
            <><RefreshCw size={12} className="animate-spin" /> Retrying…</>
          ) : (
            <><RefreshCw size={12} /> Retry Now</>
          )}
        </Button>
      </motion.div>
    </div>
  )
}
