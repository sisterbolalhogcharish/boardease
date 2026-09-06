import { AnimatePresence, motion } from 'framer-motion'
import { BedDouble, ChevronDown, Filter, MapPin, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import HouseCard from '../components/HouseCard'
import Footer from '../components/layout/Footer'
import Navbar from '../components/layout/Navbar'
import { EmptyState, Skeleton } from '../components/ui'
import { useHouses, useLocations } from '../lib/hooks'
import { cn } from '../lib/utils'
import type { Gender, RoomType } from '../server/types'
import type { SearchFilters, SortKey } from '../lib/api'

const SCHOOLS = [
  'Siquijor State College',
  'Notre Dame of Siquijor',
  'St. Francis of Assisi College',
  'Siquijor Science High School',
]

/** Map the landing page's quick-search `?q=` labels onto filter state. */
function parseQuickQuery(q: string | null): {
  roomTypes: RoomType[]
  gender: Gender | undefined
  amenities: SearchFilters['amenities']
} {
  const out = {
    roomTypes: [] as RoomType[],
    gender: undefined as Gender | undefined,
    amenities: { wifi: false, aircon: false, kitchen: false, laundry: false, parking: false, petFriendly: false, curfew: false },
  }
  if (!q) return out
  const t = q.toLowerCase()
  if (t.includes('wifi')) out.amenities.wifi = true
  if (t.includes('aircon')) out.amenities.aircon = true
  if (t.includes('kitchen')) out.amenities.kitchen = true
  if (t.includes('laundry')) out.amenities.laundry = true
  if (t.includes('parking')) out.amenities.parking = true
  if (t.includes('pet')) out.amenities.petFriendly = true
  if (t.includes('curfew')) out.amenities.curfew = true
  if (t.includes('female')) out.gender = 'female'
  if (t.includes('male') && !t.includes('female')) out.gender = 'male'
  for (const rt of ['bedspace', 'single', 'double', 'studio'] as const) {
    if (t.includes(rt)) out.roomTypes.push(rt)
  }
  return out
}

const MUNICIPALITIES = ['San Juan', 'Siquijor', 'Larena', 'Lazi', 'Maria', 'Enrique Villanueva']
const ROOM_TYPES: RoomType[] = ['bedspace', 'single', 'double', 'studio']
const GENDERS: { value: Gender; label: string }[] = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'female', label: 'Female only' },
  { value: 'male', label: 'Male only' },
]
const AMENITY_KEYS: { key: keyof SearchFilters['amenities']; label: string }[] = [
  { key: 'wifi', label: 'WiFi' },
  { key: 'aircon', label: 'Aircon' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'laundry', label: 'Laundry' },
  { key: 'parking', label: 'Parking' },
  { key: 'petFriendly', label: 'Pet friendly' },
  { key: 'curfew', label: 'Has curfew' },
]

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'available', label: 'Most available' },
]

export default function Search() {
  const [params] = useSearchParams()
  const quick = useMemo(() => parseQuickQuery(params.get('q')), [params])
  const [municipality, setMunicipality] = useState<string | undefined>(params.get('municipality') ?? undefined)
  const [barangay, setBarangay] = useState<string | undefined>(undefined)
  const [school, setSchool] = useState<string | undefined>(undefined)
  const [maxRent, setMaxRent] = useState<number | undefined>(params.get('maxRent') ? Number(params.get('maxRent')) : undefined)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(
    quick.roomTypes.length
      ? quick.roomTypes
      : params.get('roomType') && ROOM_TYPES.includes(params.get('roomType') as RoomType)
        ? [params.get('roomType') as RoomType]
        : [],
  )
  const [gender, setGender] = useState<Gender | undefined>(quick.gender)
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [minRating, setMinRating] = useState<number | undefined>(undefined)
  const [amenities, setAmenities] = useState<SearchFilters['amenities']>(quick.amenities)
  const [sort, setSort] = useState<SortKey>('recommended')
  const [drawer, setDrawer] = useState(false)
  const { data: locations } = useLocations()

  const barangays = locations?.find((l) => l.municipality === municipality)?.barangays ?? []

  const filters = useMemo<SearchFilters>(
    () => ({ municipality, barangay, school, maxRent, roomTypes, gender, onlyAvailable, minRating, amenities }),
    [municipality, barangay, school, maxRent, roomTypes, gender, onlyAvailable, minRating, amenities],
  )
  const { data, isLoading, isFetching } = useHouses(filters, sort)

  const activeCount =
    (municipality ? 1 : 0) +
    (barangay ? 1 : 0) +
    (school ? 1 : 0) +
    (maxRent ? 1 : 0) +
    roomTypes.length +
    (gender ? 1 : 0) +
    (onlyAvailable ? 1 : 0) +
    (minRating ? 1 : 0) +
    Object.values(amenities).filter(Boolean).length

  const resetAll = () => {
    setMunicipality(undefined)
    setBarangay(undefined)
    setSchool(undefined)
    setMaxRent(undefined)
    setRoomTypes([])
    setGender(undefined)
    setOnlyAvailable(false)
    setMinRating(undefined)
    setAmenities({ wifi: false, aircon: false, kitchen: false, laundry: false, parking: false, petFriendly: false, curfew: false })
  }

  const toggleRoomType = (t: RoomType) =>
    setRoomTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  const toggleAmenity = (k: keyof SearchFilters['amenities']) =>
    setAmenities((prev) => ({ ...prev, [k]: !prev[k] }))

  const FilterPanel = (
    <div className="space-y-7">
      {/* Municipality */}
      <div>
        <h4 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-navy-800">
          <MapPin size={14} className="text-brand-500" /> Municipality
        </h4>
        <div className="space-y-1.5">
          {MUNICIPALITIES.map((m) => (
            <label key={m} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm text-ink transition hover:bg-slate-50">
              <input
                type="checkbox"
                checked={municipality === m}
                onChange={() => setMunicipality(municipality === m ? undefined : m)}
                className="h-4 w-4 accent-brand-500"
              />
              {m}
            </label>
          ))}
        </div>
      </div>

      {/* Barangay (only when a municipality is chosen) */}
      {municipality && barangays.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-bold text-navy-800">Barangay</h4>
          <div className="flex flex-wrap gap-2">
            {barangays.map((b) => (
              <button
                key={b}
                onClick={() => setBarangay(barangay === b ? undefined : b)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  barangay === b ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 bg-white text-ink hover:border-brand-300',
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* School nearby */}
      <div>
        <h4 className="mb-3 text-sm font-bold text-navy-800">School nearby</h4>
        <select
          value={school ?? ''}
          onChange={(e) => setSchool(e.target.value || undefined)}
          className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-navy-800 outline-none transition focus:border-brand-400"
        >
          <option value="">Any school</option>
          {SCHOOLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Budget */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-bold text-navy-800">Monthly budget</h4>
          <span className="text-xs font-semibold text-brand-500">{maxRent ? `₱${maxRent.toLocaleString()}` : 'Any'}</span>
        </div>
        <input
          type="range"
          min={1000}
          max={6000}
          step={100}
          value={maxRent ?? 6000}
          onChange={(e) => setMaxRent(Number(e.target.value) >= 6000 ? undefined : Number(e.target.value))}
          className="w-full accent-brand-500"
        />
        <div className="flex justify-between text-[11px] text-mut">
          <span>₱1,000</span>
          <span>₱6,000+</span>
        </div>
      </div>

      {/* Room type */}
      <div>
        <h4 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-navy-800">
          <BedDouble size={14} className="text-brand-500" /> Room type
        </h4>
        <div className="flex flex-wrap gap-2">
          {ROOM_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleRoomType(t)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition',
                roomTypes.includes(t)
                  ? 'border-brand-500 bg-brand-500 text-white shadow-[0_6px_16px_rgb(30_115_232/0.3)]'
                  : 'border-slate-200 bg-white text-ink hover:border-brand-300',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Gender */}
      <div>
        <h4 className="mb-3 text-sm font-bold text-navy-800">Gender policy</h4>
        <div className="space-y-1.5">
          {GENDERS.map((g) => (
            <label key={g.value} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm text-ink transition hover:bg-slate-50">
              <input
                type="radio"
                name="gender"
                checked={gender === g.value}
                onChange={() => setGender(gender === g.value ? undefined : g.value)}
                className="h-4 w-4 accent-brand-500"
              />
              {g.label}
            </label>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <h4 className="mb-3 text-sm font-bold text-navy-800">Amenities</h4>
        <div className="flex flex-wrap gap-2">
          {AMENITY_KEYS.map((a) => (
            <button
              key={a.key}
              onClick={() => toggleAmenity(a.key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                amenities[a.key]
                  ? 'border-navy-800 bg-navy-800 text-white'
                  : 'border-slate-200 bg-white text-ink hover:border-navy-300',
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <h4 className="mb-3 text-sm font-bold text-navy-800">Minimum rating</h4>
        <div className="flex flex-wrap gap-2">
          {[4.5, 4.0, 3.5].map((r) => (
            <button
              key={r}
              onClick={() => setMinRating(minRating === r ? undefined : r)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                minRating === r ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 bg-white text-ink hover:border-brand-300',
              )}
            >
              ★ {r}+
            </button>
          ))}
        </div>
      </div>

      {/* Only available */}
      <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-mint-300">
        <div>
          <p className="text-sm font-bold text-navy-800">Available now</p>
          <p className="text-xs text-ink">Hide fully-occupied houses</p>
        </div>
        <button
          onClick={() => setOnlyAvailable((v) => !v)}
          className={cn('relative h-6 w-11 rounded-full transition', onlyAvailable ? 'bg-mint-400' : 'bg-slate-200')}
          aria-label="Toggle available only"
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
              onlyAvailable ? 'left-[22px]' : 'left-0.5',
            )}
          />
        </button>
      </label>

      {activeCount > 0 && (
        <button onClick={resetAll} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-ink transition hover:border-danger/40 hover:text-danger">
          <X size={14} /> Clear all filters ({activeCount})
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen">
      <Navbar solid />
      <div className="pt-[68px]">
        {/* Page header */}
        <div className="border-b border-slate-200/70 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">Siquijor, Philippines</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-800">Boarding houses</h1>
              <p className="mt-1 text-sm text-ink">
                {isLoading ? 'Searching…' : `${data?.length ?? 0} place${data?.length === 1 ? '' : 's'} found`}
                {municipality ? ` in ${municipality}` : ' across the island'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDrawer(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-brand-300 lg:hidden"
              >
                <SlidersHorizontal size={15} />
                Filters {activeCount > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] text-white">{activeCount}</span>}
              </button>
              <label className="relative inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-navy-800 transition hover:border-brand-300">
                <Filter size={14} className="text-mut" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="cursor-pointer appearance-none bg-transparent pr-5 font-semibold outline-none"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-3 text-mut" />
              </label>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6">
          {/* Desktop filters */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto rounded-[18px] border border-slate-100 bg-white p-5 shadow-card">
              {FilterPanel}
            </div>
          </aside>

          {/* Results */}
          <div className="min-w-0 flex-1">
            {isLoading || isFetching ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[380px] rounded-[18px]" />
                ))}
              </div>
            ) : data && data.length > 0 ? (
              <motion.div layout className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {data.map((h) => (
                  <HouseCard key={h.id} house={h} />
                ))}
              </motion.div>
            ) : (
              <EmptyState
                icon={<MapPin size={22} />}
                title="No boarding houses match your filters"
                subtitle="Try widening your budget or clearing some filters to see more options."
              />
            )}
          </div>
        </div>
      </div>
      <Footer />

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {drawer && (
          <motion.div
            className="fixed inset-0 z-[80] bg-navy-950/50 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawer(false)}
          >
            <motion.div
              className="absolute inset-y-0 left-0 w-[85%] max-w-sm overflow-y-auto bg-white p-6"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-bold text-navy-800">Filters</h3>
                <button onClick={() => setDrawer(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Close filters">
                  <X size={18} />
                </button>
              </div>
              {FilterPanel}
              <button
                onClick={() => setDrawer(false)}
                className="mt-6 w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Show {data?.length ?? 0} results
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
