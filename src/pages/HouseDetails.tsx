import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  BadgeCheck,
  BedDouble,
  CalendarClock,
  Car,
  ChefHat,
  Clock,
  DoorOpen,
  MapPin,
  MessageCircle,
  PawPrint,
  Phone,
  ShieldCheck,
  Snowflake,
  Star,
  Users,
  WashingMachine,
  Wifi,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import HouseCard from '../components/HouseCard'
import ContactOwnerModal from '../components/boarder/ContactOwnerModal'
import { CompareButton, FavoriteButton, showToast } from '../components/boarder/HouseActions'
import LocationMap from '../components/boarder/LocationMap'
import ReservationModal from '../components/boarder/ReservationModal'
import Footer from '../components/layout/Footer'
import Navbar from '../components/layout/Navbar'
import { Avatar, HouseImage, Rating, Reveal, Skeleton } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useHouse, usePublicRooms, useReviews, useSimilarHouses } from '../lib/hooks'
import { cn, peso, prettyDate } from '../lib/utils'
import type { PublicRoom } from '../lib/api'
import type { ReviewRating } from '../server/types'

const RATING_CATEGORIES: { key: keyof ReviewRating; label: string }[] = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'safety', label: 'Safety' },
  { key: 'comfort', label: 'Comfort' },
  { key: 'internet', label: 'Internet' },
  { key: 'owner', label: 'Owner' },
  { key: 'location', label: 'Location' },
  { key: 'value', label: 'Value' },
]

export default function HouseDetails() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: house, isLoading } = useHouse(id)
  const { data: reviews = [] } = useReviews(id)
  const { data: similar = [] } = useSimilarHouses(id)
  const { data: rooms = [] } = usePublicRooms(id)
  const [active, setActive] = useState(0)
  const [contactOpen, setContactOpen] = useState(false)
  const [reserveOpen, setReserveOpen] = useState(false)

  // Deep link: /houses/:id?reserve=1 opens the reservation request straight away.
  useEffect(() => {
    if (params.get('reserve') === '1' && user?.role === 'boarder') setReserveOpen(true)
  }, [params, user?.role])

  const categoryAverages = useMemo(() => {
    const sums = {} as Record<keyof ReviewRating, number>
    RATING_CATEGORIES.forEach((c) => (sums[c.key] = 0))
    reviews.forEach((r) => RATING_CATEGORIES.forEach((c) => (sums[c.key] += r.categories[c.key])))
    const avg = {} as Record<keyof ReviewRating, number>
    RATING_CATEGORIES.forEach((c) => (avg[c.key] = reviews.length ? Math.round((sums[c.key] / reviews.length) * 10) / 10 : 0))
    return avg
  }, [reviews])

  if (isLoading || !house) {
    return (
      <div className="min-h-screen">
        <Navbar solid />
        <div className="mx-auto max-w-7xl px-4 pt-28 sm:px-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-6 h-[420px] rounded-[24px]" />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            <Skeleton className="h-96 rounded-[18px]" />
            <Skeleton className="h-96 rounded-[18px]" />
          </div>
        </div>
      </div>
    )
  }

  const vacant = house.vacant
  const amenities = [
    { on: house.wifi, icon: Wifi, label: 'WiFi' },
    { on: house.aircon, icon: Snowflake, label: 'Aircon' },
    { on: house.kitchen, icon: ChefHat, label: 'Kitchen' },
    { on: house.laundry, icon: WashingMachine, label: 'Laundry' },
    { on: house.parking, icon: Car, label: 'Parking' },
    { on: house.petFriendly, icon: PawPrint, label: 'Pet friendly' },
  ]
  return (
    <div className="min-h-screen">
      <Navbar solid />
      <div className="pt-[68px]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Link
            to={user?.role === 'boarder' ? '/boarder/browse' : '/search'}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink transition hover:text-brand-500"
          >
            <ArrowLeft size={15} /> {user?.role === 'boarder' ? 'Back to Browse Houses' : 'Back to search'}
          </Link>

          {/* Gallery */}
          <div className="mt-5 grid gap-3 lg:grid-cols-[2fr_1fr]">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[22px] shadow-card lg:aspect-auto lg:h-[440px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="h-full w-full"
                >
                  <HouseImage src={house.images[active]} alt={`${house.name} photo ${active + 1}`} className="h-full w-full" />
                </motion.div>
              </AnimatePresence>
              <div className="absolute right-4 top-4 flex flex-col gap-2">
                <FavoriteButton houseId={house.id} />
                <CompareButton houseId={house.id} />
              </div>
              {house.verified && (
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-navy-800 shadow-md backdrop-blur">
                  <BadgeCheck size={14} className="text-brand-500" /> Verified listing
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
              {house.images.slice(0, 3).map((img, i) => (
                <button
                  key={img + i}
                  onClick={() => setActive(i)}
                  className={cn(
                    'group relative h-24 overflow-hidden rounded-xl transition lg:h-[140px]',
                    active === i ? 'ring-2 ring-brand-500 ring-offset-2' : 'opacity-80 hover:opacity-100',
                  )}
                >
                  <HouseImage src={img} alt="" className="h-full w-full transition-transform duration-300 group-hover:scale-105" />
                </button>
              ))}
            </div>
          </div>

          {/* Title + sticky booking card */}
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {house.topRated && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-soft">
                    <Star size={12} className="fill-amber-400 text-amber-400" /> Top Rated
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy-800">
                  {house.roomTypes.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(' · ')}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2.5 py-1 text-xs font-bold text-mint-600">
                  {house.gender === 'mixed' ? 'Mixed' : house.gender === 'female' ? 'Female only' : 'Male only'}
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-800 sm:text-4xl">{house.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink">
                <span className="flex items-center gap-1.5 font-semibold text-navy-800">
                  <Rating value={house.rating} /> {house.rating.toFixed(1)}
                  <span className="font-normal text-mut">({house.reviewsCount} reviews)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} className="text-brand-500" /> {house.address}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={15} className="text-brand-500" /> Curfew {house.curfew}
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-mut">
                {house.distanceFromSchool} to {house.schoolNearby.join(' · ')}
              </p>

              {/* Description */}
              <Reveal className="mt-8">
                <h2 className="text-xl font-bold text-navy-800">About this boarding house</h2>
                <p className="mt-3 leading-relaxed text-ink">{house.description}</p>
              </Reveal>

              {/* Amenities */}
              <Reveal className="mt-10">
                <h2 className="text-xl font-bold text-navy-800">What this place offers</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {amenities.map((a) => (
                    <div
                      key={a.label}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border p-4 text-sm font-semibold',
                        a.on ? 'border-mint-100 bg-mint-50/60 text-navy-800' : 'border-slate-100 bg-slate-50 text-mut line-through decoration-slate-300',
                      )}
                    >
                      <a.icon size={18} className={a.on ? 'text-mint-600' : 'text-slate-300'} />
                      {a.label}
                    </div>
                  ))}
                </div>
              </Reveal>

              {/* Public room availability (never shows tenant names) */}
              <Reveal className="mt-10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-bold text-navy-800">Available rooms</h2>
                  <span className="text-xs text-mut">{vacant} of {house.totalRooms} bed{house.totalRooms === 1 ? '' : 's'} free</span>
                </div>
                {rooms.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-slate-100 bg-surface p-5 text-sm text-ink">
                    The owner has not published individual rooms yet. Send a message to ask about availability.
                  </p>
                ) : (
                  <>
                    <div className="mt-4 space-y-3">
                      {rooms.map((room: PublicRoom) => (
                        <div
                          key={room.id}
                          className={cn(
                            'flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4',
                            room.available > 0 ? 'border-mint-100 bg-mint-50/40' : 'border-slate-100 bg-surface',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                'flex h-10 w-10 items-center justify-center rounded-xl',
                                room.available > 0 ? 'bg-mint-100 text-mint-600' : 'bg-slate-100 text-slate-400',
                              )}
                            >
                              <BedDouble size={18} />
                            </span>
                            <div>
                              <p className="text-sm font-bold text-navy-800">
                                Room {room.roomNo} · <span className="capitalize">{room.type}</span>
                              </p>
                              <p className="text-xs text-ink">
                                {peso(room.monthlyRent)}/month · sleeps {room.capacity} ·{' '}
                                {room.gender === 'mixed' ? 'Mixed' : room.gender === 'female' ? 'Female only' : 'Male only'}
                                {room.aircon ? ' · aircon' : ''}
                              </p>
                            </div>
                          </div>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                              room.available > 0
                                ? 'border-mint-100 bg-white text-mint-600'
                                : 'border-slate-200 bg-white text-slate-500',
                            )}
                          >
                            {room.available > 0
                              ? `Available · ${room.available} slot${room.available === 1 ? '' : 's'}`
                              : 'Not available · fully occupied'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] text-mut">
                      Occupancy shows availability only — BoardEase never publishes tenant names.
                    </p>
                  </>
                )}
              </Reveal>

              {/* Rules */}
              <Reveal className="mt-10">
                <h2 className="text-xl font-bold text-navy-800">House rules</h2>
                <ul className="mt-4 space-y-2.5">
                  {house.rules.map((r) => (
                    <li key={r} className="flex items-start gap-2.5 text-sm text-ink">
                      <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-500" /> {r}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-navy-800">
                    <Clock size={16} className="text-brand-500" /> Curfew: {house.curfew}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-navy-800">
                    <DoorOpen size={16} className="text-brand-500" /> {house.visitorPolicy}
                  </span>
                </div>
              </Reveal>

              {/* Map */}
              <Reveal className="mt-10">
                <h2 className="text-xl font-bold text-navy-800">Where you'll be</h2>
                <p className="mt-1 text-sm text-ink">{house.address}</p>
                <div className="mt-4">
                  <LocationMap
                    location={{ name: house.name, address: house.address, lat: house.lat, lng: house.lng }}
                    height={320}
                  />
                </div>
              </Reveal>

              {/* Reviews */}
              <Reveal className="mt-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-navy-800">Guest reviews</h2>
                  <span className="text-sm font-semibold text-mut">{reviews.length} reviews</span>
                </div>
                {reviews.length > 0 && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {RATING_CATEGORIES.map((c) => (
                      <div key={c.key} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3">
                        <span className="text-sm font-medium text-ink">{c.label}</span>
                        <div className="flex flex-1 items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${(categoryAverages[c.key] / 5) * 100}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-mint-400"
                            />
                          </div>
                          <span className="w-8 text-right text-sm font-bold text-navy-800">{categoryAverages[c.key].toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6 space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={r.avatarUrl} name={r.author} color={r.avatarColor} className="h-10 w-10 text-sm" rounded="full" />
                          <div>
                            <p className="text-sm font-bold text-navy-800">{r.author}</p>
                            <p className="text-xs text-mut">{prettyDate(r.date)}</p>
                          </div>
                        </div>
                        <Rating value={r.rating} />
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-ink">{r.comment}</p>
                      {r.reply && (
                        <div className="mt-3 rounded-xl bg-mint-50/70 p-3 text-sm">
                          <p className="text-xs font-bold uppercase tracking-wide text-mint-600">Owner reply</p>
                          <p className="mt-1 text-ink">{r.reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* Sticky contact card */}
            <div>
              <div className="sticky top-24 rounded-[22px] border border-slate-100 bg-white p-6 shadow-card-hover">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl font-extrabold text-navy-800">
                      {peso(house.monthlyRent)}
                      <span className="text-sm font-medium text-mut"> /month</span>
                    </p>
                    <p className="mt-0.5 text-xs text-mut">from {peso(Math.min(house.monthlyRent, 1500))} for bedspace</p>
                  </div>
                  <span
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-xl',
                      vacant > 0 ? 'bg-mint-50 text-mint-600' : 'bg-red-50 text-danger',
                    )}
                  >
                    <Users size={20} />
                  </span>
                </div>

                <div className="mt-5 rounded-2xl bg-surface p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink">Available</span>
                    <span className="font-bold text-navy-800">{vacant} beds</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${((house.occupiedRooms / house.totalRooms) * 100).toFixed(1)}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className={cn('h-full rounded-full', vacant <= 2 ? 'bg-amber-soft' : vacant === 0 ? 'bg-danger' : 'bg-gradient-to-r from-brand-500 to-mint-400')}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-mut">
                    <span>{house.occupiedRooms} occupied</span>
                    <span>{house.totalRooms} total beds</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-navy-800 to-navy-600 text-sm font-bold text-white">
                    {house.ownerInitials}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-navy-800">{house.owner}</p>
                    <p className="text-xs text-mut">Verified landlord</p>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  <button
                    onClick={() => {
                      if (!user) {
                        navigate('/login')
                        return
                      }
                      if (user.role !== 'boarder') {
                        showToast('Only boarder accounts can request a reservation.')
                        return
                      }
                      setReserveOpen(true)
                    }}
                    disabled={vacant === 0}
                    className={cn(
                      'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-300',
                      vacant === 0
                        ? 'cursor-not-allowed bg-slate-100 text-mut'
                        : 'bg-brand-500 text-white shadow-[0_10px_24px_rgb(30_115_232/0.35)] hover:-translate-y-0.5 hover:bg-brand-600',
                    )}
                  >
                    <CalendarClock size={16} /> {vacant === 0 ? 'Fully occupied' : 'Request Reservation'}
                  </button>
                  <button
                    onClick={() => setContactOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-navy-800 transition hover:border-mint-300 hover:text-mint-600"
                  >
                    <MessageCircle size={16} /> Contact Owner
                  </button>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <FavoriteButton houseId={house.id} variant="button" />
                    <CompareButton houseId={house.id} variant="button" />
                  </div>
                  <button
                    onClick={() => showToast("This owner has not published a phone number — send a message instead.")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-500"
                  >
                    <Phone size={16} /> Call landlord
                  </button>
                </div>
                <p className="mt-4 text-center text-[11px] text-mut">
                  You'll pay {house.owner.split(' ')[0]} directly · No booking fees · No online payment
                </p>
              </div>
            </div>
          </div>

          {/* Similar houses */}
          {similar.length > 0 && (
            <div className="mt-16">
              <Reveal>
                <h2 className="text-2xl font-bold tracking-tight text-navy-800">Similar boarding houses</h2>
              </Reveal>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {similar.map((h, i) => (
                  <HouseCard key={h.id} house={h} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />

      {/* Contact owner + reservation request (both reuse the shared boarder flows) */}
      <ContactOwnerModal open={contactOpen} onClose={() => setContactOpen(false)} house={house} />
      <ReservationModal open={reserveOpen} onClose={() => setReserveOpen(false)} house={house} rooms={rooms} />
    </div>
  )
}
