import { motion } from 'framer-motion'
import {
  BadgeCheck,
  Car,
  ChefHat,
  MapPin,
  PawPrint,
  Snowflake,
  Star,
  WashingMachine,
  Wifi,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { peso } from '../lib/utils'
import type { HouseCard as HouseCardType } from '../lib/api'
import { CompareButton, FavoriteButton } from './boarder/HouseActions'
import { HouseImage, HouseStatusBadge } from './ui'

export function AmenityPills({ house, max = 6 }: { house: HouseCardType; max?: number }) {
  const items = [
    { on: house.wifi, icon: Wifi, label: 'WiFi' },
    { on: house.aircon, icon: Snowflake, label: 'Aircon' },
    { on: house.kitchen, icon: ChefHat, label: 'Kitchen' },
    { on: house.laundry, icon: WashingMachine, label: 'Laundry' },
    { on: house.parking, icon: Car, label: 'Parking' },
    { on: house.petFriendly, icon: PawPrint, label: 'Pets OK' },
  ]
  const shown = items.filter((i) => i.on).slice(0, max)
  if (!shown.length) return <span className="text-xs text-mut">Basic room</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map(({ icon: Icon, label }) => (
        <span
          key={label}
          title={label}
          className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-ink"
        >
          <Icon size={12} className="text-brand-500" />
          {label}
        </span>
      ))}
    </div>
  )
}

export default function HouseCard({ house, index = 0 }: { house: HouseCardType; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: (index % 4) * 0.07, ease: 'easeOut' }}
      whileHover={{ y: -6 }}
      className="group relative flex flex-col overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-card transition-shadow duration-300 hover:shadow-card-hover"
    >
      <Link to={`/houses/${house.id}`} className="flex flex-1 flex-col">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <HouseImage
            src={house.images?.[0]}
            alt={house.name}
            className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-y-0 left-0 flex flex-col gap-1.5 p-3">
            {house.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-navy-800 shadow-sm backdrop-blur">
                <BadgeCheck size={12} className="text-brand-500" /> Verified
              </span>
            )}
            {house.topRated && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-navy-800 shadow-sm backdrop-blur">
                <Star size={12} className="fill-amber-400 text-amber-400" /> Top Rated
              </span>
            )}
          </div>
          <div className="absolute bottom-3 left-3">
            <HouseStatusBadge
              status={house.status as 'available' | 'almost-full' | 'occupied' | 'full'}
              vacant={house.vacant}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-[15px] font-bold text-navy-800">{house.name}</h3>
            <span className="flex shrink-0 items-center gap-1 rounded-lg bg-navy-800 px-1.5 py-0.5 text-xs font-bold text-white">
              <Star size={11} className="fill-amber-400 text-amber-400" />
              {house.rating.toFixed(1)}
            </span>
          </div>
          <p className="flex items-center gap-1 text-[13px] text-ink">
            <MapPin size={13} className="shrink-0 text-brand-500" />
            {house.barangay}, {house.municipality}
          </p>
          <AmenityPills house={house} />
          <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-3">
            <div>
              <p className="text-lg font-bold text-navy-800">
                {peso(house.monthlyRent)}
                <span className="text-xs font-medium text-mut"> /month</span>
              </p>
              <p className="text-[11px] text-mut">
                {house.occupiedRooms}/{house.totalRooms} beds taken
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-mut transition-colors group-hover:text-brand-500">
                {house.reviewsCount} reviews
              </span>
              <span className="mt-1 block text-[11px] font-bold text-brand-500">View details →</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Favorite + compare sit OUTSIDE the Link so they never trigger navigation */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <FavoriteButton houseId={house.id} />
        <CompareButton houseId={house.id} />
      </div>
    </motion.div>
  )
}
