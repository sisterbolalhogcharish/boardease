import { motion } from 'framer-motion'
import { CalendarClock, Clock, MapPin, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, HouseImage, Modal, Skeleton } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { useCancelReservation, useReservations } from '../../lib/hooks'
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

export default function BoarderReservations() {
  const { user } = useAuth()
  const userId = user?.id?.toString()
  const { data: reservations, isLoading } = useReservations(userId)
  const cancel = useCancelReservation(userId)

  const [tab, setTab] = useState<'all' | ReservationStatus>('all')
  const [detail, setDetail] = useState<Reservation | null>(null)
  const [error, setError] = useState('')

  const list = reservations ?? []
  const filtered = useMemo(() => (tab === 'all' ? list : list.filter((r) => r.status === tab)), [list, tab])

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: list.length }
    for (const t of TABS) if (t.value !== 'all') base[t.value] = list.filter((r) => r.status === t.value).length
    return base
  }, [list])

  const handleCancel = async (r: Reservation) => {
    setError('')
    try {
      await cancel.mutateAsync(r.id)
      setDetail(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel this request.')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-[18px]" />
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
                tab === t.value ? 'bg-navy-800 text-white' : 'bg-slate-50 text-ink hover:bg-slate-100 hover:text-navy-800',
              )}
            >
              {t.label}
              {counts[t.value] > 0 && <span className="ml-1.5 text-[10px] opacity-80">{counts[t.value]}</span>}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{error}</p>}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={22} />}
          title={tab === 'all' ? 'No reservation requests yet' : `No ${tab} reservations`}
          subtitle="When you request a room from a boarding house, it will appear here with its status."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i % 6) * 0.04 }}
              className="overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-card"
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                <HouseImage src={r.houseImage} alt={r.houseName} className="h-32 w-full shrink-0 rounded-xl sm:h-24 sm:w-32" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/houses/${r.houseId}`} className="text-[15px] font-bold text-navy-800 hover:text-brand-500">
                        {r.houseName}
                      </Link>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-mut">
                        <MapPin size={12} className="text-brand-500" />
                        {r.barangay}
                        {r.barangay && r.municipality ? ', ' : ''}
                        {r.municipality}
                      </p>
                    </div>
                    <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide', STATUS_STYLE[r.status])}>
                      {r.status}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-x-6 gap-y-1.5 text-xs text-ink sm:grid-cols-2">
                    <p>
                      Room:{' '}
                      <span className="font-semibold text-navy-800">
                        {r.roomNo ? `${r.roomNo}${r.roomType ? ` · ${ROOM_TYPE_LABEL[r.roomType] ?? r.roomType}` : ''}` : 'Any available room'}
                      </span>
                    </p>
                    <p>
                      Rental rate: <span className="font-semibold text-navy-800">{peso(r.monthlyRent)}/month</span>
                    </p>
                    <p>
                      Date requested: <span className="font-semibold text-navy-800">{r.createdAt ? prettyDate(r.createdAt.slice(0, 10)) : '—'}</span>
                    </p>
                    <p>
                      Move-in date: <span className="font-semibold text-navy-800">{r.moveInDate ? prettyDate(r.moveInDate) : '—'}</span>
                    </p>
                  </div>

                  {r.ownerResponse && (
                    <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-xs text-ink">
                      <span className="font-bold uppercase tracking-wide text-mint-600">Owner response: </span>
                      {r.ownerResponse}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
                  <button
                    onClick={() => setDetail(r)}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-500 sm:flex-none"
                  >
                    View Details
                  </button>
                  {r.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(r)}
                      disabled={cancel.isPending}
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-ink transition hover:border-danger/40 hover:text-danger disabled:opacity-60 sm:flex-none"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Reservation Details">
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <HouseImage src={detail.houseImage} alt={detail.houseName} className="h-16 w-16 rounded-xl" />
              <div>
                <p className="text-sm font-bold text-navy-800">{detail.houseName}</p>
                <p className="text-xs text-mut">
                  {detail.barangay}
                  {detail.barangay && detail.municipality ? ', ' : ''}
                  {detail.municipality}
                </p>
              </div>
            </div>

            <dl className="space-y-3 rounded-2xl border border-slate-100 bg-surface p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink">Status</dt>
                <dd className="font-semibold uppercase text-navy-800">{detail.status}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink">Room</dt>
                <dd className="font-semibold text-navy-800">
                  {detail.roomNo ? `Room ${detail.roomNo}` : 'Any available room'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink">Monthly rate</dt>
                <dd className="font-semibold text-navy-800">{peso(detail.monthlyRent)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink">Preferred move-in</dt>
                <dd className="font-semibold text-navy-800">{detail.moveInDate ? prettyDate(detail.moveInDate) : '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink">Duration</dt>
                <dd className="font-semibold text-navy-800">
                  {detail.durationMonths ? `${detail.durationMonths} month${detail.durationMonths === 1 ? '' : 's'}` : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink">Requested on</dt>
                <dd className="font-semibold text-navy-800">
                  {detail.createdAt ? prettyDate(detail.createdAt.slice(0, 10)) : '—'}
                </dd>
              </div>
              {detail.message && (
                <div>
                  <dt className="text-ink">Your message</dt>
                  <dd className="mt-1 font-medium text-navy-800">{detail.message}</dd>
                </div>
              )}
              {detail.ownerResponse && (
                <div>
                  <dt className="text-ink">Owner response</dt>
                  <dd className="mt-1 font-medium text-navy-800">{detail.ownerResponse}</dd>
                </div>
              )}
            </dl>

            <div className="flex items-start gap-2 rounded-xl border border-slate-100 p-3 text-xs text-ink">
              <Clock size={14} className="mt-0.5 shrink-0 text-brand-500" />
              BoardEase does not process online payments. Rent is settled directly with the owner once a request is
              approved.
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Link
                to={`/houses/${detail.houseId}`}
                onClick={() => setDetail(null)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-500"
              >
                View boarding house
              </Link>
              {detail.status === 'pending' && (
                <button
                  onClick={() => handleCancel(detail)}
                  disabled={cancel.isPending}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-danger px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  <X size={15} /> Cancel Request
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
