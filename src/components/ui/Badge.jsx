const styles = {
  profit: 'bg-[var(--color-profit)]/10 text-[var(--color-profit)] border-[var(--color-profit)]/20',
  loss: 'bg-[var(--color-loss)]/10 text-[var(--color-loss)] border-[var(--color-loss)]/20',
  warn: 'bg-[var(--color-warn)]/10 text-[var(--color-warn)] border-[var(--color-warn)]/20',
  live: 'bg-[var(--color-live)]/10 text-[var(--color-live)] border-[var(--color-live)]/20',
  neutral: 'bg-[var(--color-surface-2)] text-[var(--color-text-sec)] border-[var(--color-border)]',
}

export default function Badge({ variant = 'neutral', className = '', children }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${styles[variant]} ${className}`}>
      {children}
    </span>
  )
}
