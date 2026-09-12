import { motion } from 'framer-motion'
import { Check, Phone, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, HouseImage, Skeleton } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { useOwnerReservations, useRespondToReservation } from '../../lib/hooks'
import { cn, peso, prettyDate } from '../../lib/utils'
import type { Reservation, ReservationStatus } from '../../lib/api'

const TABS: { value: 'all' | ReservationStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_STYLE: Record<ReservationStatus, string> = {
  pending: 'bg-amber-50 text-amber-soft border-amber-100',
  approved: 'bg-mint-50 text-mint-600 border-mint-100',
  declined: 'bg-red-50 text-danger border-red-100',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
}

const ROOM_TYPE_LABEL: Record<string, string> = {
  bedspace: 'Bedspace',
  single: 'Single room',
  double: 'Double room',
  studio: 'Studio',
}

/**
 * Owner inbox for boarder reservation REQUESTS. Approving a request is the
 * moment a boarder gains an active accommodation (and their first rent record).
 */
export default function Reservations() {
  const { user } = useAuth()
  const ownerId = user?.id?.toString()
  const { data: reservations, isLoading } = useOwnerReservations(ownerId)
  const respond = useRespondToReservation(ownerId)

  const [tab, setTab] = useState<'all' | ReservationStatus>('pending')
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const list = reservations ?? []
  const filtered = useMemo(() => (tab === 'all' ? list : list.filter((r) => r.status === tab)), [list, tab])

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: list.length }
    for (const t of TABS) if (t.value !== 'all') base[t.value] = list.filter((r) => r.status === t.value).length
    return base
  }, [list])

  const decide = async (r: Reservation, status: 'approved' | 'declined') => {
    setError('')
    setNotice('')
    try {
      const result = await respond.mutateAsync({ id: r.id, status, response: response.trim() || undefined })
      setNotice(
        status === 'approved'
          ? result.accommodationAttached
            ? `${r.boarderName} is now assigned to Room ${r.roomNo ?? ''} — their My Home page is active.`
            : `${r.boarderName}'s request was approved. They already have an active accommodation, so no new assignment was created.`
          : `${r.boarderName}'s request was declined.`,
      )
      setRespondingId(null)
      setResponse('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this request.')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-[18px]" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-card">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Reservation status">
          {TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-semibold transition',
                tab === t.value ? 'bg-brand-500 text-white' : 'bg-slate-50 text-ink hover:bg-slate-100 hover:text-navy-800',
              )}
            >
              {t.label}
              {counts[t.value] > 0 && <span className="ml-1.5 text-[10px] opacity-80">{counts[t.value]}</span>}
            </button>
          ))}
        </div>
      </div>

      {notice && <p className="rounded-lg bg-mint-50 px-3 py-2 text-sm font-medium text-mint-600">{notice}</p>}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{error}</p>}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Check size={22} />}
          title={tab === 'pending' ? 'No pending reservation requests' : `No ${tab} reservations`}
          subtitle="Boarder requests from your boarding house pages will appear here for approval."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i % 6) * 0.04 }}
              className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card"
            >
              <div className="flex flex-col gap-4 lg:flex-row">
                <HouseImage src={r.houseImage} alt={r.houseName} className="h-24 w-full shrink-0 rounded-xl lg:h-20 lg:w-28" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[15px] font-bold text-navy-800">{r.boarderName}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink">
                        <span>{r.houseName}</span>
                        <span>
                          Room: <span className="font-semibold text-navy-800">{r.roomNo ?? 'Any available room'}</span>
                          {r.roomType ? ` · ${ROOM_TYPE_LABEL[r.roomType] ?? r.roomType}` : ''}
                        </span>
                        <span>Rate: <span className="font-semibold text-navy-800">{peso(r.monthlyRent)}/month</span></span>
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink">
                        <span>Move-in: <span className="font-semibold text-navy-800">{prettyDate(r.moveInDate)}</span></span>
                        <span>
                          Duration:{' '}
                          <span className="font-semibold text-navy-800">
                            {r.durationMonths ? `${r.durationMonths} month${r.durationMonths === 1 ? '' : 's'}` : '—'}
                          </span>
                        </span>
                        <span>Requested: {r.createdAt ? prettyDate(r.createdAt.slice(0, 10)) : '—'}</span>
                      </p>
                      {r.boarderPhone && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink">
                          <Phone size={12} className="text-mut" /> {r.boarderPhone}
                        </p>
                      )}
                    </div>
                    <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide', STATUS_STYLE[r.status])}>
                      {r.status}
                    </span>
                  </div>

                  {r.message && (
                    <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-xs text-ink">
                      <span className="font-bold uppercase tracking-wide text-mut">Boarder message: </span>
                      {r.message}
                    </p>
                  )}

                  {r.ownerResponse && (
                    <p className="mt-2 rounded-xl bg-mint-50/60 px-3 py-2 text-xs text-ink">
                      <span className="font-bold uppercase tracking-wide text-mint-600">Your response: </span>
                      {r.ownerResponse}
                    </p>
                  )}

                  {r.status === 'pending' && (
                    <div className="mt-4">
                      {respondingId === r.id ? (
                        <div className="space-y-3">
                          <label htmlFor={`response-${r.id}`} className="block text-xs font-semibold uppercase tracking-wider text-mut">
                            Response note (optional)
                          </label>
                          <textarea
                            id={`response-${r.id}`}
                            rows={2}
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            placeholder="e.g. Please visit the office to sign the contract."
                            className="w-full rounded-xl border border-slate-200 p-3 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => decide(r, 'approved')}
                              disabled={respond.isPending}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-mint-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-mint-600 disabled:opacity-60"
                            >
                              <Check size={14} /> Confirm approval
                            </button>
                            <button
                              onClick={() => decide(r, 'declined')}
                              disabled={respond.isPending}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-4 py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                            >
                              <X size={14} /> Confirm decline
                            </button>
                            <button
                              onClick={() => {
                                setRespondingId(null)
                                setResponse('')
                              }}
                              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-ink transition hover:border-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setRespondingId(r.id)
                              setResponse('')
                              setNotice('')
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-mint-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-mint-600"
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            onClick={() => {
                              setRespondingId(r.id)
                              setResponse('')
                              setNotice('')
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-danger/30 bg-red-50 px-4 py-2.5 text-xs font-bold text-danger transition hover:bg-red-100"
                          >
                            <X size={14} /> Decline
                          </button>
                          <Link
                            to="/dashboard/messages"
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-500"
                          >
                            Message boarder
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
