import { ArrowLeftRight, Building2, Check, Star, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CompareButton, FavoriteButton } from '../../components/boarder/HouseActions'
import { EmptyState, HouseImage, HouseStatusBadge, Skeleton } from '../../components/ui'
import { useCompare } from '../../lib/compare'
import { useHouses } from '../../lib/hooks'
import { cn, peso } from '../../lib/utils'
import type { HouseCard } from '../../lib/api'

function ListBlock({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <span className="text-xs text-mut">{empty}</span>
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-1.5 text-xs leading-relaxed text-ink">
          <Check size={12} className="mt-0.5 shrink-0 text-mint-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function BoarderCompare() {
  const compare = useCompare()
  const navigate = useNavigate()
  const { data: houses, isLoading } = useHouses()

  const selected = (houses ?? []).filter((h) => compare.ids.includes(h.id))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-[18px]" />
        <Skeleton className="h-[420px] rounded-[18px]" />
      </div>
    )
  }

  if (compare.count === 0 || selected.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={<ArrowLeftRight size={22} />}
          title="No Boarding Houses Selected"
          subtitle="Select boarding houses from Browse Houses or Favorites to compare them."
        />
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/boarder/browse"
            className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgb(30_115_232/0.35)] transition hover:-translate-y-0.5 hover:bg-brand-600"
          >
            Browse Houses
          </Link>
          <Link
            to="/boarder/favorites"
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-navy-800 transition hover:border-mint-300 hover:text-mint-600"
          >
            View Favorites
          </Link>
        </div>
      </div>
    )
  }

  const minRent = Math.min(...selected.map((h) => h.monthlyRent))
  const maxVacant = Math.max(...selected.map((h) => h.vacant))
  const maxRating = Math.max(...selected.map((h) => h.rating))

  const amenitiesOf = (h: HouseCard) =>
    [
      h.wifi && 'WiFi',
      h.aircon && 'Aircon',
      h.kitchen && 'Kitchen',
      h.laundry && 'Laundry',
      h.parking && 'Parking',
      h.petFriendly && 'Pet friendly',
    ].filter((x): x is string => Boolean(x))

  const rows: { label: string; render: (h: HouseCard) => ReactNode }[] = [
    {
      label: 'Rental rate',
      render: (h) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-base font-bold text-navy-800">{peso(h.monthlyRent)}</span>
          <span className="text-[11px] text-mut">/month</span>
          {h.monthlyRent === minRent && selected.length > 1 && (
            <span className="rounded-full bg-mint-50 px-2 py-0.5 text-[10px] font-bold text-mint-600">Lowest rent</span>
          )}
        </div>
      ),
    },
    {
      label: 'Available beds',
      render: (h) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-navy-800">
            {h.vacant} of {h.totalRooms}
          </span>
          {h.vacant === maxVacant && h.vacant > 0 && selected.length > 1 && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-500">Most available</span>
          )}
        </div>
      ),
    },
    {
      label: 'Room types',
      render: (h) =>
        h.roomTypes.length ? (
          <span className="text-xs capitalize text-ink">{h.roomTypes.join(', ')}</span>
        ) : (
          <span className="text-xs text-mut">Not specified</span>
        ),
    },
    { label: 'Amenities', render: (h) => <ListBlock items={amenitiesOf(h)} empty="No amenities listed" /> },
    {
      label: 'House rules',
      render: (h) => <ListBlock items={(h.rules ?? []).slice(0, 4)} empty="No rules published" />,
    },
    {
      label: 'Rating',
      render: (h) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 font-semibold text-navy-800">
            <Star size={12} className="fill-amber-400 text-amber-400" /> {h.rating.toFixed(1)}
          </span>
          {h.rating === maxRating && selected.length > 1 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-soft">Highest rated</span>
          )}
        </div>
      ),
    },
    { label: 'Reviews', render: (h) => <span className="text-xs text-ink">{h.reviewsCount} reviews</span> },
    {
      label: 'House rules — curfew',
      render: (h) => <span className="text-xs text-ink">{h.curfew || 'Not specified'}</span>,
    },
    { label: 'Contact', render: (h) => <span className="text-xs text-ink">{h.owner || 'Owner via BoardEase messaging'}</span> },
    {
      label: 'Reservation',
      render: (h) =>
        h.vacant > 0 ? (
          <span className="rounded-full bg-mint-50 px-2.5 py-1 text-[11px] font-bold text-mint-600">Open for requests</span>
        ) : (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-danger">Fully occupied</span>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-slate-100 bg-white p-5 shadow-card">
        <div>
          <p className="text-sm font-bold text-navy-800">
            Comparing {selected.length} boarding house{selected.length === 1 ? '' : 's'}
          </p>
          <p className="text-xs text-ink">
            Differences are highlighted for convenience — comparison is informational, not a ranking.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/boarder/browse"
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-500"
          >
            Add more houses
          </Link>
          <button
            onClick={() => compare.clear()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-ink transition hover:border-danger/40 hover:text-danger"
          >
            <X size={13} /> Clear all
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-surface">
                <th className="w-[150px] px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-mut">Boarding house</th>
                {selected.map((h) => (
                  <th key={h.id} className="px-4 py-4 align-top">
                    <div className="space-y-2">
                      <HouseImage src={h.images?.[0]} alt={h.name} className="h-24 w-full rounded-xl" />
                      <p className="text-sm font-bold text-navy-800">{h.name}</p>
                      <p className="text-[11px] text-mut">
                        {h.barangay}, {h.municipality}
                      </p>
                      <HouseStatusBadge status={h.status as 'available' | 'almost-full' | 'occupied' | 'full'} vacant={h.vacant} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-slate-50 align-top">
                  <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-mut">{row.label}</th>
                  {selected.map((h) => (
                    <td key={h.id} className="px-4 py-3.5">
                      {row.render(h)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-mut">Actions</th>
                {selected.map((h) => (
                  <td key={h.id} className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <FavoriteButton houseId={h.id} variant="icon" />
                        <CompareButton houseId={h.id} variant="icon" />
                      </div>
                      <Link
                        to={`/houses/${h.id}`}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-center text-[11px] font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-500"
                      >
                        View Details
                      </Link>
                      <button
                        onClick={() => navigate(`/houses/${h.id}?reserve=1`)}
                        disabled={h.vacant === 0}
                        className={cn(
                          'rounded-lg px-3 py-2 text-[11px] font-semibold transition',
                          h.vacant === 0
                            ? 'cursor-not-allowed bg-slate-100 text-mut'
                            : 'bg-brand-500 text-white hover:bg-brand-600',
                        )}
                      >
                        Request Reservation
                      </button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-[18px] border border-slate-100 bg-white p-4 text-xs text-ink shadow-card">
        <Building2 size={14} className="shrink-0 text-brand-500" />
        BoardEase does not download or show private tenant, payment or occupancy records in comparisons — only public
        listing information.
      </div>
    </div>
  )
}
