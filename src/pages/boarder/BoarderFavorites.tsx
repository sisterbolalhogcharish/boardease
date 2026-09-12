import { Heart, ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'
import HouseCard from '../../components/HouseCard'
import { EmptyState, Skeleton } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { useCompare } from '../../lib/compare'
import { useFavorites } from '../../lib/hooks'

export default function BoarderFavorites() {
  const { user } = useAuth()
  const { data: favorites, isLoading } = useFavorites(user?.id?.toString())
  const compare = useCompare()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-[18px]" />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[380px] rounded-[18px]" />
          ))}
        </div>
      </div>
    )
  }

  const list = favorites ?? []

  if (list.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={<Heart size={22} />}
          title="Your Favorites Are Empty"
          subtitle="Save boarding houses you're interested in so you can easily compare and review them later."
        />
        <div className="flex justify-center">
          <Link
            to="/boarder/browse"
            className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgb(30_115_232/0.35)] transition hover:-translate-y-0.5 hover:bg-brand-600"
          >
            Browse Houses
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-slate-100 bg-white p-5 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mint-50 text-mint-600">
            <Heart size={18} className="fill-mint-500" />
          </span>
          <div>
            <p className="text-sm font-bold text-navy-800">
              {list.length} saved boarding house{list.length === 1 ? '' : 's'}
            </p>
            <p className="text-xs text-ink">Tap the heart on a card to remove it, or add houses to Compare.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/boarder/browse"
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-500"
          >
            Browse Houses
          </Link>
          <Link
            to="/boarder/compare"
            className="inline-flex items-center gap-1.5 rounded-xl bg-navy-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy-700"
          >
            <ListChecks size={13} /> Compare ({compare.count})
          </Link>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((item, i) => (
          <HouseCard key={item.house.id} house={item.house} index={i} />
        ))}
      </div>
    </div>
  )
}
