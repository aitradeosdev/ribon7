import { AnimatePresence, motion } from 'framer-motion'

export default function Modal({ open, onClose, title, children, className = '' }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className={`relative z-10 w-full max-w-md bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-2xl shadow-2xl ${className}`}
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
          >
            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                <h2 className="text-sm font-semibold text-[var(--color-text-pri)]">{title}</h2>
                <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-pri)] transition-colors text-lg leading-none">×</button>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
