import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Clock,
  DoorOpen,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PaymentBadge, Spinner, StatCard } from '../../components/ui'
import { useDashboard, useNeedsAttention } from '../../lib/hooks'
import { cn, peso } from '../../lib/utils'

const short = (key: string) => new Date(key + '-02T00:00:00').toLocaleDateString('en-US', { month: 'short' })

const AI_PROMPTS = [
  'Who hasn\'t paid?',
  'Which rooms are vacant?',
  'How much did I earn this month?',
  'Occupancy rate?',
]

export default function Overview() {
  const { data, isLoading } = useDashboard()
  const { data: needsAttention } = useNeedsAttention()
  const navigate = useNavigate()

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-7 w-7 text-brand-500" />
      </div>
    )
  }

  const rev = data.revenueTrend.map((t) => ({ ...t, name: short(t.name) }))
  const occ = data.occupancyTrend.map((t) => ({ ...t, name: short(t.name) }))

  return (
    <div className="space-y-6">
      {/* Primary stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Monthly income"
          value={peso(data.monthlyIncome)}
          icon={<CircleDollarSign size={19} />}
          tone="green"
          loading={isLoading}
          hint={<span className="text-mint-600">▲ {data.paidThisMonth} of {data.boarderCount} paid</span>}
        />
        <StatCard
          label="Occupancy rate"
          value={`${data.occupancyRate}%`}
          icon={<TrendingUp size={19} />}
          tone="blue"
          loading={isLoading}
          hint={<span>{data.occupiedRooms} of {data.totalRooms} beds filled</span>}
        />
        <StatCard
          label="Vacant rooms"
          value={`${data.vacantRooms}`}
          icon={<DoorOpen size={19} />}
          tone="orange"
          loading={isLoading}
          hint={<span>{data.roomStatus.filter((r) => r.occupied < r.capacity).length} rooms with space</span>}
        />
        <StatCard
          label="Late payments"
          value={`${data.lateCount}`}
          icon={<AlertTriangle size={19} />}
          tone="red"
          loading={isLoading}
          hint={<span>{peso(data.pendingAmount)} still pending</span>}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Total beds', value: `${data.totalRooms}`, icon: <Building2 size={16} />, tone: 'navy' as const },
          { label: 'Occupied', value: `${data.occupiedRooms}`, icon: <Users size={16} />, tone: 'blue' as const },
          { label: 'Expected income', value: peso(data.expectedIncome), icon: <Wallet size={16} />, tone: 'green' as const },
          { label: 'Pending', value: peso(data.pendingAmount), icon: <Clock size={16} />, tone: 'orange' as const },
          { label: 'Expiring contracts', value: `${data.expiringContracts}`, icon: <CalendarClock size={16} />, tone: 'red' as const },
          { label: 'New boarders', value: `+${data.newBoardersThisMonth}`, icon: <UserPlus size={16} />, tone: 'navy' as const },
        ].map((s) => (
          <StatCard key={s.label} {...s} loading={false} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-navy-800">Income trend</h3>
              <p className="text-xs text-mut">Collected vs expected, last 8 months</p>
            </div>
            <span className="rounded-full bg-mint-50 px-3 py-1 text-xs font-bold text-mint-600">₱{data.revenueTrend[data.revenueTrend.length - 1]?.income.toLocaleString() ?? 0} this month</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rev} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${v / 1000}k`} width={46} />
                <Tooltip
                  cursor={{ fill: 'rgba(30,115,232,0.06)' }}
                  contentStyle={{ borderRadius: 14, border: '1px solid #EEF2F7', fontSize: 13, boxShadow: '0 8px 30px rgba(11,45,99,0.12)' }}
                  formatter={(v) => peso(Number(v))}
                />
                <Bar dataKey="expected" name="Expected" fill="#D6E0F2" radius={[6, 6, 0, 0]} />
                <Bar dataKey="income" name="Income" fill="#1E73E8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-navy-800">Occupancy trend</h3>
              <p className="text-xs text-mut">Percentage of beds filled over time</p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-500">{data.occupancyRate}% now</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={occ}>
                <defs>
                  <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#33C7A5" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#33C7A5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={42} />
                <Tooltip
                  contentStyle={{ borderRadius: 14, border: '1px solid #EEF2F7', fontSize: 13, boxShadow: '0 8px 30px rgba(11,45,99,0.12)' }}
                  formatter={(v) => [`${v}%`, 'Occupancy']}
                />
                <Area type="monotone" dataKey="occupancy" name="Occupancy" stroke="#33C7A5" strokeWidth={2.5} fill="url(#occGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Rooms + AI + attention */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Room occupancy */}
        <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-navy-800">Room occupancy</h3>
            <button onClick={() => navigate('/dashboard/rooms')} className="text-xs font-semibold text-brand-500 hover:underline">
              Manage
            </button>
          </div>
          <div className="space-y-3.5">
            {data.roomStatus.slice(0, 8).map((r) => {
              const pct = Math.round((r.occupied / r.capacity) * 100)
              return (
                <div key={r.roomNo}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-navy-800">
                      Room {r.roomNo}
                      <span className="ml-1.5 font-normal capitalize text-mut">{r.type}</span>
                    </span>
                    <span className={cn('font-bold', pct >= 100 ? 'text-danger' : pct >= 60 ? 'text-amber-soft' : 'text-mint-600')}>
                      {r.occupied}/{r.capacity}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                      className={cn('h-full rounded-full', pct >= 100 ? 'bg-danger' : pct >= 60 ? 'bg-amber-soft' : 'bg-gradient-to-r from-brand-500 to-mint-400')}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI insights */}
        <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-navy-900 via-navy-800 to-brand-700 p-5 text-white shadow-card">
          <div className="hero-grid-bg absolute inset-0" />
          <div className="hero-blob -right-10 -top-10 h-40 w-40 bg-mint-400" />
          <div className="relative">
            <span className="glass-dark inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold text-mint-300">
              <Sparkles size={12} /> AI Assistant
            </span>
            <h3 className="mt-4 text-lg font-bold leading-snug">Ask your data anything</h3>
            <p className="mt-1 text-sm text-navy-100/80">
              Get instant answers about payments, rooms, and boarders — powered only by your records.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {AI_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => navigate(`/dashboard/ai?prompt=${encodeURIComponent(p)}`)}
                  className="glass-dark rounded-full px-3.5 py-2 text-xs font-semibold transition hover:border-mint-400/50 hover:text-mint-300"
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate('/dashboard/ai')}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-navy-800 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Bot size={16} /> Open AI Assistant <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Needs attention */}
        <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-navy-800">Needs attention</h3>
            <button onClick={() => navigate('/dashboard/payments')} className="text-xs font-semibold text-brand-500 hover:underline">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {!needsAttention ? (
              <div className="flex justify-center py-6">
                <Spinner className="h-5 w-5 text-brand-500" />
              </div>
            ) : needsAttention.length > 0 ? (
              needsAttention.slice(0, 5).map((o) => (
                <div
                  key={o.id}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3',
                    o.status === 'overdue' ? 'border-red-50 bg-red-50/50' : 'border-amber-50 bg-amber-50/50',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      o.status === 'overdue' ? 'bg-red-100 text-danger' : 'bg-amber-100 text-amber-soft',
                    )}
                  >
                    <AlertTriangle size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-800">{o.name}</p>
                    <p className="text-xs text-ink">Room {o.roomNo}</p>
                  </div>
                  <div className="text-right">
                    <span className={cn('text-sm font-bold', o.status === 'overdue' ? 'text-danger' : 'text-amber-soft')}>
                      {peso(o.amount)}
                    </span>
                    <div className="mt-0.5">
                      <PaymentBadge status={o.status} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl bg-mint-50 p-4 text-center text-sm font-semibold text-mint-600">
                🎉 Everyone has paid — no overdue or pending rent this month!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
