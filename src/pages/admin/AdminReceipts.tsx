import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, CheckCircle, Clock, FileText, Search, XCircle } from 'lucide-react'
import { EmptyState, Modal, Spinner } from '../../components/ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { peso } from '../../lib/utils'

async function fetchReceipts(status?: string) {
  const qs = status ? `?status=${status}` : ''
  const res = await fetch(`/api/admin/receipts${qs}`)
  if (!res.ok) return []
  return res.json()
}

async function reviewReceipt(id: string, action: 'approved' | 'rejected', notes?: string) {
  const res = await fetch(`/api/admin/receipts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: action, notes }),
  })
  return res.json()
}

export default function AdminReceipts() {
  const [filter, setFilter] = useState<string>('pending')
  const [search, setSearch] = useState('')
  const [reviewing, setReviewing] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const qc = useQueryClient()

  const { data: receipts, isLoading } = useQuery({
    queryKey: ['admin-receipts', filter],
    queryFn: () => fetchReceipts(filter === 'all' ? undefined : filter),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => reviewReceipt(id, 'approved', notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-receipts'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      qc.invalidateQueries({ queryKey: ['admin-landlords'] })
      setReviewing(null)
      setNotes('')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => reviewReceipt(id, 'rejected', notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-receipts'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setReviewing(null)
      setNotes('')
    },
  })

  const filtered = (receipts ?? []).filter((r: any) =>
    r.landlordName?.toLowerCase().includes(search.toLowerCase()) ||
    r.requestedPlan?.toLowerCase().includes(search.toLowerCase())
  )

  const statusBadge = (status: string) => {
    const map: Record<string, { icon: typeof Clock; label: string; cls: string }> = {
      pending: { icon: Clock, label: 'Pending', cls: 'bg-amber-50 text-amber-600' },
      approved: { icon: CheckCircle, label: 'Approved', cls: 'bg-mint-50 text-mint-600' },
      rejected: { icon: XCircle, label: 'Rejected', cls: 'bg-red-50 text-danger' },
    }
    const s = map[status] ?? map.pending
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold', s.cls)}>
        <s.icon size={11} /> {s.label}
      </span>
    )
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by landlord name or plan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {['pending', 'approved', 'rejected', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                filter === f ? 'bg-brand-500 text-white' : 'text-ink hover:bg-slate-50',
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Receipt list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-[18px] bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<FileText size={24} />} title="No receipts found" subtitle="No payment receipts match your filters." />
      ) : (
        <div className="space-y-3">
          {filtered.map((r: any, i: number) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex flex-wrap items-center gap-4 rounded-[18px] border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover"
            >
              <img src={r.receiptUrl} alt="Receipt" className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-navy-800">{r.landlordName}</p>
                  {statusBadge(r.status)}
                </div>
                <p className="mt-0.5 text-sm text-ink">
                  Requested <span className="font-semibold">{r.requestedPlan}</span> plan — {peso(r.planPrice)}/month
                </p>
                <p className="text-[11px] text-mut">
                  Submitted {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—'}
                  {r.reviewedAt && ` · Reviewed ${new Date(r.reviewedAt).toLocaleString()}`}
                </p>
                {r.notes && (
                  <p className="mt-1 text-xs text-ink">Admin note: {r.notes}</p>
                )}
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setReviewing(r)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-mint-50 px-4 py-2 text-sm font-bold text-mint-600 transition hover:bg-mint-100"
                  >
                    <Check size={14} /> Review
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Review modal */}
      <Modal open={!!reviewing} onClose={() => { setReviewing(null); setNotes('') }} title="Review Payment Receipt" wide>
        {reviewing && (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <img src={reviewing.receiptUrl} alt="Receipt" className="h-48 w-48 rounded-xl object-cover ring-1 ring-slate-200" />
              <div>
                <p className="text-lg font-bold text-navy-800">{reviewing.landlordName}</p>
                <p className="text-sm text-ink">
                  Requested plan: <span className="font-semibold">{reviewing.requestedPlan}</span>
                </p>
                <p className="text-sm text-ink">
                  Amount: <span className="font-semibold">{peso(reviewing.planPrice)}/month</span>
                </p>
                <p className="mt-1 text-xs text-mut">
                  Submitted {reviewing.submittedAt ? new Date(reviewing.submittedAt).toLocaleString() : '—'}
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-mut">Admin Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note for the landlord…"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => approveMutation.mutate({ id: reviewing.id, notes: notes || undefined })}
                disabled={approveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-mint-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgb(51_199_165/0.3)] transition hover:-translate-y-0.5 hover:bg-mint-600 disabled:opacity-60"
              >
                {approveMutation.isPending ? <Spinner className="h-4 w-4" /> : <Check size={15} />}
                Approve & Activate Plan
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: reviewing.id, notes: notes || undefined })}
                disabled={rejectMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-bold text-danger transition hover:bg-red-100 disabled:opacity-60"
              >
                {rejectMutation.isPending ? <Spinner className="h-4 w-4" /> : <XCircle size={15} />}
                Reject
              </button>
              <button onClick={() => { setReviewing(null); setNotes('') }} className="ml-auto text-sm font-semibold text-mut transition hover:text-navy-800">
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

import { cn } from '../../lib/utils'
