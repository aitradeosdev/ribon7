export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-[var(--color-text-sec)]">{label}</label>}
      <input
        className={`w-full px-3 py-2 text-sm bg-[var(--color-surface-2)] border rounded-lg text-[var(--color-text-pri)] placeholder:text-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-accent)] ${error ? 'border-[var(--color-loss)]' : 'border-[var(--color-border)]'} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[var(--color-loss)]">{error}</p>}
    </div>
  )
}
