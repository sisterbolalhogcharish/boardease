import { ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Modal, Spinner } from './ui'
import { cn } from '../lib/utils'

/**
 * Aspect-aware crop step for images.
 *
 * Shows the chosen image in a fixed viewport that the user can drag to
 * reposition and zoom, with a guide matching the final shape (circle for the
 * round avatar, rounded rectangle for house photos). "Apply" draws exactly the
 * visible crop into a canvas and hands back a JPEG data URL, so what you see
 * is precisely what gets saved — no more surprise centre-cropping.
 *
 * The frame defaults to a square for profile photos; pass `aspect` (e.g.
 * 16/9) and a larger `outputWidth` for landscape gallery photos, where the
 * frame ratio matches the ratio photos are displayed at across the system —
 * at zoom 1 the whole picture is visible, so a matching photo is never cropped.
 */
export function ImageCropperModal({
  file,
  open,
  busy,
  aspect = 1,
  outputWidth = 320,
  quality = 0.85,
  fit = 'cover',
  guide,
  onClose,
  onApply,
  title = 'Crop your photo',
  hint,
}: {
  file: File | null
  open: boolean
  /** True while the cropped result is being uploaded — disables the buttons. */
  busy?: boolean
  /** Frame ratio as width ÷ height — 1 = square, 16/9 = landscape. */
  aspect?: number
  /** Pixel width of the produced JPEG (height follows the aspect). */
  outputWidth?: number
  quality?: number
  /** `cover` (default) fills the frame; `contain` fits the whole image inside
   *  it with white padding — right for documents that must stay complete. */
  fit?: 'cover' | 'contain'
  /** Guide overlay shape; defaults to a circle for square frames. */
  guide?: 'circle' | 'rect'
  onClose: () => void
  onApply: (dataUrl: string) => void
  title?: string
  hint?: string
}) {
  const guideShape = guide ?? (aspect === 1 && fit === 'cover' ? 'circle' : 'rect')
  const [src, setSrc] = useState<string | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [boxW, setBoxW] = useState(288)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const imgRef = useRef<HTMLImageElement | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const dragStart = useRef<{ x: number; y: number; baseX: number; baseY: number } | null>(null)

  const boxH = Math.round(boxW / aspect)

  // Object URLs must be revoked, so the lifetime is tied to this effect.
  useEffect(() => {
    if (!open || !file) {
      setSrc(null)
      setNatural(null)
      return
    }
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [open, file])

  // Fresh image → fresh transform.
  useEffect(() => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setError('')
  }, [src])

  // The viewport is fluid, so measure it for exact crop math.
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => setBoxW(el.clientWidth || 288)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [src])

  const baseScale = useMemo(() => {
    if (!natural) return 1
    // "Cover": smallest scale where the image fills the whole frame.
    // "Contain": whole image visible inside the frame (documents).
    return fit === 'contain'
      ? Math.min(boxW / natural.w, boxH / natural.h)
      : Math.max(boxW / natural.w, boxH / natural.h)
  }, [natural, boxW, boxH, fit])
  const k = baseScale * zoom

  const clampOffset = useCallback(
    (x: number, y: number, scale: number) => {
      if (!natural) return { x: 0, y: 0 }
      // The image must always cover the viewport.
      const maxX = Math.max(0, (natural.w * scale - boxW) / 2)
      const maxY = Math.max(0, (natural.h * scale - boxH) / 2)
      return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) }
    },
    [natural, boxW, boxH],
  )

  // Re-clamp whenever the scale or viewport changes.
  useEffect(() => {
    setOffset((o) => clampOffset(o.x, o.y, k))
  }, [k, clampOffset])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!natural || busy) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { x: e.clientX, y: e.clientY, baseX: offset.x, baseY: offset.y }
    setDragging(true)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return
    const d = dragStart.current
    setOffset(clampOffset(d.baseX + (e.clientX - d.x), d.baseY + (e.clientY - d.y), k))
  }

  const endDrag = () => {
    dragStart.current = null
    setDragging(false)
  }

  const applyCrop = () => {
    const img = imgRef.current
    if (!img || !natural) return
    const W = outputWidth
    const H = Math.round(outputWidth / aspect)
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('Your browser could not process that image.')
      return
    }
    // JPEG has no alpha channel: source rects that fall outside the image
    // (contain-fit padding, or a 1px rounding overhang) would render black
    // without this white base.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    // Container point p maps to natural coords n = (p - t) / k, with the image
    // drawn at translate(tx, ty) scale(k) (origin top-left). The crop is the
    // viewport, i.e. p from (0, 0) to (boxW, boxH).
    const tx = boxW / 2 + offset.x - (k * natural.w) / 2
    const ty = boxH / 2 + offset.y - (k * natural.h) / 2
    ctx.drawImage(img, -tx / k, -ty / k, boxW / k, boxH / k, 0, 0, W, H)
    onApply(canvas.toDataURL('image/jpeg', quality))
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col items-center">
        <div
          ref={boxRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ aspectRatio: String(aspect), maxHeight: boxW }}
          className={cn(
            'relative w-full max-w-[288px] touch-none select-none overflow-hidden rounded-2xl bg-navy-100',
            aspect !== 1 && 'sm:max-w-[448px]',
            dragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
        >
          {src && (
            <img
              ref={imgRef}
              src={src}
              alt="Crop preview"
              draggable={false}
              onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              className="absolute left-0 top-0 max-w-none"
              style={{
                transform: `translate(${boxW / 2 + offset.x - (k * (natural?.w ?? 0)) / 2}px, ${
                  boxH / 2 + offset.y - (k * (natural?.h ?? 0)) / 2
                }px) scale(${k})`,
                transformOrigin: '0 0',
              }}
            />
          )}
          {/* Guide — mirrors the final shape: circle for avatars, rounded
              rectangle for landscape photos and documents. */}
          {guideShape === 'circle' ? (
            <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/80" />
          ) : (
            <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-white/80" />
          )}
          <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_0_1px_rgb(11_45_99/0.08)]" />
        </div>

        <div className="mt-4 flex w-full max-w-[288px] items-center gap-3 text-mut sm:max-w-[448px]">
          <ZoomOut size={16} className="shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            disabled={!natural || busy}
            onChange={(e) => setZoom(Number(e.target.value))}
            onMouseUp={() => setOffset((o) => clampOffset(o.x, o.y, k))}
            className="h-1.5 w-full cursor-pointer accent-brand-500"
            aria-label="Zoom"
          />
          <ZoomIn size={16} className="shrink-0" />
        </div>
        <p className="mt-2 text-center text-[11px] text-mut">
          {hint ?? 'Drag to reposition · slide to zoom.'}
          {guideShape === 'circle' ? ' The circle is how it will appear.' : ' What you see is exactly what gets saved.'}
        </p>
        {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}

        <div className="mt-5 flex w-full justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={applyCrop}
            disabled={!natural || busy}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgb(30_115_232/0.35)] transition hover:bg-brand-600 disabled:opacity-60"
          >
            {busy && <Spinner className="h-4 w-4 text-white" />}
            Crop &amp; save
          </button>
        </div>
      </div>
    </Modal>
  )
}
