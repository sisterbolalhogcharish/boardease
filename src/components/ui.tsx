import { AnimatePresence, motion } from 'framer-motion'
import { Building2, Loader2, Star, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '../lib/utils'

/* ------------------------------------------------------------------ */
/*  Status badges                                                      */
/* ------------------------------------------------------------------ */
export function HouseStatusBadge({ status, vacant }: { status: 'available' | 'almost-full' | 'occupied' | 'full'; vacant?: number }) {
  const map = {
    available: { label: `${vacant ?? ''} Rooms Available`.trim(), cls: 'bg-mint-50 text-mint-600 border-mint-100', dot: 'bg-mint-400' },
    'almost-full': { label: vacant && vacant <= 2 ? `Only ${vacant} Left` : 'Almost Full', cls: 'bg-amber-50 text-amber-soft border-amber-100', dot: 'bg-amber-soft' },
    occupied: { label: 'Occupied', cls: 'bg-brand-50 text-brand-600 border-brand-100', dot: 'bg-info' },
    full: { label: 'Fully Occupied', cls: 'bg-red-50 text-danger border-red-100', dot: 'bg-danger' },
  }[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', map.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', map.dot)} />
      {map.label}
    </span>
  )
}

export function PaymentBadge({ status }: { status: 'paid' | 'late' | 'pending' | 'overdue' }) {
  const map = {
    paid: { label: 'Paid', cls: 'bg-mint-50 text-mint-600 border-mint-100' },
    late: { label: 'Late', cls: 'bg-amber-50 text-amber-soft border-amber-100' },
    pending: { label: 'Pending', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    overdue: { label: 'Overdue', cls: 'bg-red-50 text-danger border-red-100' },
  }[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', map.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', status === 'paid' ? 'bg-mint-400' : status === 'late' ? 'bg-amber-soft' : status === 'overdue' ? 'bg-danger' : 'bg-slate-400')} />
      {map.label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Star rating                                                        */
/* ------------------------------------------------------------------ */
export function Rating({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn('relative inline-flex align-middle', className)} aria-label={`${value} out of 5`}>
      <span className="flex gap-0.5 text-slate-200">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={size} fill="currentColor" strokeWidth={0} />
        ))}
      </span>
      <span className="absolute inset-0 flex gap-0.5 overflow-hidden text-amber-400" style={{ width: `${(value / 5) * 100}%` }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={size} fill="currentColor" strokeWidth={0} className="shrink-0" />
        ))}
      </span>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Scroll reveal                                                      */
/* ------------------------------------------------------------------ */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Image with graceful fallback                                       */
/* ------------------------------------------------------------------ */
export function HouseImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed)
    return (
      <div className={cn('flex items-center justify-center bg-gradient-to-br from-navy-100 via-brand-100 to-mint-100', className)}>
        <Building2 className="h-10 w-10 text-navy-300" />
      </div>
    )
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Modal                                                              */
/* ------------------------------------------------------------------ */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-navy-950/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={cn('max-h-[88vh] w-full overflow-y-auto rounded-[18px] bg-white shadow-float', wide ? 'max-w-3xl' : 'max-w-lg')}
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 px-6 py-4 backdrop-blur">
              <h3 className="text-lg font-bold text-navy-800">{title}</h3>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy-800"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat card (dashboard)                                              */
/* ------------------------------------------------------------------ */
export type Tone = 'green' | 'blue' | 'orange' | 'red' | 'navy'
const toneMap: Record<Tone, { bg: string; text: string }> = {
  green: { bg: 'bg-mint-50', text: 'text-mint-600' },
  blue: { bg: 'bg-brand-50', text: 'text-brand-500' },
  orange: { bg: 'bg-amber-50', text: 'text-amber-soft' },
  red: { bg: 'bg-red-50', text: 'text-danger' },
  navy: { bg: 'bg-navy-50', text: 'text-navy-800' },
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'navy',
  hint,
  loading,
}: {
  label: string
  value: string
  icon: ReactNode
  tone?: Tone
  hint?: ReactNode
  loading?: boolean
}) {
  const t = toneMap[tone]
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-mut">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-20 animate-pulse rounded-md bg-slate-100" />
          ) : (
            <p className="mt-1 truncate text-[22px] font-bold tracking-tight text-navy-800">{value}</p>
          )}
          {hint && <div className="mt-1 text-xs text-ink">{hint}</div>}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', t.bg, t.text)}>{icon}</div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Misc                                                               */
/* ------------------------------------------------------------------ */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin', className)} />
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center,
  light,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  center?: boolean
  light?: boolean
}) {
  return (
    <Reveal className={cn('max-w-2xl', center && 'mx-auto text-center')}>
      {eyebrow && (
        <span className={cn('mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider', light ? 'bg-white/10 text-mint-300' : 'bg-brand-50 text-brand-500')}>
          {eyebrow}
        </span>
      )}
      <h2 className={cn('text-3xl font-bold tracking-tight sm:text-4xl', light ? 'text-white' : 'text-navy-800')}>{title}</h2>
      {subtitle && <p className={cn('mt-3 text-[15px] leading-relaxed', light ? 'text-navy-100/80' : 'text-ink')}>{subtitle}</p>}
    </Reveal>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-slate-100', className)} />
}

export function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-slate-200 bg-white/60 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">{icon}</div>
      <p className="font-semibold text-navy-800">{title}</p>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-ink">{subtitle}</p>}
    </div>
  )
}
