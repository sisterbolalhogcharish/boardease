import { motion } from 'framer-motion'
import { CreditCard, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, PaymentBadge, Skeleton } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { useBoarderPayments } from '../../lib/hooks'
import { peso, prettyDate } from '../../lib/utils'

export default function BoarderPayments() {
  const { user } = useAuth()
  const { data: payments, isLoading } = useBoarderPayments(user?.id?.toString())

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-[18px]" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-[18px]" />
      </div>
    )
  }

  const list = payments ?? []

  if (list.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={<CreditCard size={22} />}
          title="No payment records yet"
          subtitle="Once your landlord records a rent payment for your accommodation, it will appear here."
        />
        <div className="flex justify-center">
          <Link
            to="/boarder"
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-500"
          >
            Back to My Home
          </Link>
        </div>
      </div>
    )
  }

  const settled = list.filter((p) => p.status === 'paid' || p.status === 'late')
  const totalPaid = settled.reduce((s, p) => s + p.amount, 0)
  const onTime = list.filter((p) => p.status === 'paid').length
  const next = [...list]
    .filter((p) => p.status === 'pending' || p.status === 'overdue' || p.status === 'late')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]

  const onTimeRate = list.length ? Math.round((onTime / list.length) * 1000) / 10 : 0

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card"
        >
          <p className="text-xs font-medium text-mut">Total recorded as paid</p>
          <p className="mt-1 text-2xl font-extrabold text-navy-800">{peso(totalPaid)}</p>
          <p className="mt-0.5 text-[11px] text-mut">{settled.length} payment{settled.length === 1 ? '' : 's'}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={
            next && next.status === 'overdue'
              ? 'rounded-[18px] border border-red-100 bg-red-50/50 p-5 shadow-card'
              : 'rounded-[18px] border border-amber-100 bg-amber-50/50 p-5 shadow-card'
          }
        >
          <p className="text-xs font-medium text-mut">Next payment due</p>
          {next ? (
            <>
              <p className="mt-1 text-2xl font-extrabold text-amber-soft">{peso(next.amount)}</p>
              <p className="mt-0.5 text-[11px] text-mut">Due {prettyDate(next.dueDate)}</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-2xl font-extrabold text-mint-600">None</p>
              <p className="mt-0.5 text-[11px] text-mut">No upcoming payment scheduled</p>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[18px] border border-mint-100 bg-mint-50/50 p-5 shadow-card"
        >
          <p className="text-xs font-medium text-mut">On-time rate</p>
          <p className="mt-1 text-2xl font-extrabold text-mint-600">{onTimeRate}%</p>
          <p className="mt-0.5 text-[11px] text-mut">
            {onTime} of {list.length} payments on time
          </p>
        </motion.div>
      </div>

      <div className="flex items-start gap-2 rounded-[18px] border border-slate-100 bg-white p-4 text-xs text-ink shadow-card">
        <Info size={14} className="mt-0.5 shrink-0 text-brand-500" />
        Payment records are view-only and maintained by your landlord. BoardEase does not process online payments — no
        GCash, card or bank checkout.
      </div>

      {/* Payment list */}
      <div className="rounded-[18px] border border-slate-100 bg-white shadow-card">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="font-bold text-navy-800">Payment History</h3>
          <p className="text-xs text-mut">Your own records only</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-surface text-xs font-semibold uppercase tracking-wider text-mut">
                <th className="px-6 py-3">Month</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3">Due date</th>
                <th className="px-6 py-3">Paid date</th>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-slate-50 transition hover:bg-surface/60"
                >
                  <td className="px-6 py-3.5 font-semibold text-navy-800">{p.label}</td>
                  <td className="px-6 py-3.5 text-right font-bold text-navy-800">{peso(p.amount)}</td>
                  <td className="px-6 py-3.5 text-ink">{p.dueDate ? prettyDate(p.dueDate) : '—'}</td>
                  <td className="px-6 py-3.5 text-ink">{p.paidDate ? prettyDate(p.paidDate) : '—'}</td>
                  <td className="px-6 py-3.5 text-ink">{p.method ?? '—'}</td>
                  <td className="px-6 py-3.5 text-right">
                    <PaymentBadge status={p.status} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
