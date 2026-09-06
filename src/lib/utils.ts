/** Join class names, ignoring falsy values. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** Format a number as Philippine pesos. */
export const peso = (n: number) => `₱${n.toLocaleString('en-PH')}`

/** "2026-08-04" → "Aug 4, 2026" */
export function prettyDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Relative time like "2h ago" / "3d ago". */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr + 'T00:00:00').getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

/** "Jessa Marie Cabanero" → "JC" */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}
