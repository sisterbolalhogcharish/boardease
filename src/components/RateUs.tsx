import { motion } from 'framer-motion'
import { Quote, Send, Star } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { useMyPlatformReview, useSavePlatformReview } from '../lib/hooks'
import { cn } from '../lib/utils'

/**
 * "Rate us" — a short star + comment form shown in both the landlord and the
 * boarder dashboard. Whatever is submitted here is what the landing page's
 * testimonials section reads, so the home page always shows real feedback
 * instead of hardcoded quotes. One rating per account: sending again updates it.
 */
export default function RateUs() {
  const { user } = useAuth()
  const userId = user?.id?.toString()
  const { data: existing } = useMyPlatformReview(userId)
  const saveReview = useSavePlatformReview(userId)

  // Local edits win, otherwise the form mirrors what this account already sent.
  // (Avoids copying query data into state with an effect.)
  const [draft, setDraft] = useState<{ rating: number; comment: string } | null>(null)
  const rating = draft?.rating ?? existing?.rating ?? 0
  const comment = draft?.comment ?? existing?.comment ?? ''
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!userId) {
      setError('Please sign in again to send your feedback.')
      return
    }
    if (rating < 1) {
      setError('Please tap a star to rate BoardEase.')
      return
    }
    if (!comment.trim()) {
      setError('Please tell us a little about your experience.')
      return
    }
    setError('')
    setNotice('')
    try {
      const res = await saveReview.mutateAsync({ userId, rating, comment: comment.trim() })
      // Drop the draft so the form re-reads the saved row.
      setDraft(null)
      setNotice(res.updated ? 'Your feedback was updated — thank you!' : 'Thank you! Your feedback was sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your feedback. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
            <Quote size={20} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-navy-800">Rate us</h2>
            <p className="mt-1 text-sm text-ink">
              How is BoardEase working for you? Your rating and comment can appear on our home page to help other
              boarders and landlords.
            </p>
          </div>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={submit}
          className="mt-6 space-y-4"
        >
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mut">
              Your rating <span className="text-danger">*</span>
            </span>
            <div className="flex gap-1" role="radiogroup" aria-label="BoardEase rating">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={rating === s}
                  aria-label={`${s} star${s === 1 ? '' : 's'}`}
                  onClick={() => setDraft({ rating: s, comment })}
                  className="rounded-md p-0.5 transition hover:scale-110"
                >
                  <Star
                    size={30}
                    className={cn('fill-current transition-colors', s <= rating ? 'text-amber-400' : 'text-slate-300')}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="rate-us-comment" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mut">
              Your comment <span className="text-danger">*</span>
            </label>
            <textarea
              id="rate-us-comment"
              rows={4}
              maxLength={600}
              value={comment}
              onChange={(e) => setDraft({ rating, comment: e.target.value })}
              placeholder="Tell us what BoardEase makes easier for you…"
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {existing && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-soft">
              You already rated BoardEase {existing.rating} star{existing.rating === 1 ? '' : 's'} — sending again updates
              your feedback.
            </p>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{error}</p>}
          {notice && <p className="rounded-lg bg-mint-50 px-3 py-2 text-sm font-medium text-mint-600">{notice}</p>}

          <button
            type="submit"
            disabled={saveReview.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            <Send size={15} />
            {saveReview.isPending ? 'Sending…' : existing ? 'Update feedback' : 'Send feedback'}
          </button>
        </motion.form>
      </div>
    </div>
  )
}
