export default function Select({ label, error, options = [], className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-[var(--color-text-sec)]">{label}</label>}
      <select
        className={`w-full px-3 py-2 text-sm bg-[var(--color-surface-2)] border rounded-lg text-[var(--color-text-pri)] outline-none transition-colors focus:border-[var(--color-accent)] appearance-none cursor-pointer ${error ? 'border-[var(--color-loss)]' : 'border-[var(--color-border)]'} ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o} className="bg-[var(--color-surface-2)]">
            {o.label ?? o}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-[var(--color-loss)]">{error}</p>}
    </div>
  )
}
