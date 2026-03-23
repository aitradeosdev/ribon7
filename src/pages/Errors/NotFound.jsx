import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', gap: 16 }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '0.2em', color: 'var(--color-accent)', fontWeight: 600 }}>RIBON7</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 96, fontWeight: 700, lineHeight: 1, color: 'var(--color-text-muted)' }}>404</span>
        <span style={{ fontSize: 14, color: 'var(--color-text-sec)' }}>Page not found</span>
        <button
          onClick={() => navigate('/home')}
          style={{ marginTop: 8, padding: '8px 20px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface-1)', color: 'var(--color-text-pri)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}
        >
          Back to Home
        </button>
      </motion.div>
    </div>
  )
}
