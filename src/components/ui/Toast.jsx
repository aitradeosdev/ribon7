import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useNotifStore } from '../../store/notifStore'

const icons = { success: CheckCircle, error: XCircle, warn: AlertTriangle, info: Info }
const colors = {
  success: 'border-[var(--color-profit)] text-[var(--color-profit)]',
  error: 'border-[var(--color-loss)] text-[var(--color-loss)]',
  warn: 'border-[var(--color-warn)] text-[var(--color-warn)]',
  info: 'border-[var(--color-accent)] text-[var(--color-accent)]',
}
const bars = { success: 'bg-[var(--color-profit)]', error: 'bg-[var(--color-loss)]', warn: 'bg-[var(--color-warn)]', info: 'bg-[var(--color-accent)]' }

function ToastItem({ notif }) {
  const remove = useNotifStore((s) => s.removeNotification)
  const Icon = icons[notif.type] || Info

  useEffect(() => {
    const t = setTimeout(() => remove(notif.id), 4000)
    return () => clearTimeout(t)
  }, [notif.id])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
      className={`relative w-72 bg-[var(--color-surface-1)] border-l-2 rounded-lg shadow-xl overflow-hidden ${colors[notif.type]}`}
    >
      <div className="flex items-start gap-3 p-3 pr-8">
        <Icon size={16} className="mt-0.5 shrink-0" />
        <div>
          {notif.title && <p className="text-xs font-semibold text-[var(--color-text-pri)]">{notif.title}</p>}
          {notif.message && <p className="text-xs text-[var(--color-text-sec)] mt-0.5">{notif.message}</p>}
        </div>
      </div>
      <button onClick={() => remove(notif.id)} className="absolute top-2 right-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-pri)]">
        <X size={12} />
      </button>
      <motion.div
        className={`absolute bottom-0 left-0 h-0.5 ${bars[notif.type]}`}
        initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 4, ease: 'linear' }}
      />
    </motion.div>
  )
}

export default function Toast() {
  const notifications = useNotifStore((s) => s.notifications)
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end">
      <AnimatePresence mode="popLayout">
        {notifications.map((n) => <ToastItem key={n.id} notif={n} />)}
      </AnimatePresence>
    </div>
  )
}
