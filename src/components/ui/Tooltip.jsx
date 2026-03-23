export default function Tooltip({ content, children, className = '' }) {
  return (
    <div className={`relative group inline-flex ${className}`}>
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded-md bg-[var(--color-surface-3)] border border-[var(--color-border)] text-[var(--color-text-pri)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {content}
      </div>
    </div>
  )
}
