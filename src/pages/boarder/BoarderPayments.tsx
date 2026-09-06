import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import { PaymentBadge } from '../../components/ui'
import { peso } from '../../lib/utils'

const MOCK_PAYMENTS = [
  { id: 'p1', month: 'August 2026', amount: 1500, dueDate: '2026-08-01', paidDate: null, status: 'pending' as const, method: null, reference: null },
  { id: 'p2', month: 'July 2026', amount: 1500, dueDate: '2026-07-01', paidDate: '2026-07-02', status: 'paid' as const, method: 'GCash', reference: 'GC-847291' },
  { id: 'p3', month: 'June 2026', amount: 1500, dueDate: '2026-06-01', paidDate: '2026-06-03', status: 'paid' as const, method: 'GCash', reference: 'GC-832156' },
  { id: 'p4', month: 'May 2026', amount: 1500, dueDate: '2026-05-01', paidDate: '2026-05-01', status: 'paid' as const, method: 'Cash', reference: null },
  { id: 'p5', month: 'April 2026', amount: 1500, dueDate: '2026-04-01', paidDate: '2026-04-05', status: 'late' as const, method: 'GCash', reference: 'GC-791024' },
  { id: 'p6', month: 'March 2026', amount: 1500, dueDate: '2026-03-01', paidDate: '2026-03-01', status: 'paid' as const, method: 'PayLink', reference: 'PL-502931' },
  { id: 'p7', month: 'February 2026', amount: 1500, dueDate: '2026-02-01', paidDate: '2026-02-02', status: 'paid' as const, method: 'GCash', reference: 'GC-781452' },
  { id: 'p8', month: 'January 2026', amount: 1500, dueDate: '2026-01-01', paidDate: '2026-01-01', status: 'paid' as const, method: 'Cash', reference: null },
]

export default function BoarderPayments() {
  const totalPaid = MOCK_PAYMENTS.filter((p) => p.status === 'paid' || p.status === 'late').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card"
        >
          <p className="text-xs font-medium text-mut">Total paid this year</p>
          <p className="mt-1 text-2xl font-extrabold text-navy-800">{peso(totalPaid)}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[18px] border border-amber-100 bg-amber-50/50 p-5 shadow-card"
        >
          <p className="text-xs font-medium text-mut">Next payment due</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-soft">{peso(1500)}</p>
          <p className="text-xs text-mut">Due Aug 1, 2026</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[18px] border border-mint-100 bg-mint-50/50 p-5 shadow-card"
        >
          <p className="text-xs font-medium text-mut">On-time rate</p>
          <p className="mt-1 text-2xl font-extrabold text-mint-600">87.5%</p>
          <p className="text-xs text-mut">7 of 8 payments on time</p>
        </motion.div>
      </div>

      {/* Payment list */}
      <div className="rounded-[18px] border border-slate-100 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-bold text-navy-800">Payment History</h3>
          <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:border-brand-300 hover:text-brand-500">
            <Download size={13} /> Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
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
              {MOCK_PAYMENTS.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-slate-50 transition hover:bg-surface/60"
                >
                  <td className="px-6 py-3.5 font-semibold text-navy-800">{p.month}</td>
                  <td className="px-6 py-3.5 text-right font-bold text-navy-800">{peso(p.amount)}</td>
                  <td className="px-6 py-3.5 text-ink">{p.dueDate}</td>
                  <td className="px-6 py-3.5 text-ink">{p.paidDate ?? '—'}</td>
                  <td className="px-6 py-3.5 text-ink">{p.method ?? '—'}</td>
                  <td className="px-6 py-3.5 text-right"><PaymentBadge status={p.status} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
