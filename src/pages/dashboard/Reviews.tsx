import { motion } from 'framer-motion'
import { MessageSquareReply, Star } from 'lucide-react'
import { useState } from 'react'
import { Rating, Spinner } from '../../components/ui'
import { useReviews } from '../../lib/hooks'
import { cn, prettyDate } from '../../lib/utils'
import type { ReviewRating } from '../../server/types'

const CATEGORIES: { key: keyof ReviewRating; label: string }[] = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'safety', label: 'Safety' },
  { key: 'comfort', label: 'Comfort' },
  { key: 'internet', label: 'Internet' },
  { key: 'owner', label: 'Owner' },
  { key: 'location', label: 'Location' },
  { key: 'value', label: 'Value' },
]

export default function Reviews() {
  const { data: reviews, isLoading } = useReviews('sunset')
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  if (isLoading || !reviews) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-7 w-7 text-brand-500" />
      </div>
    )
  }

  const overall = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const averages = {} as Record<keyof ReviewRating, number>
  CATEGORIES.forEach((c) => {
    averages[c.key] = reviews.length ? reviews.reduce((s, r) => s + r.categories[c.key], 0) / reviews.length : 0
  })
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }))

  const submitReply = (id: string) => {
    if (!draft.trim()) return
    setReplies((prev) => ({ ...prev, [id]: draft }))
    setDraft('')
    setReplyingTo(null)
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-[18px] border border-slate-100 bg-white p-6 text-center shadow-card">
          <p className="text-5xl font-extrabold text-navy-800">{overall.toFixed(1)}</p>
          <div className="mt-2 flex justify-center">
            <Rating value={overall} size={18} />
          </div>
          <p className="mt-2 text-sm text-ink">{reviews.length} reviews for Sunset Boarding House</p>
          <div className="mt-5 space-y-1.5">
            {distribution.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-xs">
                <span className="flex w-8 items-center gap-0.5 font-semibold text-ink">
                  {d.star} <Star size={10} className="fill-amber-400 text-amber-400" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.count / reviews.length) * 100}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-mint-400"
                  />
                </div>
                <span className="w-6 text-right text-mut">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
          <h3 className="font-bold text-navy-800">Category breakdown</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
              <div key={c.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{c.label}</span>
                  <span className="font-bold text-navy-800">{averages[c.key].toFixed(1)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(averages[c.key] / 5) * 100}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-mint-400"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Review list */}
      <div className="space-y-4">
        {reviews.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: r.avatarColor }}>
                  {r.author.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                </span>
                <div>
                  <p className="text-sm font-bold text-navy-800">{r.author}</p>
                  <p className="text-xs text-mut">{prettyDate(r.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Rating value={r.rating} />
                <span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-bold text-navy-800">{r.rating.toFixed(1)}</span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink">{r.comment}</p>

            {(r.reply || replies[r.id]) && (
              <div className="mt-3 rounded-xl bg-mint-50/70 p-3 text-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-mint-600">Your reply</p>
                <p className="mt-1 text-ink">{replies[r.id] ?? r.reply}</p>
              </div>
            )}

            <div className="mt-3">
              {replyingTo === r.id ? (
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a public reply…"
                    autoFocus
                    className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    onClick={() => submitReply(r.id)}
                    className="rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    Post
                  </button>
                  <button onClick={() => setReplyingTo(null)} className="rounded-xl border border-slate-200 px-3 text-sm font-semibold text-ink transition hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              ) : (
                !(r.reply || replies[r.id]) && (
                  <button
                    onClick={() => {
                      setReplyingTo(r.id)
                      setDraft('')
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-bold transition',
                      'text-brand-500 hover:text-brand-600',
                    )}
                  >
                    <MessageSquareReply size={13} /> Reply as landlord
                  </button>
                )
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
