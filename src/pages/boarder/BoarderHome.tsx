import { motion } from 'framer-motion'
import {
  ArrowLeftRight,
  Building2,
  CalendarClock,
  Clock,
  Compass,
  CreditCard,
  Heart,
  MapPin,
  Phone,
  Star,
  Wifi,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import HouseCard from '../../components/HouseCard'
import { EmptyState, PaymentBadge, Skeleton, StatCard } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { useCompare } from '../../lib/compare'
import { useAccommodation, useFavorites, useFeaturedHouses } from '../../lib/hooks'
import { cn, peso, prettyDate } from '../../lib/utils'

const ROOM_TYPE_LABEL: Record<string, string> = {
  bedspace: 'Bedspace',
  single: 'Single room',
  double: 'Double room',
  studio: 'Studio',
}

function DiscoverySection({ hasAccommodation }: { hasAccommodation: boolean }) {
  const { data: featured, isLoading } = useFeaturedHouses()

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-navy-800">Explore Boarding Houses Across Siquijor</h3>
          <p className="mt-0.5 text-sm text-ink">
            {hasAccommodation
              ? 'Looking for a new place? Browse what is currently available.'
              : 'Browse registered boarding houses and find one that fits you.'}
          </p>
        </div>
        <Link
          to="/boarder/browse"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
        >
          <Compass size={14} /> Browse Houses
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[380px] rounded-[18px]" />
          ))}
        </div>
      ) : featured && featured.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {featured.slice(0, 3).map((h, i) => (
            <HouseCard key={h.id} house={h} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 size={22} />}
          title="No boarding houses registered yet"
          subtitle="Once owners publish their boarding houses, they will appear here."
        />
      )}
    </section>
  )
}

export default function BoarderHome() {
  const { user } = useAuth()
  const userId = user?.id?.toString()
  const { data: accommodation, isLoading } = useAccommodation(userId)
  const { data: favorites } = useFavorites(userId)
  const compare = useCompare()

  const firstName = user?.name?.split(' ')[0] ?? 'Boarder'

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-[22px]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-[18px]" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-[18px]" />
      </div>
    )
  }

  /* ---------------- STATE A — no active accommodation ---------------- */
  if (!accommodation) {
    const favPreview = (favorites ?? []).slice(0, 3)

    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-mint-500 via-brand-500 to-navy-800 p-6 text-white shadow-card sm:p-10"
        >
          <div className="hero-grid-bg absolute inset-0 opacity-40" />
          <div className="hero-blob -right-10 -top-10 h-48 w-48 bg-white/10" />
          <div className="relative max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
              <Compass size={12} /> Accommodation status
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Find Your Next Home</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/85">
              Explore available boarding houses in Larena and find an accommodation that fits your needs.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/boarder/browse"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-navy-800 transition hover:bg-white/90"
              >
                <Building2 size={16} /> Browse Houses
              </Link>
              <Link
                to="/boarder/compare"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <ArrowLeftRight size={16} /> Compare Houses
                {compare.count > 0 && <span className="rounded-full bg-white/25 px-1.5 text-[11px]">{compare.count}</span>}
              </Link>
              <Link
                to="/boarder/favorites"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <Heart size={16} /> View Favorites
                {favorites && favorites.length > 0 && (
                  <span className="rounded-full bg-white/25 px-1.5 text-[11px]">{favorites.length}</span>
                )}
              </Link>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Saved favorites" value={String(favorites?.length ?? 0)} icon={<Heart size={19} />} tone="green" />
          <StatCard label="In comparison" value={String(compare.count)} icon={<ArrowLeftRight size={19} />} tone="blue" />
          <StatCard
            label="Accommodation"
            value="Not yet assigned"
            icon={<Building2 size={19} />}
            tone="orange"
            hint={<span>Request a reservation to get started</span>}
          />
        </div>

        {favPreview.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <h3 className="text-lg font-bold text-navy-800">Your saved houses</h3>
              <Link to="/boarder/favorites" className="text-xs font-semibold text-brand-500 hover:text-brand-600">
                View all favorites →
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {favPreview.map((f, i) => (
                <HouseCard key={f.house.id} house={f.house} index={i} />
              ))}
            </div>
          </section>
        )}

        <DiscoverySection hasAccommodation={false} />
      </div>
    )
  }

  /* ---------------- STATE B — active accommodation ---------------- */
  const next = accommodation.nextPayment
  const roomLabel = ROOM_TYPE_LABEL[accommodation.roomType] ?? accommodation.roomType

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
          <h2 className="mt-1 text-2xl font-extrabold">{user?.name} 👋</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
            You&apos;re staying at <span className="font-semibold text-white">{accommodation.houseName}</span>
            {accommodation.address ? ` in ${accommodation.address}` : ''}.
            {accommodation.contractEnd ? (
              <>
                {' '}
                Your contract ends on{' '}
                <span className="font-semibold text-white">{prettyDate(accommodation.contractEnd)}</span>.
              </>
            ) : null}
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Monthly rent" value={peso(accommodation.monthlyRent)} icon={<CreditCard size={19} />} tone="blue" />
        <StatCard
          label="Next payment due"
          value={next ? prettyDate(next.dueDate) : 'None scheduled'}
          icon={<CalendarClock size={19} />}
          tone="orange"
          hint={next ? <span>{peso(next.amount)} · {next.label}</span> : <span>No upcoming payment</span>}
        />
        <StatCard
          label="Room type"
          value={roomLabel}
          icon={<Building2 size={19} />}
          tone="navy"
          hint={<span>Room {accommodation.roomNo}</span>}
        />
        <StatCard
          label="Landlord"
          value={accommodation.owner?.split(' ')[0] || '—'}
          icon={<Star size={19} />}
          tone="green"
          hint={
            accommodation.ownerPhone ? (
              <span className="inline-flex items-center gap-1">
                <Phone size={11} /> {accommodation.ownerPhone}
              </span>
            ) : (
              <span>Contact via Messages</span>
            )
          }
        />
      </div>

      {/* Room details + quick actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
          <h3 className="text-lg font-bold text-navy-800">My Room</h3>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
              <Building2 size={18} className="shrink-0 text-brand-500" />
              <div>
                <p className="text-sm font-semibold text-navy-800">
                  Room {accommodation.roomNo} · {roomLabel}
                </p>
                <p className="text-xs text-mut">{accommodation.houseName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-surface p-3">
              <MapPin size={18} className="shrink-0 text-brand-500" />
              <div>
                <p className="text-sm font-semibold text-navy-800">{accommodation.address || 'Address not provided'}</p>
                <p className="text-xs text-mut">
                  {accommodation.barangay}
                  {accommodation.barangay && accommodation.municipality ? ', ' : ''}
                  {accommodation.municipality}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface p-3">
            <Clock size={18} className="shrink-0 text-brand-500" />
            <div>
              <p className="text-sm font-semibold text-navy-800">
                Contract: {accommodation.moveInDate ? prettyDate(accommodation.moveInDate) : '—'} →{' '}
                {accommodation.contractEnd ? prettyDate(accommodation.contractEnd) : '—'}
              </p>
              <p className="text-xs text-mut">Curfew: {accommodation.curfew || 'Not specified'}</p>
            </div>
          </div>

          {accommodation.description && (
            <p className="mt-4 text-sm leading-relaxed text-ink">{accommodation.description}</p>
          )}

          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-mut">Amenities</p>
            {accommodation.amenities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {accommodation.amenities.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-3 py-1 text-xs font-semibold text-mint-600"
                  >
                    <Wifi size={12} /> {a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-mut">No amenities were listed for this boarding house.</p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to={`/houses/${accommodation.houseId}`}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-500"
            >
              View boarding house
            </Link>
            <Link
              to="/boarder/messages"
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-navy-800 transition hover:border-mint-300 hover:text-mint-600"
            >
              Message landlord
            </Link>
          </div>
        </div>

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
                  <p className="text-sm font-bold text-navy-800">View payments</p>
                  <p className="text-xs text-mut">See your past and upcoming rent records</p>
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
                  <p className="text-sm font-bold text-navy-800">Browse houses</p>
                  <p className="text-xs text-mut">Explore boarding houses across Siquijor</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Payment reminder — only when there is an applicable upcoming payment */}
          {next ? (
            <div
              className={cn(
                'rounded-[18px] border p-5',
                next.status === 'overdue' ? 'border-red-200 bg-red-50/60' : 'border-amber-200 bg-amber-50/50',
              )}
            >
              <div className="flex items-start gap-3">
                <CalendarClock
                  size={18}
                  className={cn('mt-0.5 shrink-0', next.status === 'overdue' ? 'text-danger' : 'text-amber-soft')}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-navy-800">Upcoming payment</p>
                    <PaymentBadge status={next.status} />
                  </div>
                  <p className="mt-1 text-sm text-ink">
                    Your rent of <span className="font-bold text-navy-800">{peso(next.amount)}</span> for {next.label} is
                    due on <span className="font-bold text-navy-800">{prettyDate(next.dueDate)}</span>.
                  </p>
                  <p className="mt-1 text-xs text-mut">
                    Payments are recorded by your landlord. BoardEase does not process online payments.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] border border-mint-200 bg-mint-50/60 p-5">
              <p className="text-sm font-bold text-navy-800">No upcoming payment</p>
              <p className="mt-1 text-sm text-ink">
                You&apos;re all settled for now. Future rent records from your landlord will show up here.
              </p>
            </div>
          )}
        </div>
      </div>

      <DiscoverySection hasAccommodation />
    </div>
  )
}
