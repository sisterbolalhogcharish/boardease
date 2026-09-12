import { AnimatePresence, motion } from 'framer-motion'
import {
  BedDouble,
  ChevronDown,
  Filter,
  List,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import HouseCard from '../../components/HouseCard'
import LocationMap, { hasCoordinates } from '../../components/boarder/LocationMap'
import { EmptyState, HouseImage, Skeleton } from '../../components/ui'
import { useHouses, useLocations } from '../../lib/hooks'
import { cn, peso } from '../../lib/utils'
import type { Gender, RoomType } from '../../server/types'
import type { SearchFilters, SortKey } from '../../lib/api'

const SCHOOLS = [
  'Siquijor State College',
  'Notre Dame of Siquijor',
  'St. Francis of Assisi College',
  'Siquijor Science High School',
]

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
  { value: 'price-asc', label: 'Lowest rent' },
  { value: 'price-desc', label: 'Highest rent' },
  { value: 'available', label: 'Most available' },
  { value: 'rating', label: 'Highest rated' },
]

export default function BoarderBrowse() {
  const [params] = useSearchParams()
  const quick = useMemo(() => parseQuickQuery(params.get('q')), [params])
  const [searchInput, setSearchInput] = useState(params.get('q') ?? '')
  const [q, setQ] = useState(params.get('q') ?? '')
  const [municipality, setMunicipality] = useState<string | undefined>(params.get('municipality') ?? undefined)
  const [barangay, setBarangay] = useState<string | undefined>(undefined)
  const [school, setSchool] = useState<string | undefined>(undefined)
  const [maxRent, setMaxRent] = useState<number | undefined>(params.get('maxRent') ? Number(params.get('maxRent')) : undefined)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(quick.roomTypes.length ? quick.roomTypes : [])
  const [gender, setGender] = useState<Gender | undefined>(quick.gender)
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [minRating, setMinRating] = useState<number | undefined>(undefined)
  const [amenities, setAmenities] = useState<SearchFilters['amenities']>(quick.amenities)
  const [sort, setSort] = useState<SortKey>('recommended')
  const [drawer, setDrawer] = useState(false)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [mapHouseId, setMapHouseId] = useState<string | null>(null)
  const { data: locations } = useLocations()

  // Debounce the free-text search so we do not query on every keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setQ(searchInput), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const barangays = locations?.find((l) => l.municipality === municipality)?.barangays ?? []

  const filters = useMemo<SearchFilters>(
    () => ({ q, municipality, barangay, school, maxRent, roomTypes, gender, onlyAvailable, minRating, amenities }),
    [q, municipality, barangay, school, maxRent, roomTypes, gender, onlyAvailable, minRating, amenities],
  )
  const { data, isLoading, isFetching } = useHouses(filters, sort)

  const activeChips: { label: string; clear: () => void }[] = [
    ...(q ? [{ label: `“${q}”`, clear: () => { setSearchInput(''); setQ('') } }] : []),
    ...(municipality ? [{ label: municipality, clear: () => { setMunicipality(undefined); setBarangay(undefined) } }] : []),
    ...(barangay ? [{ label: barangay, clear: () => setBarangay(undefined) }] : []),
    ...(school ? [{ label: school, clear: () => setSchool(undefined) }] : []),
    ...(maxRent ? [{ label: `≤ ${peso(maxRent)}`, clear: () => setMaxRent(undefined) }] : []),
    ...roomTypes.map((t) => ({ label: t, clear: () => setRoomTypes((prev) => prev.filter((x) => x !== t)) })),
    ...(gender ? [{ label: GENDERS.find((g) => g.value === gender)?.label ?? gender, clear: () => setGender(undefined) }] : []),
    ...(minRating ? [{ label: `★ ${minRating}+`, clear: () => setMinRating(undefined) }] : []),
    ...(onlyAvailable ? [{ label: 'Available now', clear: () => setOnlyAvailable(false) }] : []),
    ...Object.entries(amenities)
      .filter(([, on]) => on)
      .map(([key]) => ({
        label: AMENITY_KEYS.find((a) => a.key === key)?.label ?? key,
        clear: () => setAmenities((prev) => ({ ...prev, [key]: false })),
      })),
  ]

  const resetAll = () => {
    setSearchInput('')
    setQ('')
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
                onChange={() => {
                  setMunicipality(municipality === m ? undefined : m)
                  setBarangay(undefined)
                }}
                className="h-4 w-4 accent-brand-500"
              />
              {m}
            </label>
          ))}
        </div>
      </div>
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
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-bold text-navy-800">Monthly budget</h4>
          <span className="text-xs font-semibold text-brand-500">{maxRent ? peso(maxRent) : 'Any'}</span>
        </div>
        <input
          type="range"
          min={1000}
          max={6000}
          step={100}
          value={maxRent ?? 6000}
          onChange={(e) => setMaxRent(Number(e.target.value) >= 6000 ? undefined : Number(e.target.value))}
          className="w-full accent-brand-500"
          aria-label="Maximum monthly rent"
        />
        <div className="flex justify-between text-[11px] text-mut">
          <span>₱1,000</span>
          <span>₱6,000+</span>
        </div>
      </div>
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
      <div>
        <h4 className="mb-3 text-sm font-bold text-navy-800">Amenities</h4>
        <div className="flex flex-wrap gap-2">
          {AMENITY_KEYS.map((a) => (
            <button
              key={a.key}
              onClick={() => toggleAmenity(a.key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                amenities[a.key] ? 'border-navy-800 bg-navy-800 text-white' : 'border-slate-200 bg-white text-ink hover:border-navy-300',
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
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
      <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-mint-300">
        <div>
          <p className="text-sm font-bold text-navy-800">Available now</p>
          <p className="text-xs text-ink">Hide fully-occupied houses</p>
        </div>
        <button
          onClick={() => setOnlyAvailable((v) => !v)}
          className={cn('relative h-6 w-11 rounded-full transition', onlyAvailable ? 'bg-mint-400' : 'bg-slate-200')}
          aria-label="Toggle available only"
          aria-pressed={onlyAvailable}
        >
          <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', onlyAvailable ? 'left-[22px]' : 'left-0.5')} />
        </button>
      </label>
      {activeChips.length > 0 && (
        <button
          onClick={resetAll}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-ink transition hover:border-danger/40 hover:text-danger"
        >
          <X size={14} /> Clear all filters ({activeChips.length})
        </button>
      )}
    </div>
  )

  const selectedMapHouse =
    (data ?? []).find((h) => h.id === mapHouseId) ?? (data ?? []).find((h) => hasCoordinates(h)) ?? (data ?? [])[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">Browse</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-navy-800">Boarding Houses in Siquijor</h2>
          <p className="mt-1 text-sm text-ink">
            {isLoading ? 'Searching…' : `${data?.length ?? 0} boarding house${data?.length === 1 ? '' : 's'} found`}
            {activeChips.length > 0 && ` · ${activeChips.length} filter${activeChips.length === 1 ? '' : 's'} active`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-full border border-slate-200 bg-white p-1">
            <button
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                view === 'list' ? 'bg-navy-800 text-white' : 'text-ink hover:text-navy-800',
              )}
            >
              <List size={13} /> List
            </button>
            <button
              onClick={() => setView('map')}
              aria-pressed={view === 'map'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                view === 'map' ? 'bg-navy-800 text-white' : 'text-ink hover:text-navy-800',
              )}
            >
              <MapPin size={13} /> Map
            </button>
          </div>
          <button
            onClick={() => setDrawer(true)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-brand-300 lg:hidden"
          >
            <SlidersHorizontal size={15} /> Filters
            {activeChips.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] text-white">{activeChips.length}</span>
            )}
          </button>
          <label className="relative inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-navy-800 transition hover:border-brand-300">
            <Filter size={14} className="text-mut" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="cursor-pointer appearance-none bg-transparent pr-5 font-semibold outline-none"
              aria-label="Sort results"
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

      {/* Search */}
      <div className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-card">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-mut" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by boarding house name, location, room type or amenity…"
            aria-label="Search boarding houses"
            className="w-full rounded-xl border border-slate-200 bg-surface py-3 pl-11 pr-11 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-mut transition hover:bg-slate-100 hover:text-navy-800"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {activeChips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-mut">Active filters</span>
            {activeChips.map((chip, i) => (
              <button
                key={`${chip.label}-${i}`}
                onClick={chip.clear}
                className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold capitalize text-brand-600 transition hover:bg-brand-100"
              >
                {chip.label} <X size={11} />
              </button>
            ))}
            <button onClick={resetAll} className="text-[11px] font-bold text-danger hover:underline">
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto rounded-[18px] border border-slate-100 bg-white p-5 shadow-card">
            {FilterPanel}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {isLoading || isFetching ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[380px] rounded-[18px]" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon={<MapPin size={22} />}
              title="No boarding houses match your search"
              subtitle="Try a different keyword, widen your budget, or clear some filters."
            />
          ) : view === 'map' ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="min-w-0 space-y-4">
                {selectedMapHouse ? (
                  <LocationMap
                    location={{
                      name: selectedMapHouse.name,
                      address: selectedMapHouse.address,
                      lat: selectedMapHouse.lat,
                      lng: selectedMapHouse.lng,
                    }}
                    height={380}
                  />
                ) : null}
                <p className="text-xs text-ink">
                  Map preview uses OpenStreetMap, so no API key is needed. Only boarding houses that published
                  coordinates can be pinned — we never estimate locations.
                </p>
              </div>
              <div className="max-h-[560px] space-y-2 overflow-y-auto rounded-[18px] border border-slate-100 bg-white p-3 shadow-card">
                {data.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setMapHouseId(h.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition',
                      selectedMapHouse?.id === h.id ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-surface',
                    )}
                  >
                    <HouseImage src={h.images?.[0]} alt={h.name} className="h-12 w-12 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-navy-800">{h.name}</span>
                      <span className="block truncate text-[11px] text-mut">
                        {h.barangay}, {h.municipality} · {peso(h.monthlyRent)}
                      </span>
                      {!hasCoordinates(h) && <span className="block text-[10px] font-semibold text-amber-soft">No map pin published</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <motion.div layout className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {data.map((h, i) => (
                <HouseCard key={h.id} house={h} index={i} />
              ))}
            </motion.div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-slate-100 bg-white p-4 shadow-card">
            <p className="text-sm text-ink">
              Can&apos;t decide? Select up to 4 houses and compare them side by side.
            </p>
            <div className="flex gap-2">
              <Link
                to="/boarder/compare"
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-500"
              >
                Compare Houses
              </Link>
              <Link
                to="/boarder/favorites"
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-navy-800 transition hover:border-mint-300 hover:text-mint-600"
              >
                View Favorites
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
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
