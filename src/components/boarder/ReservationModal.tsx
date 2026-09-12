import { motion } from 'framer-motion'
import { ArrowLeft, CalendarClock, CheckCircle2, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useCreateReservation } from '../../lib/hooks'
import { cn, peso, prettyDate } from '../../lib/utils'
import type { HouseCard, PublicRoom } from '../../lib/api'
import { Modal } from '../ui'

const DURATIONS = [1, 3, 6, 12]

const ROOM_TYPE_LABEL: Record<string, string> = {
  bedspace: 'Bedspace',
  single: 'Single room',
  double: 'Double room',
  studio: 'Studio',
}

/**
 * Boarder reservation REQUEST flow:
 *   select room -> review -> submit -> PENDING (owner approves / declines).
 * BoardEase never processes an online payment here.
 */
export default function ReservationModal({
  open,
  onClose,
  house,
  rooms,
}: {
  open: boolean
  onClose: () => void
  house: HouseCard | null
  rooms: PublicRoom[]
}) {
  const { user } = useAuth()
  const userId = user?.id?.toString()
  const createReservation = useCreateReservation(userId)

  const availableRooms = rooms.filter((r) => r.available > 0)
  const today = new Date().toISOString().slice(0, 10)

  const [step, setStep] = useState<'form' | 'review' | 'success'>('form')
  const [roomId, setRoomId] = useState<string>('')
  const [moveInDate, setMoveInDate] = useState(today)
  const [duration, setDuration] = useState<number>(6)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Reset whenever a new shopping session opens.
  useEffect(() => {
    if (open) {
      setStep('form')
      setRoomId('')
      setMoveInDate(today)
      setDuration(6)
      setMessage('')
      setError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!house) return null

  const selectedRoom = availableRooms.find((r) => r.id === roomId) ?? null
  const monthlyRate = selectedRoom?.monthlyRent ?? house.monthlyRent

  const goToReview = () => {
    if (!moveInDate) {
      setError('Please choose your preferred move-in date.')
      return
    }
    if (moveInDate < today) {
      setError('Move-in date cannot be in the past.')
      return
    }
    if (availableRooms.length > 0 && !roomId) {
      setError('Please select an available room, or choose "Any available room".')
      return
    }
    setError('')
    setStep('review')
  }

  const submit = async () => {
    if (!userId) {
      setError('You need to be signed in as a boarder to request a reservation.')
      return
    }
    setError('')
    try {
      await createReservation.mutateAsync({
        userId,
        houseId: house.id,
        roomId: roomId || null,
        moveInDate,
        durationMonths: duration,
        message: message.trim() || undefined,
      })
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={step === 'success' ? 'Reservation Request' : `Request Reservation — ${house.name}`}>
      {step === 'form' && (
        <div className="space-y-5">
          <div>
            <label htmlFor="reserve-room" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-mut">
              Available room
            </label>
            {availableRooms.length === 0 ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-sm text-ink">
                This boarding house has no vacant beds right now. You can still send a request and the owner will decide
                whether anything opens up.
              </p>
            ) : (
              <div className="space-y-2">
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition',
                    roomId === '' ? 'border-brand-400 bg-brand-50/40' : 'border-slate-200 hover:border-brand-300',
                  )}
                >
                  <input type="radio" name="reserve-room" checked={roomId === ''} onChange={() => setRoomId('')} className="h-4 w-4 accent-brand-500" />
                  <span className="text-sm font-semibold text-navy-800">Any available room</span>
                </label>
                {availableRooms.map((r) => (
                  <label
                    key={r.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition',
                      roomId === r.id ? 'border-brand-400 bg-brand-50/40' : 'border-slate-200 hover:border-brand-300',
                    )}
                  >
                    <input
                      type="radio"
                      name="reserve-room"
                      checked={roomId === r.id}
                      onChange={() => setRoomId(r.id)}
                      className="mt-1 h-4 w-4 accent-brand-500"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-navy-800">
                        Room {r.roomNo} · {ROOM_TYPE_LABEL[r.type] ?? r.type}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink">
                        {peso(r.monthlyRent)}/month · {r.available} slot{r.available === 1 ? '' : 's'} available ·{' '}
                        {r.gender === 'mixed' ? 'Mixed' : r.gender === 'female' ? 'Female only' : 'Male only'}
                        {r.aircon ? ' · aircon' : ''}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reserve-date" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mut">
                Preferred move-in date <span className="text-danger">*</span>
              </label>
              <input
                id="reserve-date"
                type="date"
                min={today}
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label htmlFor="reserve-duration" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mut">
                Preferred duration
              </label>
              <select
                id="reserve-duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full cursor-pointer rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-navy-800 outline-none transition focus:border-brand-400"
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} month{d === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="reserve-message" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mut">
              Message to owner <span className="font-normal normal-case text-mut">(optional)</span>
            </label>
            <textarea
              id="reserve-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell the owner anything helpful, e.g. your course or when you can visit."
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{error}</p>}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-navy-800 transition hover:border-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={goToReview}
              className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Review request
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-surface p-5">
            <h4 className="text-sm font-bold uppercase tracking-wide text-mut">Review Reservation Request</h4>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-ink">Boarding house</dt>
                <dd className="text-right font-semibold text-navy-800">{house.name}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-ink">Room</dt>
                <dd className="text-right font-semibold text-navy-800">
                  {selectedRoom ? `Room ${selectedRoom.roomNo} (${ROOM_TYPE_LABEL[selectedRoom.type] ?? selectedRoom.type})` : 'Any available room'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-ink">Monthly rate</dt>
                <dd className="text-right font-semibold text-navy-800">{peso(monthlyRate)}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-ink">Preferred move-in date</dt>
                <dd className="text-right font-semibold text-navy-800">{prettyDate(moveInDate)}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-ink">Duration</dt>
                <dd className="text-right font-semibold text-navy-800">
                  {duration} month{duration === 1 ? '' : 's'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-ink">Message</dt>
                <dd className="max-w-[60%] text-right font-medium text-navy-800">{message.trim() || '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4">
            <CalendarClock size={16} className="mt-0.5 shrink-0 text-brand-500" />
            <p className="text-xs leading-relaxed text-ink">
              This sends a <span className="font-semibold text-navy-800">reservation request</span>. The owner will
              approve or decline it and you&apos;ll be notified. No payment is made here — rent is settled directly with
              the owner.
            </p>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{error}</p>}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setStep('form')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-navy-800 transition hover:border-slate-300"
            >
              <ArrowLeft size={15} /> Back
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={createReservation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              <Send size={15} /> {createReservation.isPending ? 'Submitting…' : 'Submit Reservation Request'}
            </button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="flex flex-col items-center py-4 text-center">
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-mint-50 text-mint-600"
          >
            <CheckCircle2 size={26} />
          </motion.span>
          <h4 className="mt-4 text-lg font-bold text-navy-800">Reservation request submitted.</h4>
          <p className="mt-1 text-sm text-ink">
            Status: <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-soft">PENDING</span>
          </p>
          <p className="mt-3 max-w-sm text-sm text-ink">
            {house.owner ? `${house.owner} will` : 'The owner will'} review your request at {house.name} and you will get
            a notification with the result.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              to="/boarder/reservations"
              onClick={onClose}
              className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              View My Reservations
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-navy-800 transition hover:border-slate-300"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
