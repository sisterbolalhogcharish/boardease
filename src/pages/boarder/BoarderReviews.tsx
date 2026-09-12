import { motion } from 'framer-motion'
import { MessageCircle, Pencil, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, Rating, Skeleton } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { useAccommodation, useBoarderReviews, useHouses, useSaveReview } from '../../lib/hooks'
import { cn, prettyDate } from '../../lib/utils'
import type { BoarderReview } from '../../lib/api'

const CATEGORY_LABELS: { key: keyof BoarderReview['categories']; label: string }[] = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'safety', label: 'Safety' },
  { key: 'comfort', label: 'Comfort' },
  { key: 'internet', label: 'Internet' },
  { key: 'owner', label: 'Owner' },
  { key: 'location', label: 'Location' },
  { key: 'value', label: 'Value' },
]

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Overall rating">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          aria-label={`${s} star${s === 1 ? '' : 's'}`}
          onClick={() => onChange(s)}
          className="rounded-md p-0.5 transition hover:scale-110"
        >
          <Star size={26} className={cn('fill-current transition-colors', s <= value ? 'text-amber-400' : 'text-slate-300')} />
        </button>
      ))}
    </div>
  )
}

export default function BoarderReviews() {
  const { user } = useAuth()
  const userId = user?.id?.toString()
  const { data: reviews, isLoading } = useBoarderReviews(userId)
  const { data: houses } = useHouses()
  const { data: accommodation } = useAccommodation(userId)
  const saveReview = useSaveReview(userId)

  const [open, setOpen] = useState(false)
  const [houseId, setHouseId] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const list = useMemo(() => reviews ?? [], [reviews])

  const existingForHouse = list.find((r) => r.houseId === houseId)

  const startWrite = (review?: BoarderReview) => {
    setError('')
    setNotice('')
    if (review) {
      setHouseId(review.houseId)
      setRating(review.rating)
      setComment(review.comment)
    } else {
      setHouseId(accommodation?.houseId ?? '')
      setRating(0)
      setComment('')
    }
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!houseId) {
      setError('Please choose the boarding house you are reviewing.')
      return
    }
    if (rating < 1) {
      setError('Please give an overall rating from 1 to 5 stars.')
      return
    }
    if (!comment.trim()) {
      setError('Please write a short review.')
      return
    }
    setError('')
    try {
      const res = await saveReview.mutateAsync({ userId: userId!, houseId, rating, comment: comment.trim() })
      setNotice(res.updated ? 'Your review was updated.' : 'Review submitted — thank you for sharing!')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your review. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-[18px]" />
        <Skeleton className="h-48 rounded-[18px]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-slate-100 bg-white p-5 shadow-card">
        <div>
          <p className="text-sm font-bold text-navy-800">
            {list.length} review{list.length === 1 ? '' : 's'} written
          </p>
          <p className="text-xs text-ink">
            Reviews are tied to your account — you can edit your own review any time.
            {accommodation ? ` You currently stay at ${accommodation.houseName}.` : ''}
          </p>
        </div>
        <button
          onClick={() => startWrite()}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          <Pencil size={14} /> Write a review
        </button>
      </div>

      {notice && <p className="rounded-lg bg-mint-50 px-3 py-2 text-sm font-medium text-mint-600">{notice}</p>}

      {/* Write / edit form */}
      {open && (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={submit}
          className="space-y-4 rounded-[18px] border border-slate-100 bg-white p-6 shadow-card"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-navy-800">{existingForHouse ? 'Edit your review' : 'Write a New Review'}</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:border-slate-300"
            >
              Cancel
            </button>
          </div>

          <div>
            <label htmlFor="review-house" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mut">
              Boarding house <span className="text-danger">*</span>
            </label>
            <select
              id="review-house"
              value={houseId}
              onChange={(e) => {
                setHouseId(e.target.value)
                const existing = list.find((r) => r.houseId === e.target.value)
                setRating(existing?.rating ?? 0)
                setComment(existing?.comment ?? '')
              }}
              className="w-full cursor-pointer rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-navy-800 outline-none transition focus:border-brand-400"
            >
              <option value="">Select a boarding house…</option>
              {(houses ?? []).map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} — {h.barangay}, {h.municipality}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mut">
              Overall rating <span className="text-danger">*</span>
            </span>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <div>
            <label htmlFor="review-comment" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mut">
              Your review <span className="text-danger">*</span>
            </label>
            <textarea
              id="review-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience staying here…"
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {existingForHouse && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-soft">
              You already reviewed this house — submitting will update your existing review.
            </p>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{error}</p>}

          <button
            type="submit"
            disabled={saveReview.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {saveReview.isPending ? 'Saving…' : existingForHouse ? 'Update review' : 'Submit review'}
          </button>
        </motion.form>
      )}

      {/* My reviews */}
      {list.length === 0 ? (
        <EmptyState
          icon={<Star size={22} />}
          title="No reviews yet."
          subtitle="Share your experience with a boarding house to help other boarders in Siquijor."
        />
      ) : (
        <div className="space-y-4">
          {list.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link to={`/houses/${r.houseId}`} className="text-lg font-bold text-navy-800 hover:text-brand-500">
                    {r.houseName}
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <Rating value={r.rating} size={15} />
                    <span className="text-xs text-mut">{prettyDate(r.date)}</span>
                  </div>
                </div>
                <button
                  onClick={() => startWrite(r)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:border-brand-300 hover:text-brand-500"
                >
                  <Pencil size={12} /> Edit my review
                </button>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-ink">“{r.comment}”</p>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CATEGORY_LABELS.map((c) => (
                  <div key={c.key} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2">
                    <span className="text-xs font-medium text-ink">{c.label}</span>
                    <span className="text-sm font-bold text-navy-800">{r.categories[c.key]}</span>
                  </div>
                ))}
              </div>

              {r.reply && (
                <div className="mt-4 rounded-xl border border-mint-100 bg-mint-50/60 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-mint-600">
                    <MessageCircle size={13} /> Owner reply
                  </p>
                  <p className="mt-1.5 text-sm text-ink">{r.reply}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
