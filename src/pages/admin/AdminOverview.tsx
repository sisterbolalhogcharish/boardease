import { motion } from 'framer-motion'
import { CheckCircle, Clock, MessageSquare, TrendingUp, Users } from 'lucide-react'
import { StatCard } from '../../components/ui'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'

async function fetchAdminStats() {
  const res = await fetch('/api/admin/stats')
  if (!res.ok) return { totalLandlords: 0, pendingReceipts: 0, approvedThisMonth: 0, totalRevenue: 0, planBreakdown: { basic: 0, standard: 0, premium: 0, none: 0 } }
  return res.json()
}

async function fetchPendingReceipts() {
  const res = await fetch('/api/admin/receipts?status=pending')
  if (!res.ok) return []
  return res.json()
}

export default function AdminOverview() {
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: fetchAdminStats })
  const { data: pending } = useQuery({ queryKey: ['admin-pending-receipts'], queryFn: fetchPendingReceipts })

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
          hint={pending?.length > 0 ? `${pending.length} awaiting review` : 'All caught up'}
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
              pending.slice(0, 5).map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-slate-200">
                  <img src={r.receiptUrl} alt="Receipt" className="h-10 w-10 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-800">{r.landlordName}</p>
                    <p className="text-[11px] text-mut">Plan: {r.requestedPlan} · {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : ''}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-600">Pending</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


