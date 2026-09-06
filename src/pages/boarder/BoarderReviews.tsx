import { motion } from 'framer-motion'
import { Star, Send, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Rating } from '../../components/ui'
import { prettyDate } from '../../lib/utils'

const MY_REVIEW = {
  rating: 5,
  comment: 'Maayos kaayo ang boarding house. Limpyo ang CR, kusog ang WiFi, ug grabe ka accommodating si Ma\'am Rosario. Sulit kaayo ang 2,500!',
  date: '2026-07-28',
  categories: { cleanliness: 5, safety: 5, comfort: 5, internet: 5, owner: 5, location: 4, value: 5 },
}

const CATEGORY_LABELS = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'safety', label: 'Safety' },
  { key: 'comfort', label: 'Comfort' },
  { key: 'internet', label: 'Internet' },
  { key: 'owner', label: 'Owner' },
  { key: 'location', label: 'Location' },
  { key: 'value', label: 'Value' },
] as const

export default function BoarderReviews() {
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      {/* My review */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-navy-800">My Review — Sunset Boarding House</h3>
          <Rating value={MY_REVIEW.rating} size={18} />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink">"{MY_REVIEW.comment}"</p>
        <p className="mt-2 text-xs text-mut">{prettyDate(MY_REVIEW.date)}</p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CATEGORY_LABELS.map((c) => (
            <div key={c.key} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2">
              <span className="text-xs font-medium text-ink">{c.label}</span>
              <span className="text-sm font-bold text-navy-800">{MY_REVIEW.categories[c.key]}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Landlord reply */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-[18px] border border-mint-100 bg-mint-50/50 p-5"
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-mint-600" />
          <p className="text-xs font-bold uppercase tracking-wide text-mint-600">Owner reply</p>
        </div>
        <p className="mt-2 text-sm text-ink">Salamat Jessa! Always welcome ka diri. 😊</p>
      </motion.div>

      {/* Write a new review */}
      {!submitted ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-navy-800">Write a New Review</h3>
            <button
              onClick={() => setShowForm((s) => !s)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:border-brand-300 hover:text-brand-500"
            >
              {showForm ? 'Cancel' : 'Write review'}
            </button>
          </div>

          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleSubmit}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-mut">Overall rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" className="text-slate-300 transition hover:text-amber-400">
                      <Star size={24} className="fill-current" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mut">Your review</label>
                <textarea
                  rows={4}
                  placeholder="Share your experience..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                <Send size={14} /> Submit review
              </button>
            </motion.form>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[18px] border border-mint-200 bg-mint-50 p-8 text-center"
        >
          <span className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-mint-100 text-mint-600">
            <Star size={22} />
          </span>
          <h3 className="mt-4 text-lg font-bold text-navy-800">Review submitted!</h3>
          <p className="mt-1 text-sm text-ink">Thank you for sharing your experience.</p>
        </motion.div>
      )}
    </div>
  )
}
