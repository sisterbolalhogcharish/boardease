import { motion } from 'framer-motion'
import { CheckCircle2, Download, QrCode, ReceiptText, Search, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState, Modal, PaymentBadge, Skeleton, Spinner } from '../../components/ui'
import { useMarkPaymentPaid, usePaymentMonths, usePayments } from '../../lib/hooks'
import { cn, peso, prettyDate } from '../../lib/utils'
import type { PaymentRow } from '../../lib/api'

const TABS = [
  { value: '', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'late', label: 'Late' },
] as const

const METHODS = ['GCash', 'Cash', 'Bank Transfer', 'PayLink']

export default function Payments() {
  const [tab, setTab] = useState<string>('')
  const [month, setMonth] = useState<string | undefined>(undefined)
  const [q, setQ] = useState('')
  const { data: months } = usePaymentMonths()
  const { data: payments, isLoading } = usePayments({ status: tab || undefined, month, q: q || undefined })
  const markPaid = useMarkPaymentPaid()

  const [payTarget, setPayTarget] = useState<PaymentRow | null>(null)
  const [method, setMethod] = useState('GCash')
  const [receipt, setReceipt] = useState<PaymentRow | null>(null)

  const summary = useMemo(() => {
    const list = payments ?? []
    const sum = (s: string) => list.filter((p) => p.status === s).reduce((a, p) => a + p.amount, 0)
    const count = (s: string) => list.filter((p) => p.status === s).length
    return {
      collected: sum('paid') + sum('late'),
      pending: sum('pending'),
      overdue: sum('overdue'),
      paidCount: count('paid') + count('late'),
    }
  }, [payments])

  const confirmPaid = () => {
    if (!payTarget) return
    markPaid.mutate(
      { id: payTarget.id, method },
      { onSuccess: (updated) => {
        setPayTarget(null)
        setReceipt(updated)
      } },
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[18px] border border-mint-100 bg-mint-50/50 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-mint-600">Collected</p>
          <p className="mt-1 text-2xl font-extrabold text-navy-800">{peso(summary.collected)}</p>
          <p className="mt-1 text-xs text-ink">{summary.paidCount} payment{summary.paidCount === 1 ? '' : 's'}</p>
        </div>
        <div className="rounded-[18px] border border-amber-100 bg-amber-50/50 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-soft">Pending</p>
          <p className="mt-1 text-2xl font-extrabold text-navy-800">{peso(summary.pending)}</p>
          <p className="mt-1 text-xs text-ink">due this period</p>
        </div>
        <div className="rounded-[18px] border border-red-100 bg-red-50/50 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-danger">Overdue</p>
          <p className="mt-1 text-2xl font-extrabold text-navy-800">{peso(summary.overdue)}</p>
          <p className="mt-1 text-xs text-ink">needs follow-up</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition',
                tab === t.value ? 'bg-navy-800 text-white' : 'text-ink hover:text-navy-800',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={month ?? ''}
          onChange={(e) => setMonth(e.target.value || undefined)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-navy-800 outline-none transition focus:border-brand-400"
        >
          <option value="">All months</option>
          {months?.map((m) => (
            <option key={m} value={m}>
              {new Date(m + '-02T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mut" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search boarder or room…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-96 rounded-[18px]" />
      ) : payments && payments.length > 0 ? (
        <div className="overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-mut">
                  <th className="px-5 py-3.5 font-semibold">Boarder</th>
                  <th className="px-5 py-3.5 font-semibold">Period</th>
                  <th className="px-5 py-3.5 font-semibold">Amount</th>
                  <th className="px-5 py-3.5 font-semibold">Due date</th>
                  <th className="px-5 py-3.5 font-semibold">Method</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.4) }}
                    className="border-b border-slate-50 transition hover:bg-surface"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-navy-800">{p.boarderName}</p>
                      <p className="text-xs text-mut">Room {p.roomNo}</p>
                    </td>
                    <td className="px-5 py-3.5 text-ink">{p.label}</td>
                    <td className="px-5 py-3.5 font-bold text-navy-800">{peso(p.amount)}</td>
                    <td className="px-5 py-3.5 text-ink">
                      {prettyDate(p.dueDate)}
                      {p.paidDate && <p className="text-xs text-mint-600">paid {prettyDate(p.paidDate)}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-ink">{p.method ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <PaymentBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {p.status === 'pending' || p.status === 'overdue' ? (
                        <button
                          onClick={() => {
                            setMethod('GCash')
                            setPayTarget(p)
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-mint-50 px-3 py-1.5 text-xs font-bold text-mint-600 transition hover:bg-mint-100"
                        >
                          <CheckCircle2 size={13} /> Mark as paid
                        </button>
                      ) : (
                        <button
                          onClick={() => setReceipt(p)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-brand-50 hover:text-brand-500"
                        >
                          <ReceiptText size={13} /> Receipt
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<Wallet size={22} />}
          title="No payments found"
          subtitle="Try changing the filters, or mark outstanding payments once collected."
        />
      )}

      {/* Mark as paid */}
      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title="Record payment">
        {payTarget && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface p-4">
              <p className="text-sm font-bold text-navy-800">{payTarget.boarderName}</p>
              <p className="text-xs text-ink">
                Room {payTarget.roomNo} · {payTarget.label} · Due {prettyDate(payTarget.dueDate)}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-navy-800">{peso(payTarget.amount)}</p>
            </div>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-ink">Payment method</span>
              <div className="grid grid-cols-2 gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={cn(
                      'rounded-xl border px-4 py-2.5 text-sm font-semibold transition',
                      method === m ? 'border-brand-500 bg-brand-50 text-brand-500' : 'border-slate-200 text-ink hover:border-brand-300',
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </label>
            <button
              onClick={confirmPaid}
              disabled={markPaid.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-mint-500 py-3 text-sm font-bold text-white transition hover:bg-mint-600 disabled:opacity-60"
            >
              {markPaid.isPending ? <Spinner className="h-4 w-4" /> : <CheckCircle2 size={16} />}
              Confirm payment
            </button>
            <p className="text-center text-[11px] text-mut">
              Dashboard, income, analytics, and the AI assistant update automatically.
            </p>
          </div>
        )}
      </Modal>

      {/* Receipt */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Digital receipt">
        {receipt && (
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between bg-gradient-to-r from-navy-900 to-navy-700 px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <QrCode size={16} />
                </span>
                <div>
                  <p className="text-sm font-bold">BoardEase Receipt</p>
                  <p className="text-[10px] text-navy-200">Sunset Boarding House</p>
                </div>
              </div>
              <span className="rounded-full bg-mint-400/20 px-3 py-1 text-[11px] font-bold text-mint-300">PAID</span>
            </div>
            <div className="space-y-3 p-5 text-sm">
              <div className="flex justify-between">
                <span className="text-mut">Boarder</span>
                <span className="font-bold text-navy-800">{receipt.boarderName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mut">Period</span>
                <span className="font-semibold text-navy-800">{receipt.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mut">Room</span>
                <span className="font-semibold text-navy-800">{receipt.roomNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mut">Method</span>
                <span className="font-semibold text-navy-800">{receipt.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mut">Reference</span>
                <span className="font-mono font-semibold text-brand-500">{receipt.reference}</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-slate-200 pt-3">
                <span className="font-bold text-navy-800">Amount paid</span>
                <span className="text-lg font-extrabold text-mint-600">{peso(receipt.amount)}</span>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-3">
                <QrCode size={44} className="text-navy-800" />
              </div>
              <p className="text-center text-[10px] text-mut">Scan to verify this receipt · {receipt.reference}</p>
            </div>
            <button className="flex w-full items-center justify-center gap-2 border-t border-slate-100 py-3 text-sm font-semibold text-brand-500 transition hover:bg-brand-50">
              <Download size={15} /> Download PDF
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
