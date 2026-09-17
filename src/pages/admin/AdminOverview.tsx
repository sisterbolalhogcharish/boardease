import { motion } from 'framer-motion'
import { CheckCircle, Clock, MessageSquare, Trash2, TrendingUp, Users } from 'lucide-react'
import { StatCard } from '../../components/ui'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getDeletionReceipts, type SubscriptionReceipt } from '../../lib/api'
import { cn, timeAgo } from '../../lib/utils'

async function fetchAdminStats() {
  const res = await fetch('/api/admin/stats')
  if (!res.ok) return { totalLandlords: 0, pendingReceipts: 0, approvedThisMonth: 0, totalRevenue: 0, planBreakdown: { basic: 0, standard: 0, premium: 0, none: 0 } }
  return res.json()
}

async function fetchPendingReceipts(): Promise<SubscriptionReceipt[]> {
  const res = await fetch('/api/admin/receipts?status=pending')
  if (!res.ok) return []
  return res.json()
}

export default function AdminOverview() {
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: fetchAdminStats })
  const { data: pending } = useQuery({ queryKey: ['admin-pending-receipts'], queryFn: fetchPendingReceipts })
  const { data: deletions } = useQuery({ queryKey: ['admin-deletion-receipts'], queryFn: getDeletionReceipts })

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total Landlords"
          value={stats?.totalLandlords?.toString() ?? '0'}
          icon={<Users size={20} />}
          tone="blue"
          loading={statsLoading}
        />
        <StatCard
          label="Pending Receipts"
          value={stats?.pendingReceipts?.toString() ?? '0'}
          icon={<Clock size={20} />}
          tone="orange"
          loading={statsLoading}
          hint={pending && pending.length > 0 ? `${pending.length} awaiting review` : 'All caught up'}
        />
        <StatCard
          label="Landlord Messages"
          value={stats?.pendingMessages?.toString() ?? '0'}
          icon={<MessageSquare size={20} />}
          tone="red"
          loading={statsLoading}
          hint={
            stats?.pendingMessages > 0 ? (
              <Link to="/admin/messages" className="font-semibold text-brand-500 hover:underline">
                {stats.pendingMessages} awaiting reply
              </Link>
            ) : (
              'No unread questions'
            )
          }
        />
        <StatCard
          label="Approved This Month"
          value={stats?.approvedThisMonth?.toString() ?? '0'}
          icon={<CheckCircle size={20} />}
          tone="green"
          loading={statsLoading}
        />
        <StatCard
          label="Total Revenue"
          value={stats?.totalRevenue ? `₱${stats.totalRevenue.toLocaleString()}` : '₱0'}
          icon={<TrendingUp size={20} />}
          tone="navy"
          loading={statsLoading}
        />
      </div>

      {/* Plan breakdown + recent pending */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Plan distribution */}
        <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
          <h3 className="font-bold text-navy-800">Plan Distribution</h3>
          <p className="mt-1 text-xs text-mut">How many landlords are on each plan.</p>
          <div className="mt-5 space-y-3">
            {(['premium', 'standard', 'basic', 'none'] as const).map((plan) => {
              const count = stats?.planBreakdown?.[plan] ?? 0
              const total = stats?.totalLandlords ?? 1
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              const colors: Record<string, { bar: string; text: string }> = {
                premium: { bar: 'bg-mint-400', text: 'text-mint-600' },
                standard: { bar: 'bg-brand-500', text: 'text-brand-600' },
                basic: { bar: 'bg-navy-500', text: 'text-navy-600' },
                none: { bar: 'bg-slate-300', text: 'text-slate-500' },
              }
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-navy-800 capitalize">{plan === 'none' ? 'No Plan' : plan}</span>
                    <span className={colors[plan].text}>{count} ({pct}%)</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={cn('h-full rounded-full', colors[plan].bar)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent pending receipts */}
        <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-navy-800">Pending Receipts</h3>
            <Link to="/admin/receipts" className="text-xs font-semibold text-brand-500 transition hover:text-brand-600">
              View all →
            </Link>
          </div>
          <p className="mt-1 text-xs text-mut">Landlord payment receipts awaiting review.</p>
          <div className="mt-4 space-y-3">
            {!pending || pending.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <CheckCircle size={28} className="text-mint-400" />
                <p className="mt-2 text-sm font-semibold text-navy-800">All caught up!</p>
                <p className="text-xs text-mut">No pending receipts to review.</p>
              </div>
            ) : (
              // Each row opens the Payment Receipts page, where the proof of
              // payment can be viewed full size before it is approved.
              pending.slice(0, 5).map((r) => (
                <Link
                  key={r.id}
                  to="/admin/receipts"
                  title="View the proof of payment"
                  className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <img src={r.receiptUrl} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-800">{r.landlordName}</p>
                    <p className="text-[11px] text-mut">Plan: {r.requestedPlan} · {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : ''}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-600">Pending</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Archived account-deletion receipts */}
      <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-danger">
            <Trash2 size={19} />
          </span>
          <div>
            <h3 className="font-bold text-navy-800">Deleted Accounts</h3>
            <p className="mt-0.5 text-xs text-mut">
              Archived receipts of boarders who deleted their accounts — kept for record-keeping after the data is gone.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {!deletions || deletions.length === 0 ? (
            <p className="rounded-xl bg-surface px-4 py-6 text-center text-sm text-mut">No accounts have been deleted.</p>
          ) : (
            deletions.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-slate-200"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-danger">
                  <Trash2 size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy-800">
                    {d.name || 'Boarder'} <span className="font-normal text-mut">· {d.email}</span>
                  </p>
                  <p className="text-[11px] text-mut">
                    {d.reservations} reservation{d.reservations === 1 ? '' : 's'} · {d.rentals} rental{d.rentals === 1 ? '' : 's'} ·{' '}
                    {d.reviews} review{d.reviews === 1 ? '' : 's'} · {d.favorites} favorite{d.favorites === 1 ? '' : 's'} ·{' '}
                    {d.messages} message{d.messages === 1 ? '' : 's'} removed
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-mut">
                  {d.requestedAt ? timeAgo(d.requestedAt) : ''}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}


