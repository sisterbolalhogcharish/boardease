import { AnimatePresence, motion } from 'framer-motion'
import { Check, Clock, Crown, FileText, Sparkles, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PLANS } from '../../lib/api'
import PaymentModal from '../../components/dashboard/PaymentModal'
import { useLandlordHouse } from '../../lib/landlordHouse'
import { useSubmitSubscriptionReceipt, useSubscription, useSubscriptionReceipts } from '../../lib/hooks'
import { cn, peso, prettyDate } from '../../lib/utils'

export default function Subscription() {
  const { data: current } = useSubscription()
  const { userId } = useLandlordHouse()
  // Statuses come from the server, so an admin approval or rejection shows up
  // here instead of only existing in this tab's memory.
  const { data: receipts } = useSubscriptionReceipts()
  const submitReceipt = useSubmitSubscriptionReceipt()

  const [selected, setSelected] = useState<string | null>(null)
  // GCash instructions + receipt uploader, shown when a plan is chosen.
  const [payOpen, setPayOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const selectedPlan = selected ? PLANS.find((p) => p.plan.toLowerCase() === selected) ?? null : null
  const latest = receipts?.[0] ?? null
  const pendingReceipt = latest?.status === 'pending' ? latest : null
  const rejectedReceipt = latest?.status === 'rejected' ? latest : null

  const choosePlan = (plan: string) => {
    setSelected(plan)
    setSent(false)
    setError('')
    setPayOpen(true)
  }

  const closeModal = () => {
    setPayOpen(false)
    setSent(false)
    setError('')
  }

  const handleSubmitReceipt = async (receiptUrl: string) => {
    if (!userId || !selected) return
    setError('')
    try {
      await submitReceipt.mutateAsync({ userId, plan: selected, receiptUrl })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your receipt. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Current plan banner. "None" means no subscription yet, and rendering
          that as "None — ₱0/month" reads like an error, so skip it. */}
      {current && current.plan !== 'None' && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-gradient-to-r from-navy-900 to-navy-700 p-6 text-white shadow-card">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-mint-400">
              <Crown size={22} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-mint-300">Current plan</p>
              <p className="text-xl font-extrabold">{current.plan} — {peso(current.price)}/{current.cycle}</p>
              <p className="text-xs text-navy-200">
                {current.renewsOn ? `Renews ${prettyDate(current.renewsOn)}` : 'Billed monthly'} ·{' '}
                {current.boarderLimit ? `Supports up to ${current.boarderLimit} boarders` : 'Unlimited boarders'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/subscription/history"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              <FileText size={13} /> Payment history
            </Link>
            <span className="rounded-full bg-mint-400/20 px-4 py-1.5 text-xs font-bold text-mint-300">● Active</span>
          </div>
        </div>
      )}

      {/* Awaiting verification */}
      <AnimatePresence>
        {pendingReceipt && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-[18px] border border-amber-200 bg-amber-50 p-5"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Clock size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-amber-900">Receipt submitted — waiting for admin approval</p>
                <p className="mt-1 text-sm text-amber-700">
                  Your receipt for the{' '}
                  <strong>{pendingReceipt.requestedPlan.charAt(0).toUpperCase() + pendingReceipt.requestedPlan.slice(1)}</strong>{' '}
                  plan ({peso(pendingReceipt.planPrice)}/month) is with the admin. You'll be notified once it's verified.
                </p>
                <img
                  src={pendingReceipt.receiptUrl}
                  alt="Submitted receipt"
                  className="mt-3 h-16 w-16 rounded-lg bg-white object-contain ring-2 ring-amber-200"
                />
              </div>
              <Link
                to="/dashboard/subscription/history"
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-amber-700 underline-offset-2 hover:underline"
              >
                History
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejected — tell them and let them try again */}
      <AnimatePresence>
        {rejectedReceipt && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-[18px] border border-red-200 bg-red-50 p-5"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-danger">
                <XCircle size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-danger">Your last receipt was rejected</p>
                <p className="mt-1 text-sm text-ink">
                  The {rejectedReceipt.requestedPlan} plan payment could not be verified.
                  {rejectedReceipt.notes ? ` Reason: ${rejectedReceipt.notes}` : ' Please upload a clearer receipt.'}
                </p>
              </div>
              <Link
                to="/dashboard/subscription/history"
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-danger underline-offset-2 hover:underline"
              >
                History
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan cards */}
      <div className="grid gap-5 lg:grid-cols-3">
        {PLANS.map((p, i) => {
          const isCurrent = current?.plan === p.plan
          const isFeatured = p.plan === 'Standard'
          const isPendingSelection = selected === p.plan.toLowerCase()
          return (
            <motion.div
              key={p.plan}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -4 }}
              className={cn(
                'relative flex flex-col rounded-[22px] border p-6 transition-shadow duration-300',
                isFeatured
                  ? 'border-navy-700 bg-gradient-to-b from-navy-900 to-navy-800 shadow-card-hover md:-my-4 md:h-[calc(100%+2rem)]'
                  : 'border-slate-100 bg-white shadow-card hover:shadow-card-hover',
                isCurrent && !isFeatured && 'border-mint-300 ring-2 ring-mint-100',
                isPendingSelection && !isFeatured && 'ring-2 ring-brand-400',
              )}
            >
              {isFeatured && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-brand-500 to-mint-400 px-4 py-1.5 text-[11px] font-bold text-white shadow-lg">
                  <Sparkles size={11} /> MOST POPULAR
                </span>
              )}
              <div className="flex items-center justify-between">
                <h3 className={cn('text-xs font-bold uppercase tracking-[0.14em]', isFeatured ? 'text-mint-300' : 'text-navy-500')}>
                  {p.plan}
                </h3>
                {isCurrent && (
                  <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', isFeatured ? 'bg-white/15 text-mint-300' : 'bg-mint-50 text-mint-600')}>
                    Current
                  </span>
                )}
              </div>
              <p className="mt-4 flex items-baseline gap-1">
                <span className={cn('text-4xl font-extrabold tracking-tight', isFeatured ? 'text-white' : 'text-navy-800')}>
                  {peso(p.price)}
                </span>
                <span className={cn('text-sm font-medium', isFeatured ? 'text-navy-200' : 'text-mut')}>/{p.cycle}</span>
              </p>
              <p className={cn('mt-1 text-xs', isFeatured ? 'text-navy-200' : 'text-ink')}>
                {p.boarderLimit ? `Manage up to ${p.boarderLimit} boards` : 'For boarding houses of any size'}
              </p>
              <ul className={cn('mt-6 flex-1 space-y-2.5 border-t pt-6', isFeatured ? 'border-white/10' : 'border-slate-100')}>
                {p.features.map((f) => (
                  <li key={f} className={cn('flex items-start gap-2.5 text-sm', isFeatured ? 'text-navy-100' : 'text-ink')}>
                    <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full', isFeatured ? 'bg-white/15 text-mint-300' : 'bg-brand-50 text-brand-500')}>
                      <Check size={11} strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => !isCurrent && choosePlan(p.plan.toLowerCase())}
                disabled={isCurrent}
                className={cn(
                  'mt-6 w-full rounded-xl py-3 text-sm font-bold transition-all duration-300',
                  isCurrent
                    ? isFeatured ? 'cursor-default bg-white/10 text-navy-200' : 'cursor-default border border-slate-200 text-mut'
                    : isFeatured
                      ? 'bg-gradient-to-r from-brand-500 to-mint-400 text-white shadow-[0_10px_24px_rgb(30_115_232/0.4)] hover:-translate-y-0.5'
                      : 'border border-navy-800 text-navy-800 hover:bg-navy-800 hover:text-white',
                )}
              >
                {isCurrent ? 'Your plan' : 'Choose ' + p.plan}
              </button>
            </motion.div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-center text-xs text-mut">
        <p>
          Landlord plans are billed monthly — upgrade, downgrade, or cancel anytime. Payments via{' '}
          <span className="font-semibold text-navy-800">GCash</span>. Upload your receipt and wait for admin approval.
        </p>
        <Link
          to="/dashboard/subscription/history"
          className="inline-flex items-center gap-1.5 font-semibold text-brand-500 transition hover:text-brand-600"
        >
          <FileText size={13} /> Payment history &amp; support
        </Link>
      </div>

      {/* GCash instructions + receipt upload, opened by "Choose <plan>". */}
      <PaymentModal
        open={payOpen}
        onClose={closeModal}
        planName={selectedPlan?.plan ?? ''}
        planPrice={selectedPlan?.price ?? 0}
        submitting={submitReceipt.isPending}
        error={error}
        sent={sent}
        onSubmitReceipt={handleSubmitReceipt}
      />
    </div>
  )
}
