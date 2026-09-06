import { motion } from 'framer-motion'
import {
  Building2,
  CalendarClock,
  Clock,
  CreditCard,
  MapPin,
  Star,
  Wifi,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { peso } from '../../lib/utils'
import { StatCard } from '../../components/ui'

export default function BoarderHome() {
  const { user } = useAuth()

  // Mock boarder data (same as Jessa Marie from sample data)
  const boarder = {
    name: user?.name ?? 'Boarder',
    room: 'Room 101 — Bedspace',
    house: 'Sunset Boarding House',
    address: 'Maite National Road, San Juan, Siquijor',
    landlord: 'Rosario C. Cabasan',
    moveIn: 'June 5, 2025',
    contractEnd: 'August 20, 2026',
    monthlyRent: 1500,
    deposit: 1500,
    advance: 3000,
    amenities: ['WiFi', 'Kitchen', 'Laundry'],
  }

  const nextDue = {
    month: 'August 2026',
    amount: 1500,
    dueDate: 'Aug 1, 2026',
    status: 'pending' as const,
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-mint-500 via-brand-500 to-navy-800 p-6 text-white shadow-card sm:p-8"
      >
        <div className="hero-grid-bg absolute inset-0 opacity-40" />
        <div className="hero-blob -right-10 -top-10 h-48 w-48 bg-white/10" />
        <div className="relative">
          <p className="text-sm font-medium text-white/70">Welcome back,</p>
          <h2 className="mt-1 text-2xl font-extrabold">{boarder.name} 👋</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80">
            You're staying at <span className="font-semibold text-white">{boarder.house}</span> in {boarder.address}.
            Your contract ends on <span className="font-semibold text-white">{boarder.contractEnd}</span>.
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Monthly rent"
          value={peso(boarder.monthlyRent)}
          icon={<CreditCard size={19} />}
          tone="blue"
        />
        <StatCard
          label="Next due date"
          value={boarder.moveIn.split(' ').slice(0, 2).join(' ')}
          icon={<CalendarClock size={19} />}
          tone="orange"
          hint={<span>Due {nextDue.dueDate}</span>}
        />
        <StatCard
          label="Room type"
          value="Bedspace"
          icon={<Building2 size={19} />}
          tone="navy"
          hint={<span>Room 101</span>}
        />
        <StatCard
          label="Landlord"
          value={boarder.landlord.split(' ')[0]}
          icon={<Star size={19} />}
          tone="green"
          hint={<span className="text-mint-600">Verified ✓</span>}
        />
      </div>

      {/* Room details + quick actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Room card */}
        <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
          <h3 className="text-lg font-bold text-navy-800">My Room</h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
              <Building2 size={18} className="shrink-0 text-brand-500" />
              <div>
                <p className="text-sm font-semibold text-navy-800">{boarder.room}</p>
                <p className="text-xs text-mut">{boarder.house}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
              <MapPin size={18} className="shrink-0 text-brand-500" />
              <div>
                <p className="text-sm font-semibold text-navy-800">{boarder.address}</p>
                <p className="text-xs text-mut">San Juan, Siquijor</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
              <Clock size={18} className="shrink-0 text-brand-500" />
              <div>
                <p className="text-sm font-semibold text-navy-800">Contract: {boarder.moveIn} → {boarder.contractEnd}</p>
                <p className="text-xs text-mut">Curfew: 10:00 PM</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-mut">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {boarder.amenities.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-3 py-1 text-xs font-semibold text-mint-600">
                    <Wifi size={12} /> {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-6">
          <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
            <h3 className="text-lg font-bold text-navy-800">Quick Actions</h3>
            <div className="mt-4 space-y-3">
              <Link
                to="/boarder/payments"
                className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 transition hover:border-brand-300 hover:bg-brand-50/30"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                  <CreditCard size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold text-navy-800">View payment history</p>
                  <p className="text-xs text-mut">See all your past and upcoming payments</p>
                </div>
              </Link>
              <Link
                to="/boarder/reviews"
                className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 transition hover:border-mint-300 hover:bg-mint-50/30"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint-50 text-mint-600">
                  <Star size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold text-navy-800">Leave a review</p>
                  <p className="text-xs text-mut">Share your experience with others</p>
                </div>
              </Link>
              <Link
                to="/boarder/browse"
                className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 transition hover:border-amber-200 hover:bg-amber-50/30"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-soft">
                  <Building2 size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold text-navy-800">Browse other houses</p>
                  <p className="text-xs text-mut">Explore boarding houses across Siquijor</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Payment reminder */}
          <div className="rounded-[18px] border border-amber-200 bg-amber-50/50 p-5">
            <div className="flex items-start gap-3">
              <CalendarClock size={18} className="mt-0.5 shrink-0 text-amber-soft" />
              <div>
                <p className="text-sm font-bold text-navy-800">Upcoming payment</p>
                <p className="mt-1 text-sm text-ink">
                  Your rent of <span className="font-bold text-navy-800">{peso(nextDue.amount)}</span> for {nextDue.month} is due on <span className="font-bold text-navy-800">{nextDue.dueDate}</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
