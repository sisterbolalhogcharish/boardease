import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  BadgeCheck,
  Car,
  ChefHat,
  Clock,
  DoorOpen,
  Heart,
  MapPin,
  MessageCircle,
  PawPrint,
  Phone,
  Send,
  ShieldCheck,
  Snowflake,
  Star,
  Users,
  WashingMachine,
  Wifi,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import HouseCard from '../components/HouseCard'
import Footer from '../components/layout/Footer'
import Navbar from '../components/layout/Navbar'
import { HouseImage, Modal, Rating, Reveal, Skeleton } from '../components/ui'
import { useHouse, useReviews, useSimilarHouses } from '../lib/hooks'
import { cn, peso, prettyDate } from '../lib/utils'
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
  const { data: house, isLoading } = useHouse(id)
  const { data: reviews = [] } = useReviews(id)
  const { data: similar = [] } = useSimilarHouses(id)
  const [active, setActive] = useState(0)
  const [fav, setFav] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [sent, setSent] = useState(false)

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
  const bbox = `${house.lng - 0.012}%2C${house.lat - 0.008}%2C${house.lng + 0.012}%2C${house.lat + 0.008}`

  return (
    <div className="min-h-screen">
      <Navbar solid />
      <div className="pt-[68px]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Link to="/search" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink transition hover:text-brand-500">
            <ArrowLeft size={15} /> Back to search
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
              <button
                onClick={() => setFav((f) => !f)}
                aria-label="Favorite"
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur transition hover:scale-110"
              >
                <Heart size={18} className={fav ? 'fill-danger text-danger' : 'text-slate-600'} />
              </button>
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
                <div className="mt-4 overflow-hidden rounded-[18px] border border-slate-200 shadow-card">
                  <iframe
                    title="Map"
                    className="h-[320px] w-full"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${house.lat}%2C${house.lng}`}
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
                          <span
                            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                            style={{ backgroundColor: r.avatarColor }}
                          >
                            {r.author.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                          </span>
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
                    onClick={() => setContactOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgb(30_115_232/0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600"
                  >
                    <MessageCircle size={16} /> Message landlord
                  </button>
                  <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-500">
                    <Phone size={16} /> Call landlord
                  </button>
                </div>
                <p className="mt-4 text-center text-[11px] text-mut">
                  You'll pay {house.owner.split(' ')[0]} directly · No booking fees
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

      {/* Contact modal */}
      <Modal open={contactOpen} onClose={() => setContactOpen(false)} title={`Message ${house.owner.split(' ')[0]}`}>
        {sent ? (
          <div className="flex flex-col items-center py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mint-50 text-mint-600">
              <Send size={22} />
            </span>
            <h4 className="mt-4 text-lg font-bold text-navy-800">Message sent!</h4>
            <p className="mt-1 max-w-xs text-sm text-ink">
              {house.owner.split(' ')[0]} will get back to you soon. You can also call{' '}
              <span className="font-semibold text-navy-800">0917 555 0100</span>.
            </p>
            <button
              onClick={() => {
                setSent(false)
                setContactOpen(false)
              }}
              className="mt-6 rounded-xl bg-navy-800 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setSent(true)
            }}
            className="space-y-4"
          >
            <p className="text-sm text-ink">Hi! I'm interested in a room at {house.name}. Is it still available?</p>
            <textarea
              required
              rows={4}
              defaultValue={`Hi ${house.owner.split(' ')[0]}! I'm interested in renting at ${house.name}. When can I schedule a viewing?`}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              <Send size={15} /> Send message
            </button>
          </form>
        )}
      </Modal>
    </div>
  )
}
