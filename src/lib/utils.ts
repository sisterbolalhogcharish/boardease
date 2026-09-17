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

/* ------------------------------------------------------------------ */
/*  Fast, app-controlled smooth scrolling                              */
/* ------------------------------------------------------------------ */
/**
 * Distance-proportional capped animation speed: 1200 px/s, 280 ms minimum,
 * 600 ms ceiling. Rationale:
 *  - Speed NOT duration is the constant, so long hops (Hero → Pricing) take
 *    exactly as long as needed and short hops never overshoot into sluggish
 *    territory — the old browser-native smooth scroll could easily take over
 *    a second with a slow, decelerating tail.
 *  - The easing is ease-out cubic: velocity is highest on the very first
 *    frame and settles smoothly at the end, so there is no built-in ramp-up
 *    delay and no long decelerating tail — what made clicks feel laggy before.
 *
 * Everything about the *feel* is preserved: smooth, animated, no jump cut —
 * just noticeably faster. This also deliberately overrides the CSS
 * `html { scroll-behavior: smooth }` rule (an rAF animation is not a native
 * scroll, so the browser's slow smooth-scroll never kicks in).
 */
const SCROLL_SPEED = 1200 // px per second
const MIN_SCROLL_MS = 280
const MAX_SCROLL_MS = 600

/** Shared rAF runner: cancels any in-flight scroll before starting a new one,
 *  so rapid clicks always win instead of fighting each other. */
let activeScrollRaf: number | null = null

export function scrollToSectionId(id: string, offset = 88): void {
  const el = document.getElementById(id)
  if (!el) return

  const startY = window.scrollY
  // Layout can shift while we scroll (lazy images, the Search hero loading),
  // so keep re-reading the target rather than freezing one distance.
  const targetY = () => Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset)

  // Above-the-fold section: land instantly — there is nothing to animate.
  // NOTE: behavior:'instant' is required — plain scrollTo(0, y) defaults to
  // behavior:'auto', which FOLLOWS the CSS `html { scroll-behavior: smooth }`
  // rule and would hand every frame back to the browser's slow animation.
  if (Math.abs(targetY() - startY) < 2) {
    window.scrollTo({ top: targetY(), behavior: 'instant' })
    return
  }

  if (activeScrollRaf !== null) cancelAnimationFrame(activeScrollRaf)

  const t0 = performance.now()
  // Distance grows while we fly, so measure per frame instead of once.
  const initialDist = Math.abs(targetY() - startY)
  const dur = Math.min(MAX_SCROLL_MS, Math.max(MIN_SCROLL_MS, (initialDist / SCROLL_SPEED) * 1000))

  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / dur)
    const dist = targetY() - startY
    // Ease-out cubic: full speed from the very first frame, smooth settle.
    const eased = 1 - Math.pow(1 - t, 3)
    window.scrollTo({ top: startY + dist * eased, behavior: 'instant' })
    if (t < 1) {
      activeScrollRaf = requestAnimationFrame(step)
    } else {
      activeScrollRaf = null
      // Exact landing if layout shifted mid-flight.
      window.scrollTo({ top: targetY(), behavior: 'instant' })
    }
  }
  activeScrollRaf = requestAnimationFrame(step)
}
