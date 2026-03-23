export default function Card({ header, label, className = '', children }) {
  return (
    <div className={`bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-xl ${className}`}>
      {label && <p className="px-4 pt-3 text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">{label}</p>}
      {header && <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">{header}</div>}
      <div className="p-4">{children}</div>
    </div>
  )
}
