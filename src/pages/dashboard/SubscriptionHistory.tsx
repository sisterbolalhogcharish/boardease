import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  Crown,
  FileText,
  MessageCircleQuestion,
  Receipt,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, Spinner } from '../../components/ui'
import { PLANS } from '../../lib/api'
import { useLandlordHouse } from '../../lib/landlordHouse'
import { useSendSupportMessage, useSubscriptionReceipts, useSupportMessages } from '../../lib/hooks'
import { cn, peso } from '../../lib/utils'

const STATUS_META = {
  pending: { label: 'Awaiting verification', icon: Clock, cls: 'bg-amber-50 text-amber-600 border-amber-100' },
  approved: { label: 'Approved', icon: CheckCircle2, cls: 'bg-mint-50 text-mint-600 border-mint-100' },
  rejected: { label: 'Rejected', icon: XCircle, cls: 'bg-red-50 text-danger border-red-100' },
} as const

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function SubscriptionHistory() {
  const { userId } = useLandlordHouse()
  const { data: receipts, isLoading } = useSubscriptionReceipts()
  const { data: messages, isLoading: messagesLoading } = useSupportMessages()
  const sendMessage = useSendSupportMessage()

  const [plan, setPlan] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const latest = receipts?.[0] ?? null
  const approvedCount = (receipts ?? []).filter((r) => r.status === 'approved').length

  const submitMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!userId) return
    if (!body.trim()) {
      setError('Please write a message for the admin.')
      return
    }
    try {
      await sendMessage.mutateAsync({ userId, plan: plan || undefined, body: body.trim() })
      setBody('')
      setNotice('Message sent to the admin. Replies appear here and in your notifications.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card">
          <p className="text-[13px] font-medium text-mut">Receipts submitted</p>
          <p className="mt-1 text-[22px] font-bold text-navy-800">{receipts?.length ?? 0}</p>
        </div>
        <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card">
          <p className="text-[13px] font-medium text-mut">Approved payments</p>
          <p className="mt-1 text-[22px] font-bold text-mint-600">{approvedCount}</p>
        </div>
        <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card">
          <p className="text-[13px] font-medium text-mut">Plan availed</p>
          <p className="mt-1 text-[22px] font-bold text-navy-800">
            {latest ? latest.requestedPlan.charAt(0).toUpperCase() + latest.requestedPlan.slice(1) : '—'}
          </p>
        </div>
      </div>

      {/* Receipt history */}
      <section className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-navy-800">Payment history</h2>
            <p className="mt-0.5 text-sm text-ink">Every receipt you've sent, and what the admin decided.</p>
          </div>
          <Link
            to="/dashboard/subscription"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-[0_8px_20px_rgb(30_115_232/0.3)] transition hover:-translate-y-0.5 hover:bg-brand-600"
          >
            <Crown size={13} /> Avail a plan
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6 text-brand-500" />
          </div>
        ) : (receipts ?? []).length === 0 ? (
          <EmptyState
            icon={<Receipt size={24} />}
            title="No payments yet"
            subtitle="Once you choose a plan and send your GCash receipt, it shows up here with its verification status."
          />
        ) : (
          <ul className="space-y-3">
            {(receipts ?? []).map((r, i) => {
              const meta = STATUS_META[r.status]
              return (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex flex-wrap items-start gap-4 rounded-xl border border-slate-100 bg-white p-4"
                >
                  <img
                    src={r.receiptUrl}
                    alt="Payment receipt"
                    className="h-16 w-16 shrink-0 rounded-xl bg-surface object-contain ring-1 ring-slate-200"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-navy-800">
                        {r.requestedPlan.charAt(0).toUpperCase() + r.requestedPlan.slice(1)} plan
                      </p>
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold', meta.cls)}>
                        <meta.icon size={11} /> {meta.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink">{peso(r.planPrice)}/month</p>
                    <p className="mt-0.5 text-[11px] text-mut">
                      Submitted {formatDate(r.submittedAt)}
                      {r.reviewedAt ? ` · Reviewed ${formatDate(r.reviewedAt)}` : ''}
                    </p>
                    {r.notes && (
                      <p className="mt-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs text-ink">
                        <span className="font-semibold text-navy-800">Admin note:</span> {r.notes}
                      </p>
                    )}
                  </div>
                </motion.li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Contact admin */}
      <section className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
            <MessageCircleQuestion size={19} />
          </span>
          <div>
            <h2 className="text-base font-bold text-navy-800">Contact admin</h2>
            <p className="mt-0.5 text-sm text-ink">
              Questions about the plan you availed, your payment, or your listing? Message BoardEase administration here.
            </p>
          </div>
        </div>

        {/* Thread */}
        {messagesLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-5 w-5 text-brand-500" />
          </div>
        ) : (messages ?? []).length > 0 ? (
          <ul className="mb-5 space-y-4">
            {(messages ?? []).map((m) => (
              <li key={m.id} className="space-y-2">
                {/* landlord's own message */}
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand-500 px-4 py-2.5 text-sm text-white">
                  {m.plan && (
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-brand-100">
                      About the {m.plan} plan
                    </span>
                  )}
                  {m.body}
                  <span className="mt-1 block text-[10px] text-brand-100">{formatDate(m.createdAt)}</span>
                </div>
                {/* admin reply */}
                {m.reply ? (
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-surface px-4 py-2.5 text-sm text-navy-800">
                    <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-mint-600">
                      <ShieldCheck size={11} /> BoardEase admin
                    </span>
                    {m.reply}
                    <span className="mt-1 block text-[10px] text-mut">{formatDate(m.repliedAt)}</span>
                  </div>
                ) : (
                  <p className="max-w-[85%] text-xs text-mut">Waiting for the admin to reply…</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-5 rounded-xl border border-dashed border-slate-200 bg-surface px-4 py-6 text-center text-sm text-ink">
            No messages yet. Ask about your plan or payment and the admin will reply here.
          </p>
        )}

        {error && (
          <p role="alert" className="mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        {notice && (
          <p className="mb-3 flex items-center gap-2 rounded-xl border border-mint-100 bg-mint-50 px-4 py-2.5 text-sm font-medium text-mint-600">
            <CheckCircle2 size={15} /> {notice}
          </p>
        )}

        <form onSubmit={submitMessage} className="space-y-3 border-t border-slate-100 pt-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_1fr]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-700">About</span>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
              >
                <option value="">General question</option>
                {PLANS.map((p) => (
                  <option key={p.plan} value={p.plan.toLowerCase()}>
                    {p.plan} plan
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-700">Message</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="e.g. I paid for the Standard plan yesterday — can you check my receipt?"
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-navy-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={sendMessage.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgb(30_115_232/0.3)] transition hover:-translate-y-0.5 hover:bg-brand-600 disabled:opacity-60"
          >
            {sendMessage.isPending ? <Spinner className="h-4 w-4" /> : <Send size={15} />}
            {sendMessage.isPending ? 'Sending…' : 'Send to admin'}
          </button>
        </form>
      </section>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-xs text-mut">
        <FileText size={12} /> Payments are subject to verification by BoardEase administration.
      </p>
    </div>
  )
}
