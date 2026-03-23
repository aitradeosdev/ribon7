export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {Icon && <Icon size={32} className="text-[var(--color-text-muted)]" />}
      <p className="text-sm font-medium text-[var(--color-text-sec)]">{title}</p>
      {description && <p className="text-xs text-[var(--color-text-muted)] max-w-xs">{description}</p>}
      {action}
    </div>
  )
}
