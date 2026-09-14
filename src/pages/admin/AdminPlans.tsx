import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { PLANS } from '../../lib/api'
import { cn, peso } from '../../lib/utils'


export default function AdminPlans() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-navy-800">Subscription Plans</h2>
        <p className="mt-1 text-sm text-ink">
          These are the plans available to landlords. Plans are activated by admin approval of payment receipts.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {PLANS.map((p, i) => {
          const isFeatured = p.plan === 'Standard'
          return (
            <motion.div
              key={p.plan}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={cn(
                'relative flex flex-col rounded-[22px] border p-6 transition-shadow duration-300',
                isFeatured
                  ? 'border-navy-700 bg-gradient-to-b from-navy-900 to-navy-800 shadow-card-hover md:-my-4 md:h-[calc(100%+2rem)]'
                  : 'border-slate-100 bg-white shadow-card',
              )}
            >
              {isFeatured && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-brand-500 to-mint-400 px-4 py-1.5 text-[11px] font-bold text-white shadow-lg">
                  <Sparkles size={11} /> MOST POPULAR
                </span>
              )}
              <h3 className={cn('text-xs font-bold uppercase tracking-[0.14em]', isFeatured ? 'text-mint-300' : 'text-navy-500')}>
                {p.plan}
              </h3>
              <p className="mt-4 flex items-baseline gap-1">
                <span className={cn('text-4xl font-extrabold tracking-tight', isFeatured ? 'text-white' : 'text-navy-800')}>
                  {peso(p.price)}
                </span>
                <span className={cn('text-sm font-medium', isFeatured ? 'text-navy-200' : 'text-mut')}>/{p.cycle}</span>
              </p>
              <p className={cn('mt-1 text-xs', isFeatured ? 'text-navy-200' : 'text-ink')}>
                {p.boarderLimit ? `Up to ${p.boarderLimit} boards` : 'Unlimited boards'}
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
            </motion.div>
          )
        })}
      </div>

      <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
        <h3 className="font-bold text-navy-800">How Plan Activation Works</h3>
        <ol className="mt-3 space-y-2 text-sm text-ink">
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-500">1</span>
            Landlord selects a plan on their Subscription page.
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-500">2</span>
            Landlord pays via GCash or PayLink and uploads a payment receipt.
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-500">3</span>
            Admin reviews the receipt in the Payment Receipts tab and approves or rejects it.
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-500">4</span>
            On approval, the landlord's plan is activated and their dashboard unlocks the corresponding features.
          </li>
        </ol>
      </div>
    </div>
  )
}

