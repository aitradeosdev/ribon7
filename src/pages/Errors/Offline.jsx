import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { WifiOff } from 'lucide-react'

export default function Offline() {
  const navigate = useNavigate()
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => { setOnline(true); navigate(-1) }
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [navigate])

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', gap: 16 }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '0.2em', color: 'var(--color-accent)', fontWeight: 600 }}>RIBON7</span>
        <WifiOff size={48} color="var(--color-text-muted)" strokeWidth={1.5} />
        <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-pri)' }}>You are offline</span>
        <span style={{ fontSize: 13, color: 'var(--color-text-sec)', textAlign: 'center', maxWidth: 280 }}>
          Connect to the internet to continue
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--mono)' }}>
          {online ? 'Connected — redirecting…' : 'Waiting for connection…'}
        </span>
      </motion.div>
    </div>
  )
}
