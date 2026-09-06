import { animate, motion, useInView } from 'framer-motion'
import {
  ArrowRight,
  BedDouble,
  Bot,
  Car,
  CreditCard,
  DoorOpen,
  HeartHandshake,
  LineChart,
  Quote,
  School,
  Snowflake,
  Sparkles,
  Star,
  Venus,
  Wifi,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFeaturedHouses, useLocations } from '../../lib/hooks'
import { useLanguage } from '../../lib/i18n'
import { cn } from '../../lib/utils'
import HouseCard from '../HouseCard'
import { HouseImage, Reveal, SectionHeading, Skeleton } from '../ui'

/* ------------------------------------------------------------------ */
/*  Featured houses                                                    */
/* ------------------------------------------------------------------ */
export function FeaturedHouses() {
  const { data, isLoading } = useFeaturedHouses()
  const { t } = useLanguage()
  return (
    <section id="featured" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow={t('featured.eyebrow')}
          title={t('featured.title')}
          subtitle={t('featured.subtitle')}
        />
        <Reveal delay={0.1}>
          <Link
            to="/search"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-500"
          >
            {t('featured.viewAll')} <ArrowRight size={15} />
          </Link>
        </Reveal>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[360px] rounded-[18px]" />)
          : data?.map((h, i) => <HouseCard key={h.id} house={h} index={i} />)}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Popular locations                                                  */
/* ------------------------------------------------------------------ */
export function Locations() {
  const { data } = useLocations()
  const { t } = useLanguage()
  return (
    <section id="locations" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          center
          eyebrow={t('locations.eyebrow')}
          title={t('locations.title')}
          subtitle={t('locations.subtitle')}
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((loc, i) => (
            <Reveal key={loc.municipality} delay={i * 0.06}>
              <Link
                to={`/search?municipality=${encodeURIComponent(loc.municipality)}`}
                className="group relative block h-52 overflow-hidden rounded-[18px] shadow-card transition-shadow hover:shadow-card-hover"
              >
                <HouseImage
                  src={loc.image}
                  alt={loc.municipality}
                  className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/20 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 flex items-end justify-between p-5">
                  <div>
                    <h3 className="text-lg font-bold text-white">{loc.municipality}</h3>
                    <p className="text-xs text-navy-200">
                      {loc.count} {loc.count > 1 ? t('locations.housesPlural') : t('locations.houses')} · {loc.barangays.slice(0, 2).join(', ')}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition group-hover:bg-brand-500">
                    <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Categories                                                         */
/* ------------------------------------------------------------------ */
const CATEGORY_DEFS = [
  { icon: BedDouble, labelKey: 'categories.bedspace', descKey: 'categories.bedspaceDesc', query: 'Bedspace', color: 'bg-brand-50 text-brand-500' },
  { icon: DoorOpen, labelKey: 'categories.private', descKey: 'categories.privateDesc', query: 'Private Rooms', color: 'bg-navy-50 text-navy-800' },
  { icon: Snowflake, labelKey: 'categories.aircon', descKey: 'categories.airconDesc', query: 'With Aircon', color: 'bg-mint-50 text-mint-600' },
  { icon: Venus, labelKey: 'categories.female', descKey: 'categories.femaleDesc', query: 'Female Only', color: 'bg-pink-50 text-pink-500' },
  { icon: School, labelKey: 'categories.school', descKey: 'categories.schoolDesc', query: 'Near School', color: 'bg-amber-50 text-amber-soft' },
  { icon: Wifi, labelKey: 'categories.wifi', descKey: 'categories.wifiDesc', query: 'Fast WiFi', color: 'bg-indigo-50 text-indigo-500' },
  { icon: Car, labelKey: 'categories.parking', descKey: 'categories.parkingDesc', query: 'With Parking', color: 'bg-emerald-50 text-emerald-600' },
  { icon: CreditCard, labelKey: 'categories.gcash', descKey: 'categories.gcashDesc', query: 'Pay via GCash', color: 'bg-rose-50 text-rose-500' },
]

export function Categories() {
  const { t } = useLanguage()
  return (
    <section id="categories" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeading
        center
        eyebrow={t('categories.eyebrow')}
        title={t('categories.title')}
        subtitle={t('categories.subtitle')}
      />
      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {CATEGORY_DEFS.map((c, i) => (
          <Reveal key={c.query} delay={i * 0.04}>
            <Link
              to={`/search?q=${encodeURIComponent(c.query)}`}
              className="group flex flex-col items-start gap-3 rounded-[18px] border border-slate-100 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
            >
              <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110', c.color)}>
                <c.icon size={20} />
              </span>
              <div>
                <p className="text-sm font-bold text-navy-800">{t(c.labelKey)}</p>
                <p className="mt-0.5 text-xs text-ink">{t(c.descKey)}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Stats + benefits                                                   */
/* ------------------------------------------------------------------ */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    const controls = animate(0, to, { duration: 1.8, ease: 'easeOut', onUpdate: (v) => setVal(Math.round(v)) })
    return () => controls.stop()
  }, [inView, to])
  return (
    <span ref={ref}>
      {val.toLocaleString()}
      {suffix}
    </span>
  )
}

const STAT_DEFS = [
  { value: 40, suffix: '+', labelKey: 'stats.listed' },
  { value: 500, suffix: '+', labelKey: 'stats.served' },
  { value: 96, suffix: '%', labelKey: 'stats.collections' },
  { value: 6, suffix: '', labelKey: 'stats.municipalities' },
]

const BENEFIT_DEFS = [
  { icon: Bot, titleKey: 'stats.aiTitle', descKey: 'stats.aiDesc' },
  { icon: LineChart, titleKey: 'stats.analyticsTitle', descKey: 'stats.analyticsDesc' },
  { icon: Sparkles, titleKey: 'stats.receiptsTitle', descKey: 'stats.receiptsDesc' },
  { icon: HeartHandshake, titleKey: 'stats.trustedTitle', descKey: 'stats.trustedDesc' },
]

export function StatsBenefits() {
  const { t } = useLanguage()
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow={t('stats.eyebrow')}
            title={t('stats.title')}
            subtitle={t('stats.subtitle')}
          />
          <div className="mt-8 space-y-5">
            {BENEFIT_DEFS.map((b, i) => (
              <Reveal key={b.titleKey} delay={i * 0.06}>
                <div className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-card transition hover:shadow-card-hover">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy-800 to-brand-500 text-white">
                    <b.icon size={20} />
                  </span>
                  <div>
                    <p className="font-bold text-navy-800">{t(b.titleKey)}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink">{t(b.descKey)}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="relative">
          <Reveal>
            <div className="relative overflow-hidden rounded-[24px] shadow-card-hover">
              <HouseImage
                src="https://picsum.photos/seed/stats-building/900/600"
                alt="Boarding house management"
                className="h-[420px] w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-transparent to-transparent" />
            </div>
          </Reveal>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-6 -left-4 rounded-[18px] border border-slate-100 bg-white p-5 shadow-float sm:-left-8"
          >
            <p className="text-3xl font-extrabold text-navy-800">
              <Counter to={96} suffix="%" />
            </p>
            <p className="text-xs font-medium text-ink">{t('stats.onTime')}</p>
            <div className="mt-3 h-2 w-44 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: '96%' }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, delay: 0.4, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-mint-400"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mt-24 grid gap-5 rounded-[24px] bg-gradient-to-r from-navy-900 to-navy-800 p-10 shadow-card-hover sm:grid-cols-2 lg:grid-cols-4">
        {STAT_DEFS.map((s, i) => (
          <Reveal key={s.labelKey} delay={i * 0.07}>
            <div className="text-center">
              <p className="text-4xl font-extrabold text-white">
                <Counter to={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-2 text-sm font-medium text-navy-200">{t(s.labelKey)}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Testimonials                                                       */
/* ------------------------------------------------------------------ */
const TESTIMONIALS = [
  {
    quote:
      'I found my dorm in Larena in one evening. The photos, ratings, and real reviews made it so easy to trust the place before I even visited.',
    name: 'Alyssa Marie V.',
    role: 'BS Pharmacy · Siquijor State College',
    color: '#1E73E8',
  },
  {
    quote:
      'As a landlord, the dashboard changed everything. I now know exactly who paid, who is overdue, and my occupancy — without touching a notebook.',
    name: 'Rosario C.',
    role: 'Owner · Sunset Boarding House, San Juan',
    color: '#33C7A5',
  },
  {
    quote:
      'The AI assistant is wild. I just type "who hasn\'t paid?" and it shows me a table instantly. My staff and I save hours every week.',
    name: 'Miguel F.',
    role: 'Owner · Blue Horizon Rooms, San Juan',
    color: '#0B2D63',
  },
]

export function Testimonials() {
  const { t } = useLanguage()
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          center
          eyebrow={t('testimonials.eyebrow')}
          title={t('testimonials.title')}
          subtitle={t('testimonials.subtitle')}
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <figure className="flex h-full flex-col rounded-[18px] border border-slate-100 bg-surface p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-card-hover">
                <Quote size={28} className="text-brand-200" />
                <div className="mt-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={15} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-navy-700">"{t.quote}"</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-navy-800">{t.name}</p>
                    <p className="text-xs text-ink">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  CTA                                                                */
/* ------------------------------------------------------------------ */
export function CTA() {
  const { t } = useLanguage()
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-navy-900 via-navy-800 to-brand-700 px-6 py-16 text-center shadow-card-hover sm:px-16">
          <div className="hero-grid-bg absolute inset-0" />
          <div className="hero-blob -right-10 -top-10 h-64 w-64 bg-mint-400" />
          <div className="hero-blob -bottom-16 left-10 h-64 w-64 bg-brand-500" />
          <div className="relative">
            <span className="glass-dark inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-mint-300">
              <Sparkles size={14} /> {t('cta.badge')}
            </span>
            <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {t('cta.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-navy-100/85">
              {t('cta.subtitle')}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/search"
                className="rounded-full bg-brand-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgb(30_115_232/0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-400"
              >
                {t('cta.browse')}
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/10"
              >
                {t('cta.dashboard')}
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
