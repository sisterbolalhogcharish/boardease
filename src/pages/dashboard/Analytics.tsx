import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Spinner } from '../../components/ui'
import { useAnalytics } from '../../lib/hooks'
import { peso } from '../../lib/utils'

const PIE_COLORS = ['#1E73E8', '#33C7A5']
const BAR_COLORS = ['#0B2D63', '#1E73E8', '#33C7A5', '#F59E0B', '#EF4444', '#94A3B8']

function ChartCard({ title, subtitle, action, children, className }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-[18px] border border-slate-100 bg-white p-5 shadow-card ${className ?? ''}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-navy-800">{title}</h3>
          {subtitle && <p className="text-xs text-mut">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  )
}

const tooltipStyle = {
  borderRadius: 14,
  border: '1px solid #EEF2F7',
  fontSize: 13,
  boxShadow: '0 8px 30px rgba(11,45,99,0.12)',
} as const

export default function Analytics() {
  const { data, isLoading } = useAnalytics()

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-7 w-7 text-brand-500" />
      </div>
    )
  }

  const lastRevenue = data.revenueByMonth[data.revenueByMonth.length - 1]
  const prevRevenue = data.revenueByMonth[data.revenueByMonth.length - 2]
  const delta = lastRevenue && prevRevenue ? ((lastRevenue.income - prevRevenue.income) / prevRevenue.income) * 100 : 0
  const avgOccupancy = Math.round(data.occupancyByMonth.reduce((s, o) => s + o.occupancy, 0) / Math.max(1, data.occupancyByMonth.length))

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Revenue this month', value: peso(lastRevenue?.income ?? 0), hint: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs last month`, up: delta >= 0 },
          { label: 'Average occupancy', value: `${avgOccupancy}%`, hint: 'last 8 months', up: true },
          { label: 'Female boarders', value: `${data.genderDistribution[0]?.value ?? 0}`, hint: `${data.genderDistribution[0]?.value ?? 0}/${data.genderDistribution.reduce((s, g) => s + g.value, 0)} of boarders`, up: true },
          { label: 'Top room revenue', value: peso(data.topRooms[0]?.revenue ?? 0), hint: data.topRooms[0]?.name, up: true },
        ].map((s) => (
          <div key={s.label} className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wider text-mut">{s.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-navy-800">{s.value}</p>
            <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${s.up ? 'text-mint-600' : 'text-danger'}`}>
              {s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {s.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Monthly revenue" subtitle="Collected vs expected income" action={<span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-500">{peso(lastRevenue?.income ?? 0)}</span>}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByMonth} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${v / 1000}k`} width={44} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => peso(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="expected" name="Expected" fill="#D6E0F2" radius={[6, 6, 0, 0]} />
                <Bar dataKey="income" name="Income" fill="#1E73E8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Revenue forecast" subtitle="Projected income for the next 6 months">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueForecast}>
                <defs>
                  <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#33C7A5" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#33C7A5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${v / 1000}k`} width={44} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => peso(Number(v))} />
                <Area type="monotone" dataKey="value" name="Projected income" stroke="#33C7A5" strokeWidth={2.5} fill="url(#fcGrad)" strokeDasharray="6 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Occupancy trend" subtitle={`Average ${avgOccupancy}% over the period`}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.occupancyByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Occupancy']} />
                <Line type="monotone" dataKey="occupancy" stroke="#1E73E8" strokeWidth={2.5} dot={{ r: 3, fill: '#1E73E8' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Boarder growth" subtitle="Active boarders over time">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.boarderGrowth}>
                <defs>
                  <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E73E8" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1E73E8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} boarders`, '']} />
                <Area type="monotone" dataKey="boarders" stroke="#1E73E8" strokeWidth={2.5} fill="url(#bgGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Gender distribution" subtitle="Male vs female boarders">
          <div className="flex h-64 items-center justify-center gap-6">
            <div className="h-52 w-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.genderDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={4}>
                    {data.genderDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {data.genderDistribution.map((g, i) => (
                <div key={g.name} className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="font-medium text-ink">{g.name}</span>
                  <span className="font-bold text-navy-800">{g.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="School distribution" subtitle="Boarders by school">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.schoolDistribution} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} boarders`, '']} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {data.schoolDistribution.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Late & overdue payments" subtitle="Payment issues per month">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.lateTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="late" name="Paid late" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                <Bar dataKey="overdue" name="Overdue" stackId="a" fill="#EF4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Top rooms by revenue" subtitle="Highest revenue potential">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topRooms} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${v / 1000}k`} />
                <YAxis type="category" dataKey="name" width={44} tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => peso(Number(v))} />
                <Bar dataKey="revenue" radius={[0, 8, 8, 0]} fill="#0B2D63" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
