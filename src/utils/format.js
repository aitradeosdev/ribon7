export function formatPrice(value, digits = 5) {
  if (value == null) return '--'
  return Number(value).toFixed(digits)
}

export function formatPL(value) {
  if (value == null) return '--'
  const formatted = Number(value).toFixed(2)
  return value >= 0 ? `+${formatted}` : formatted
}

export function formatDate(date, format = 'short') {
  if (!date) return '--'
  const d = new Date(date)
  
  if (format === 'short') {
    return d.toLocaleDateString()
  }
  
  return d.toLocaleString()
}