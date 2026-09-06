import { motion } from 'framer-motion'
import { Check, Crown, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { PLANS } from '../../lib/api'
import { Spinner } from '../../components/ui'
import { useSubscription } from '../../lib/hooks'
import { cn, peso, prettyDate } from '../../lib/utils'

export default function Subscription() {
  const { data: current } = useSubscription()
  const [selected, setSelected] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const choose = (plan: string) => {
    setSelected(plan)
    setProcessing(true)
    setTimeout(() => setProcessing(false), 1200)
  }

  return (
    <div className="space-y-5">
      {/* Current plan */}
      {current && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-gradient-to-r from-navy-900 to-navy-700 p-6 text-white shadow-card">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-mint-400">
              <Crown size={22} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-mint-300">Current plan</p>
              <p className="text-xl font-extrabold">{current.plan} — {peso(current.price)}/{current.cycle}</p>
              <p className="text-xs text-navy-200">
                Renews {current.renewsOn ? prettyDate(current.renewsOn) : 'on renewal'} ·{' '}
                {current.boarderLimit ? `Supports up to ${current.boarderLimit} boarders` : 'Unlimited boarders'}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-mint-400/20 px-4 py-1.5 text-xs font-bold text-mint-300">● Active</span>
        </div>
      )}

      {/* Plans */}
      <div className="grid gap-5 lg:grid-cols-3">
        {PLANS.map((p, i) => {
          const isCurrent = current?.plan === p.plan
          const isPremium = p.plan === 'Premium'
          return (
            <motion.div
              key={p.plan}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -4 }}
              className={cn(
                'relative flex flex-col rounded-[22px] border bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover',
                isPremium ? 'border-brand-200 ring-2 ring-brand-100' : 'border-slate-100',
                isCurrent && 'border-mint-300 ring-2 ring-mint-100',
              )}
            >
              {isPremium && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-brand-500 to-mint-400 px-4 py-1 text-[11px] font-bold text-white shadow-lg">
                  <Sparkles size={11} /> MOST POPULAR
                </span>
              )}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-navy-800">{p.plan}</h3>
                {isCurrent && <span className="rounded-full bg-mint-50 px-2.5 py-1 text-[11px] font-bold text-mint-600">Current</span>}
              </div>
              <p className="mt-3">
                <span className="text-3xl font-extrabold text-navy-800">{peso(p.price)}</span>
                <span className="text-sm font-medium text-mut">/{p.cycle}</span>
              </p>
              <p className="mt-1 text-xs text-ink">
                {p.boarderLimit ? `For boarding houses with up to ${p.boarderLimit} boarders` : 'For boarding houses of any size'}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink">
                    <span className={cn('mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full', isPremium ? 'bg-brand-50 text-brand-500' : 'bg-mint-50 text-mint-600')}>
                      <Check size={11} strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => !isCurrent && choose(p.plan)}
                disabled={isCurrent || processing}
                className={cn(
                  'mt-6 w-full rounded-xl py-3 text-sm font-bold transition-all duration-300',
                  isCurrent
                    ? 'cursor-default border border-slate-200 text-mut'
                    : isPremium
                      ? 'bg-gradient-to-r from-brand-500 to-mint-400 text-white shadow-[0_10px_24px_rgb(30_115_232/0.35)] hover:shadow-[0_12px_28px_rgb(30_115_232/0.45)]'
                      : 'border border-navy-800 text-navy-800 hover:bg-navy-800 hover:text-white',
                )}
              >
                {isCurrent ? 'Your plan' : processing && selected === p.plan ? 'Processing…' : p.cycle === 'year' ? `Upgrade to ${p.plan}` : `Choose ${p.plan}`}
              </button>
            </motion.div>
          )
        })}
      </div>

      {processing && (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-brand-50 p-4 text-sm font-semibold text-brand-500">
          <Spinner className="h-4 w-4" /> Processing your plan change… (demo)
        </div>
      )}

      <p className="text-center text-xs text-mut">
        Payments are processed securely via <span className="font-semibold text-navy-800">PayLink</span> & GCash. Cancel anytime.
      </p>
    </div>
  )
}
