import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeftRight, Check, Heart, X } from 'lucide-react'
import { useEffect, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { MAX_COMPARE, useCompare } from '../../lib/compare'
import { useFavorites, useHouses, useToggleFavorite } from '../../lib/hooks'
import { cn } from '../../lib/utils'
import { HouseImage } from '../ui'

/* ------------------------------------------------------------------ */
/*  Tiny toast channel so "compare tray is full" has a visible home    */
/* ------------------------------------------------------------------ */
const TOAST_EVENT = 'boardease:toast'
export function showToast(message: string) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }))
}

function ToastHost() {
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    let timer: number | undefined
    const onToast = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setMessage(null), 3200)
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast)
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="fixed inset-x-4 bottom-36 z-[95] mx-auto max-w-sm rounded-xl bg-navy-900/95 px-4 py-3 text-center text-sm font-medium text-white shadow-float sm:bottom-28"
          role="status"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------ */
/*  Favorite (heart) control — cards, details, compare, favorites      */
/* ------------------------------------------------------------------ */
export function FavoriteButton({
  houseId,
  variant = 'icon',
  className,
  onToggled,
}: {
  houseId: string
  variant?: 'icon' | 'button'
  className?: string
  onToggled?: (favorited: boolean) => void
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: favorites } = useFavorites(user?.role === 'boarder' ? user?.id.toString() : undefined)
  const toggle = useToggleFavorite(user?.id?.toString())

  const favorited = !!favorites?.some((f) => f.house.id === houseId)

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate('/login')
      return
    }
    if (user.role !== 'boarder') {
      showToast('Only boarder accounts can save favorites.')
      return
    }
    toggle.mutate(
      { houseId, favorited },
      { onSuccess: () => onToggled?.(!favorited) },
    )
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={toggle.isPending}
        aria-pressed={favorited}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition disabled:opacity-60',
          favorited
            ? 'border-danger/30 bg-red-50 text-danger hover:bg-red-100'
            : 'border-slate-200 text-navy-800 hover:border-danger/40 hover:text-danger',
          className,
        )}
      >
        <Heart size={16} className={favorited ? 'fill-danger text-danger' : ''} />
        {favorited ? 'Saved to favorites' : 'Save to favorites'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={toggle.isPending}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={favorited}
      title={favorited ? 'Remove from favorites' : 'Save to favorites'}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110 disabled:opacity-60',
        className,
      )}
    >
      <Heart size={16} className={favorited ? 'fill-danger text-danger' : 'text-slate-500'} />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Compare control                                                    */
/* ------------------------------------------------------------------ */
export function CompareButton({
  houseId,
  variant = 'icon',
  className,
}: {
  houseId: string
  variant?: 'icon' | 'button'
  className?: string
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const compare = useCompare()
  const selected = compare.has(houseId)

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user || user.role !== 'boarder') {
      navigate('/login')
      return
    }
    const result = compare.toggle(houseId)
    if (result.limitReached) {
      showToast(`You can compare up to ${MAX_COMPARE} boarding houses. Remove one first.`)
    } else if (result.added) {
      showToast('Added to comparison.')
    }
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={selected}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition',
          selected
            ? 'border-navy-800 bg-navy-800 text-white hover:bg-navy-700'
            : 'border-slate-200 text-navy-800 hover:border-navy-400',
          className,
        )}
      >
        {selected ? <Check size={16} /> : <ArrowLeftRight size={16} />}
        {selected ? 'In comparison' : 'Compare'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={selected ? 'Remove from comparison' : 'Add to comparison'}
      aria-pressed={selected}
      title={selected ? 'Remove from comparison' : 'Add to compare'}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur transition hover:scale-110',
        selected ? 'bg-navy-800 text-white' : 'bg-white/90 text-slate-500',
        className,
      )}
    >
      {selected ? <Check size={16} /> : <ArrowLeftRight size={16} />}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Floating compare tray (only for signed-in boarders)                */
/* ------------------------------------------------------------------ */
function CompareTray() {
  const navigate = useNavigate()
  const compare = useCompare()
  const { data: houses } = useHouses()

  const selected = (houses ?? []).filter((h) => compare.ids.includes(h.id))

  const dock = compare.count > 0

  return (
    <>
      <AnimatePresence>
        {dock && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-3 bottom-20 z-[85] mx-auto flex max-w-2xl items-center gap-3 rounded-[18px] bg-navy-900/95 px-3 py-3 text-white shadow-float backdrop-blur sm:bottom-4 sm:px-4"
          >
            <div className="hidden shrink-0 items-center gap-1 sm:flex">
              {selected.slice(0, MAX_COMPARE).map((h) => (
                <span key={h.id} className="relative">
                  <HouseImage src={h.images[0]} alt={h.name} className="h-9 w-9 rounded-lg" />
                  <button
                    onClick={() => compare.remove(h.id)}
                    aria-label={`Remove ${h.name} from comparison`}
                    className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-navy-800 shadow"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <p className="min-w-0 flex-1 truncate text-sm font-medium">
              {compare.count} of {MAX_COMPARE} selected for comparison
            </p>
            <button onClick={() => compare.clear()} className="rounded-lg px-3 py-2 text-xs font-semibold text-navy-200 transition hover:bg-white/10 hover:text-white">
              Clear
            </button>
            <button
              onClick={() => navigate('/boarder/compare')}
              className="rounded-xl bg-mint-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-mint-600"
            >
              Compare
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/**
 * Global dock host. The toast channel always mounts so limit warnings are
 * visible; the tray itself only mounts for signed-in boarders (avoiding an
 * unnecessary houses query on public pages).
 */
export function CompareDock() {
  const { user } = useAuth()
  return (
    <>
      <ToastHost />
      {user?.role === 'boarder' ? <CompareTray /> : null}
    </>
  )
}
