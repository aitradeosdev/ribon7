const variants = {
  primary: 'bg-[var(--color-accent)] text-white hover:opacity-90',
  secondary: 'bg-[var(--color-surface-2)] text-[var(--color-text-pri)] border border-[var(--color-border)] hover:border-[var(--color-border-hi)]',
  danger: 'bg-[var(--color-loss)] text-white hover:opacity-90',
  ghost: 'text-[var(--color-text-sec)] hover:text-[var(--color-text-pri)] hover:bg-[var(--color-surface-2)]',
}
const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
}

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
