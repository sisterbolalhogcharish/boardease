import { ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Modal, Spinner } from './ui'
import { cn } from '../lib/utils'

/**
 * Square crop step for profile photos.
 *
 * Shows the chosen image in a fixed square viewport that the user can drag to
 * reposition and zoom, with a circular guide matching the round avatar shape.
 * "Apply" draws exactly the visible crop into a small canvas and hands back a
 * JPEG data URL, so what you see is precisely what gets saved — no more
 * surprise centre-cropping of off-centre faces.
 */
export function ImageCropperModal({
  file,
  open,
  busy,
  onClose,
  onApply,
  title = 'Crop your photo',
}: {
  file: File | null
  open: boolean
  /** True while the cropped result is being uploaded — disables the buttons. */
  busy?: boolean
  onClose: () => void
  onApply: (dataUrl: string) => void
  title?: string
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [box, setBox] = useState(288)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const imgRef = useRef<HTMLImageElement | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const dragStart = useRef<{ x: number; y: number; baseX: number; baseY: number } | null>(null)

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

  // The viewport is fluid (max-w-288), so measure it for exact crop math.
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => setBox(el.clientWidth || 288)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [src])

  const baseScale = useMemo(() => {
    if (!natural) return 1
    return Math.max(box / natural.w, box / natural.h)
  }, [natural, box])
  const k = baseScale * zoom

  const clampOffset = useCallback(
    (x: number, y: number, scale: number) => {
      if (!natural) return { x: 0, y: 0 }
      // The image must always cover the viewport.
      const maxX = Math.max(0, (natural.w * scale - box) / 2)
      const maxY = Math.max(0, (natural.h * scale - box) / 2)
      return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) }
    },
    [natural, box],
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
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 320
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('Your browser could not process that image.')
      return
    }
    // Container point p maps to natural coords n = (p - t) / k, with the image
    // drawn at translate(tx, ty) scale(k) (origin top-left). The crop is the
    // viewport square, i.e. p from (0, 0) to (box, box).
    const tx = box / 2 + offset.x - (k * natural.w) / 2
    const ty = box / 2 + offset.y - (k * natural.h) / 2
    const srcW = box / k
    ctx.drawImage(img, -tx / k, -ty / k, srcW, srcW, 0, 0, 320, 320)
    onApply(canvas.toDataURL('image/jpeg', 0.85))
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
          className={cn(
            'relative aspect-square w-full max-w-[288px] touch-none select-none overflow-hidden rounded-2xl bg-navy-100',
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
                transform: `translate(${box / 2 + offset.x - (k * (natural?.w ?? 0)) / 2}px, ${
                  box / 2 + offset.y - (k * (natural?.h ?? 0)) / 2
                }px) scale(${k})`,
                transformOrigin: '0 0',
              }}
            />
          )}
          {/* Circular guide — mirrors the round avatar used across the app. */}
          <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/80" />
          <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_0_1px_rgb(11_45_99/0.08)]" />
        </div>

        <div className="mt-4 flex w-full max-w-[288px] items-center gap-3 text-mut">
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
        <p className="mt-2 text-[11px] text-mut">Drag to reposition · slide to zoom · the circle is how it will appear.</p>
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
