import { motion } from 'framer-motion'
import { BadgeCheck, Building2, MapPin, Search, ShieldCheck, Sparkles, Star } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { HouseImage } from '../ui'

const MUNICIPALITIES = ['Anywhere', 'San Juan', 'Siquijor', 'Larena', 'Lazi', 'Maria', 'Enrique Villanueva']
const ROOM_TYPES = ['Any type', 'Bedspace', 'Single', 'Double', 'Studio']
const MAX_RENT = ['Any budget', '₱1,500', '₱2,000', '₱2,500', '₱3,000', '₱4,000', '₱5,000']

export default function Hero() {
  const navigate = useNavigate()
  const [municipality, setMunicipality] = useState('Anywhere')
  const [roomType, setRoomType] = useState('Any type')
  const [maxRent, setMaxRent] = useState('Any budget')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (municipality !== 'Anywhere') params.set('municipality', municipality)
    if (roomType !== 'Any type') params.set('roomType', roomType.toLowerCase())
    if (maxRent !== 'Any budget') params.set('maxRent', maxRent.replace(/[^0-9]/g, ''))
    navigate(`/search?${params.toString()}`)
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-800 to-brand-700 pb-24 pt-32 text-white sm:pb-32">
      <div className="hero-grid-bg absolute inset-0" />
      <div className="hero-blob -top-20 left-1/4 h-96 w-96 bg-brand-500" />
      <div className="hero-blob right-10 top-40 h-80 w-80 bg-mint-400" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Copy */}
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }}>
          <span className="glass-dark inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-mint-300">
            <Sparkles size={14} />
            The smartest way to find & manage boarding houses in Siquijor
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[56px]">
            Find Your Perfect{' '}
            <span className="text-gradient">Boarding House</span> in Siquijor.
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-navy-100/85">
            Search, compare, review, and rent trusted boarding houses while helping landlords manage everything in one
            smart platform.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#search"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgb(30_115_232/0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-400"
            >
              <Search size={17} /> Search now
            </a>
            <a
              href="#featured"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/10"
            >
              Explore listings
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
            {[
              { value: '40+', label: 'Verified listings' },
              { value: '4.9', label: 'Average rating' },
              { value: '500+', label: 'Happy boarders' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs font-medium text-navy-200">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Visual collage */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
          className="relative hidden lg:block"
        >
          <div className="relative mx-auto h-[440px] w-[380px] rotate-2 overflow-hidden rounded-[28px] shadow-float ring-1 ring-white/20">
            <HouseImage src="https://picsum.photos/seed/hero-main/800/1000" alt="Boarding house" className="h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 via-transparent to-transparent" />
          </div>
          <div className="absolute -left-10 top-16 h-44 w-56 -rotate-6 overflow-hidden rounded-2xl shadow-float ring-1 ring-white/20">
            <HouseImage src="https://picsum.photos/seed/hero-room/600/500" alt="Room" className="h-full w-full" />
          </div>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="glass-dark absolute -right-4 top-8 flex items-center gap-2 rounded-2xl px-4 py-3 shadow-float"
          >
            <ShieldCheck size={18} className="text-mint-400" />
            <div>
              <p className="text-xs font-bold">Verified landlord</p>
              <p className="text-[10px] text-navy-200">Checked & approved</p>
            </div>
          </motion.div>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="glass-dark absolute -left-6 bottom-24 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-float"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mint-400/20 text-mint-300">
              <Building2 size={17} />
            </span>
            <div>
              <p className="text-sm font-bold">₱2,500/mo</p>
              <p className="flex items-center gap-1 text-[10px] text-navy-200">
                <Star size={10} className="fill-amber-400 text-amber-400" /> 4.9 · Sunset Boarding House
              </p>
            </div>
          </motion.div>
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="glass-dark absolute bottom-4 right-10 flex items-center gap-2 rounded-full px-4 py-2 shadow-float"
          >
            <BadgeCheck size={15} className="text-mint-400" />
            <p className="text-xs font-semibold">Only 2 beds left this week</p>
          </motion.div>
        </motion.div>
      </div>

      {/* Smart search bar */}
      <motion.div
        id="search"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.35, ease: 'easeOut' }}
        className="relative mx-auto mt-16 max-w-4xl px-4 sm:px-6"
      >
        <form
          onSubmit={onSubmit}
          className="glass grid gap-2 rounded-[22px] p-3 shadow-float sm:grid-cols-[1.2fr_1fr_1fr_auto]"
        >
          <label className="group flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition hover:bg-navy-50/60">
            <MapPin size={18} className="shrink-0 text-brand-500" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-mut">Municipality</span>
              <select
                name="municipality"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                className="w-full cursor-pointer appearance-none bg-transparent text-sm font-semibold text-navy-800 outline-none"
              >
                {MUNICIPALITIES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition hover:bg-navy-50/60">
            <Building2 size={18} className="shrink-0 text-brand-500" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-mut">Room type</span>
              <select
                name="roomType"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full cursor-pointer appearance-none bg-transparent text-sm font-semibold text-navy-800 outline-none"
              >
                {ROOM_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition hover:bg-navy-50/60">
            <span className="text-brand-500">₱</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-mut">Max rent</span>
              <select
                name="maxRent"
                value={maxRent}
                onChange={(e) => setMaxRent(e.target.value)}
                className="w-full cursor-pointer appearance-none bg-transparent text-sm font-semibold text-navy-800 outline-none"
              >
                {MAX_RENT.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </span>
          </label>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgb(30_115_232/0.4)] transition-all duration-300 hover:bg-brand-600 hover:shadow-[0_12px_28px_rgb(30_115_232/0.5)]"
          >
            <Search size={17} /> Search
          </button>
        </form>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-navy-200">
          <span className="font-medium text-navy-100/70">Popular:</span>
          {['WiFi', 'Aircon', 'Female only', 'Near SSC', 'Studio'].map((chip) => (
            <button
              key={chip}
              onClick={() => navigate(`/search?q=${encodeURIComponent(chip)}`)}
              className="glass-dark rounded-full px-3 py-1.5 font-medium transition hover:border-mint-400/40 hover:text-mint-300"
            >
              {chip}
            </button>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
