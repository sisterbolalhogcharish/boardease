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

/** Relative time like "2h ago" / "3d ago". Accepts date-only or ISO strings. */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00').getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

/**
 * Read an image file chosen by the user and return a small, square,
 * centre-cropped JPEG data URL (default 320x320).
 *
 * Resizing in the browser keeps the uploaded profile photo around 20-60 KB,
 * so no file storage or upload middleware is needed and the image can simply
 * live on the account row. Rejects non-images so callers can show a message.
 */
export function fileToSquareDataUrl(file: File, size = 320, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file (JPG, PNG or WebP).'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file. Please try another image.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('That image could not be opened. Please try another one.'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Your browser could not process that image.'))
          return
        }
        // Centre-crop to a square, then scale to `size`.
        const w = img.naturalWidth || img.width
        const h = img.naturalHeight || img.height
        const side = Math.min(w, h)
        const sx = (w - side) / 2
        const sy = (h - side) / 2
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
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
