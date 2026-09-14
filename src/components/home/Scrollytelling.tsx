import { motion, useScroll, useTransform, useSpring, useMotionValueEvent, AnimatePresence } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'

/* ================================================================== */
/*  Step data                                                          */
/* ================================================================== */
const STEPS = [
  {
    num: '01',
    label: 'Discover',
    title: 'Search, compare, and find verified boarding houses that fit your needs.',
    accent: 'from-brand-500 to-brand-600',
    accentText: 'text-brand-500',
    image: '/howitworks/discover.png',
  },
  {
    num: '02',
    label: 'Book a Viewing',
    title: 'Message landlords, schedule a viewing, and secure your bed — all inside BoardEase.',
    accent: 'from-mint-400 to-mint-600',
    accentText: 'text-mint-600',
    image: '/howitworks/bookaviewing.png',
  },
  {
    num: '03',
    label: 'Subscribe and Manage',
    title: 'Choose a plan, subscribe, and keep your receipts, contracts, and payment history in one place.',
    accent: 'from-amber-400 to-amber-600',
    accentText: 'text-amber-600',
    image: '/howitworks/subscribeandmanage.png',
  },
  {
    num: '04',
    label: 'Manage Smartly',
    title: 'Track occupancy, payments, and analytics — with an AI assistant that answers in seconds.',
    accent: 'from-navy-600 to-brand-600',
    accentText: 'text-navy-800',
    image: '/pictures/landlord.png',
  },
]

/* ================================================================== */
/*  Step Visual — Each step has a unique animated mock UI               */
/* ================================================================== */

interface StepDiscoverVisualProps {
  progress: number;
}

function StepDiscoverVisual(props: StepDiscoverVisualProps) {
  const { progress } = props;
  const opacity = Math.max(0, Math.min(1, progress * 3));
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-50 to-white p-6 shadow-2xl">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 rounded-t-xl bg-slate-100 px-4 py-2.5">
        <div className="flex gap-2">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-amber-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <div className="ml-3 flex flex-1 items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs text-slate-400">
          <Search size={11} />
          <span>boardease.com/search</span>
        </div>
      </div>

      {/* Search filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: opacity, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mt-4 grid grid-cols-3 gap-2"
      >
        {['San Juan', '₱2,500', 'Single'].map((f, i) => (
          <motion.div
            key={f}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: opacity > 0.3 ? 1 : 0, scale: 1 }}
            transition={{ delay: i * 0.12 + 0.15 }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-navy-800 shadow-sm"
          >
            {f}
          </motion.div>
        ))}
      </motion.div>

      {/* Listing cards */}
      <div className="mt-4 space-y-3">
        {[
          { name: 'Sunset Boarding House', price: '₱2,500', rating: '4.9', beds: '28 beds', img: 'sunset-scrolly' },
          { name: 'Blue Horizon Rooms', price: '₱3,000', rating: '4.9', beds: '10 beds', img: 'horizon-scrolly' },
        ].map((h, i) => (
          <motion.div
            key={h.name}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: opacity > 0.4 ? 1 : 0, x: opacity > 0.4 ? 0 : 16 }}
            transition={{ delay: i * 0.18 + 0.35, duration: 0.45 }}
            className="flex gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-brand-100 to-brand-200">
              <img src={`https://picsum.photos/seed/${h.img}/200/200`} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-bold text-navy-800">{h.name}</p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="flex items-center gap-0.5"><Star size={10} className="fill-amber-400 text-amber-400" />{h.rating}</span>
                <span>·</span>
                <span>{h.beds}</span>
              </div>
              <p className="mt-1 text-sm font-bold text-brand-500">{h.price}<span className="text-xs font-normal text-slate-400">/mo</span></p>
            </div>
            <BadgeCheck size={16} className="mt-1 shrink-0 text-brand-500" />
          </motion.div>
        ))}
      </div>

      {/* Floating filter chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: opacity > 0.6 ? 1 : 0 }}
        transition={{ delay: 0.5 }}
        className="mt-3 flex flex-wrap gap-1.5"
      >
        {['WiFi ✓', 'Aircon ✓', 'Near School ✓'].map((chip) => (
          <span key={chip} className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-600">{chip}</span>
        ))}
      </motion.div>
    </div>
  )
}

interface StepBookVisualProps {
  progress: number;
}

function StepBookVisual(props: StepBookVisualProps) {
  const { progress } = props;
  const opacity = Math.max(0, Math.min(1, progress * 3));
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-50 to-white shadow-2xl">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-xs font-bold text-white">RC</div>
        <div>
          <p className="truncate text-sm font-bold text-navy-800">Rosario C.</p>
          <p className="text-[10px] text-green-500">● Online</p>
        </div>
      </div>

      {/* Chat messages */}
      <div className="space-y-3 p-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: opacity > 0.2 ? 1 : 0, y: opacity > 0.2 ? 0 : 8 }}
          transition={{ delay: 0.08 }}
          className="flex justify-end"
        >
          <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-brand-500 px-4 py-2.5 text-sm text-white leading-relaxed">
            Hi! Is Room 201 still available? I'd like to schedule a viewing.
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: opacity > 0.5 ? 1 : 0, y: opacity > 0.5 ? 0 : 8 }}
          transition={{ delay: 0.25 }}
          className="flex justify-start"
        >
          <div className="max-w-[80%] rounded-2xl rounded-tl-md border border-slate-100 bg-white px-4 py-2.5 text-sm text-navy-700 shadow-sm leading-relaxed">
            Yes! Room 201 is available. When would you like to visit? 😊
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: opacity > 0.7 ? 1 : 0, y: opacity > 0.7 ? 0 : 8 }}
          transition={{ delay: 0.45 }}
          className="flex justify-end"
        >
          <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-brand-500 px-4 py-2.5 text-sm text-white leading-relaxed">
            Tomorrow at 2PM works for me! 🙏
          </div>
        </motion.div>
      </div>

      {/* Confirmation cards */}
      <div className="space-y-2 px-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: opacity > 0.75 ? 1 : 0, scale: opacity > 0.75 ? 1 : 0.95 }}
          transition={{ delay: 0.55, type: 'spring' }}
          className="flex items-center gap-3 rounded-xl border border-mint-200 bg-mint-50 p-3"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mint-500 text-white"><CalendarCheck size={14} /></span>
          <div>
            <p className="text-xs font-bold text-mint-700">Viewing Confirmed ✓</p>
            <p className="text-[10px] text-mint-600">Tomorrow at 2:00 PM · Room 201</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: opacity > 0.9 ? 1 : 0, scale: opacity > 0.9 ? 1 : 0.95 }}
          transition={{ delay: 0.75, type: 'spring' }}
          className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white"><BedDouble size={14} /></span>
          <div>
            <p className="text-xs font-bold text-brand-700">Bed Reserved ✓</p>
            <p className="text-[10px] text-brand-600">Room 201 · ₱2,500/month</p>
          </div>
        </motion.div>
      </div>

      {/* Input bar */}
      <div className="absolute bottom-0 inset-x-0 border-t border-slate-100 bg-white p-3">
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <input placeholder="Type a message…" className="flex-1 bg-transparent text-xs text-navy-800 outline-none" readOnly />
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white"><Send size={11} /></span>
        </div>
      </div>
    </div>
  )
}

interface StepPayVisualProps {
  progress: number;
}

function StepPayVisual(props: StepPayVisualProps) {
  const { progress } = props;
  const opacity = Math.max(0, Math.min(1, progress * 3));
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-50 to-white p-5 shadow-2xl">
      {/* Payment header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: opacity > 0.2 ? 1 : 0, y: 0 }}
        className="rounded-2xl bg-gradient-to-r from-navy-900 to-navy-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-mint-300">Rent Payment</p>
            <p className="mt-1 text-2xl font-extrabold">₱2,500</p>
            <p className="text-[10px] text-navy-200">August 2026 · Room 201</p>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Wallet size={22} /></span>
        </div>
      </motion.div>

      {/* Payment method */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: opacity > 0.4 ? 1 : 0, y: opacity > 0.4 ? 0 : 10 }}
        transition={{ delay: 0.12 }}
        className="mt-4 grid grid-cols-2 gap-2"
      >
        <div className="flex items-center gap-2 rounded-xl border-2 border-brand-500 bg-brand-50 p-3">
          <CreditCard size={16} className="text-brand-500" />
          <span className="text-xs font-bold text-brand-600">GCash</span>
          <Check size={14} className="ml-auto text-brand-500" />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <Receipt size={16} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">PayLink</span>
        </div>
      </motion.div>

      {/* Success receipt */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: opacity > 0.65 ? 1 : 0, scale: opacity > 0.65 ? 1 : 0.9 }}
        transition={{ delay: 0.25, type: 'spring' }}
        className="mt-4 rounded-xl border border-mint-200 bg-mint-50 p-4"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-500 text-white"><Check size={16} /></span>
          <div>
            <p className="text-sm font-bold text-mint-700">Payment Successful!</p>
            <p className="text-[10px] text-mint-600">Receipt #GC-482917 · Paid via GCash</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-white p-2.5">
          {[
            { label: 'Receipt', icon: Receipt },
            { label: 'Contract', icon: FileText },
            { label: 'History', icon: TrendingUp },
          ].map((d) => (
            <div key={d.label} className="flex flex-col items-center gap-1 rounded-lg bg-slate-50 p-2">
              <d.icon size={14} className="text-brand-500" />
              <span className="text-xs font-semibold text-navy-800">{d.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Real-life transition */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: opacity > 0.85 ? 1 : 0 }}
        transition={{ delay: 0.35 }}
        className="mt-4 overflow-hidden rounded-xl"
      >
        <img
          src="https://picsum.photos/seed/move-in-scrolly/600/200"
          alt="Student arriving at boarding house"
          className="h-24 w-full object-cover"
        />
        <div className="absolute bottom-4 inset-x-4 rounded-lg bg-white/90 px-3 py-2 text-center text-xs font-bold text-navy-800 shadow-lg backdrop-blur">
          🎒 Welcome home! Your room is ready.
        </div>
      </motion.div>
    </div>
  )
}

interface StepManageVisualProps {
  progress: number;
}

function StepManageVisual(props: StepManageVisualProps) {
  const { progress } = props;
  const opacity = Math.max(0, Math.min(1, progress * 3));
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-50 to-white shadow-2xl">
      {/* Dashboard header */}
      <div className="border-b border-slate-100 bg-white px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-navy-800 to-brand-500 text-xs font-bold text-white">BE</div>
            <div>
              <p className="text-xs font-bold text-navy-800">Dashboard</p>
              <p className="text-[10px] text-slate-400">Sunset Boarding House</p>
            </div>
          </div>
          <ShieldCheck size={14} className="text-mint-500" />
        </div>
      </div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: opacity > 0.2 ? 1 : 0, y: 0 }}
        className="grid grid-cols-3 gap-2 p-4"
      >
        {[
          { label: 'Occupancy', value: '82%', color: 'text-brand-500' },
          { label: 'Collected', value: '₱32K', color: 'text-mint-600' },
          { label: 'Pending', value: '₱4.5K', color: 'text-amber-500' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: opacity > 0.3 ? 1 : 0, scale: 1 }}
            transition={{ delay: i * 0.08 + 0.15 }}
            className="rounded-xl bg-slate-50 p-2.5 text-center"
          >
            <p className={`text-lg font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-[9px] font-semibold text-slate-500 uppercase">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Chart mock */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: opacity > 0.5 ? 1 : 0 }}
        transition={{ delay: 0.25 }}
        className="mx-4 overflow-hidden rounded-xl border border-slate-100 bg-white p-3"
      >
        <p className="text-[10px] font-bold text-navy-800 uppercase">Revenue Trend</p>
        <div className="mt-2 flex items-end gap-1.5 h-12">
          {[40, 55, 45, 70, 60, 85, 75, 90].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: opacity > 0.5 ? `${h}%` : 0 }}
              transition={{ delay: i * 0.04 + 0.35, duration: 0.4, ease: 'easeOut' }}
              className="flex-1 rounded-t bg-gradient-to-t from-brand-500 to-brand-400"
            />
          ))}
        </div>
      </motion.div>

      {/* AI assistant */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: opacity > 0.7 ? 1 : 0, y: opacity > 0.7 ? 0 : 10 }}
        transition={{ delay: 0.45 }}
        className="mx-4 mt-3"
      >
        <div className="flex items-center gap-2 rounded-xl border border-mint-200 bg-mint-50 p-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-mint-400 to-brand-500 text-white"><Bot size={13} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-navy-800">AI Assistant</p>
            <p className="truncate text-xs text-slate-500">"Which rooms have unpaid rent?"</p>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: opacity > 0.9 ? 1 : 0, y: 0 }}
          transition={{ delay: 0.65 }}
          className="mt-2 rounded-xl border border-slate-100 bg-white p-3 text-xs leading-relaxed"
        >
          <p className="font-bold text-navy-800">2 rooms with unpaid rent:</p>
          <div className="mt-1.5 space-y-1">
            {['Room 102 — ₱1,500 (overdue)', 'Room 205 — ₱4,000 (pending)'].map((r) => (
              <div key={r} className="flex items-center gap-1.5 text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span className="truncate">{r}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Scrollytelling timing                                              */
/* ------------------------------------------------------------------ */
const STEP_COUNT = STEPS.length
/** Each step owns an equal slice of the section's scroll progress. */
const SLICE = 1 / STEP_COUNT
/** Half-width of the text/visual cross-fade, in progress units. The fade
 *  is centred on the slice boundary so the outgoing and incoming step are
 *  always at mirror-image opacity — this is what keeps the words and the
 *  artwork switching at exactly the same scroll position. */
const FADE = 0.05


/* ================================================================== */
/*  Main Scrollytelling Component                                       */
/* ================================================================== */
export default function Scrollytelling() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeStep, setActiveStep] = useState(0)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // Spring that tracks the scroll closely (little lag) but still glides, so
  // the cross-fade starts the moment you scroll instead of trailing behind it.
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 200, damping: 34, mass: 0.35, restDelta: 0.0005 })

  // Text + visual cross-fades, centred on each slice boundary. The outgoing
  // and incoming step are always at mirrored opacity, so nothing ever pops.
  const stepOpacities = [
    useTransform(smoothProgress, [0, FADE, SLICE - FADE, SLICE], [0, 1, 1, 0]),
    useTransform(smoothProgress, [SLICE - FADE, SLICE, 2 * SLICE - FADE, 2 * SLICE], [0, 1, 1, 0]),
    useTransform(smoothProgress, [2 * SLICE - FADE, 2 * SLICE, 3 * SLICE - FADE, 3 * SLICE], [0, 1, 1, 0]),
    useTransform(smoothProgress, [3 * SLICE - FADE, 3 * SLICE, 0.99, 1], [0, 1, 1, 1]),
  ]

  // The step switch lands on the midpoint of the cross-fade, so the index and
  // the blend agree. Only fires when the index actually changes — no re-render
  // on every scroll frame.
  useMotionValueEvent(smoothProgress, 'change', (v) => {
    const next = v < SLICE - FADE / 2 ? 0 : v < 2 * SLICE - FADE / 2 ? 1 : v < 3 * SLICE - FADE / 2 ? 2 : 3
    setActiveStep((prev) => (prev === next ? prev : next))
  })

  return (
    <section id="how-it-works" className="relative bg-navy-950 text-white">
      {/* Section header */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3.5 py-1 text-[11px] font-semibold text-mint-300 ring-1 ring-white/10">
            <Sparkles size={12} /> The BoardEase experience
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-3xl">
            How BoardEase Works
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-navy-200">
            Three roles. One platform. A seamless experience for boarders, students, and landlords.
          </p>
        </div>
      </div>

      {/* Scrollytelling body */}
<div ref={containerRef} className="relative" style={{ height: '320vh' }}>
        {/* Sticky viewport — this is what keeps the step pinned while the
            500vh track scrolls past, so the words on screen always match the
            scroll position. */}
        <div className="sticky top-0 flex h-screen items-center">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:py-10">
            {/* Step text — MOBILE: non-absolute, above visual. DESKTOP: absolute side-by-side */}
            <div className="relative order-2 flex flex-col justify-center lg:order-1">
              {/* Desktop: absolute stacked steps, cross-fading continuously */}
              <div className="hidden lg:block">
                {STEPS.map((step, i) => (
                  <motion.div
                    key={step.num}
                    style={{ opacity: stepOpacities[i] }}
aria-hidden={i !== activeStep}
                    className="absolute inset-0 flex flex-col justify-center px-8"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${step.accent} text-sm font-extrabold text-white shadow-md`}
                      >
                        {step.num}
                      </span>
                      <span className={`text-xs font-bold uppercase tracking-wider ${step.accentText}`}>
                        {step.label}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold leading-snug tracking-tight text-white">
                      {step.title}
                    </h3>
                    <div className="mt-3 flex items-center gap-2">
                      <div className={`h-0.5 w-12 rounded-full bg-gradient-to-r ${step.accent}`} />
                      <span className="text-[10px] text-navy-400">Scroll to explore</span>
                      <ArrowRight size={11} className="text-navy-400" />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Mobile: non-absolute, shows only active step */}
              <div className="lg:hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="flex flex-col justify-center text-center py-4"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${STEPS[activeStep].accent} text-xs font-extrabold text-white shadow-md`}
                      >
                        {STEPS[activeStep].num}
                      </span>
                      <span className={`text-xs font-bold uppercase tracking-wider ${STEPS[activeStep].accentText}`}>
                        {STEPS[activeStep].label}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-bold leading-snug tracking-tight text-white">
                      {STEPS[activeStep].title}
                    </h3>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <div className={`h-0.5 w-10 rounded-full bg-gradient-to-r ${STEPS[activeStep].accent}`} />
                      <span className="text-[10px] text-navy-400">Scroll to explore</span>
                      <ArrowRight size={10} className="text-navy-400" />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Visual — MOBILE: below text. DESKTOP: side-by-side.
                All four images stay mounted and cross-fade on the very same
                opacities as their text, so the pair is always in sync. */}
            <div className="relative order-1 flex items-center justify-center lg:order-2">
<div className="relative h-[380px] w-full max-w-[500px] sm:h-[460px] lg:h-[600px] lg:max-w-[620px]">
                {STEPS.map((step, i) => (
                  <motion.div
                    key={step.image}
                    style={{ opacity: stepOpacities[i] }}
                    aria-hidden={i !== activeStep}
                    className="edge-fade-y pointer-events-none absolute inset-0 flex items-center justify-center"
                  >
                    <div className="edge-fade-x flex h-full w-full items-center justify-center">
                      <img
                        src={step.image}
                        alt=""
                        className="max-h-full w-auto object-contain"
                      />
                    </div>
                  </motion.div>
                ))}
                  >
                    <div className="edge-fade-x flex h-full w-full items-center justify-center">
                      <img
                        src={step.image}
                        alt={step.label}
                        draggable={false}
                        className="h-full w-full object-contain drop-shadow-2xl"
                      />
                    </div>
                  </motion.div>
                ))}

                {/* Glow effect behind visual */}
                <div className="pointer-events-none absolute -inset-8 rounded-full bg-brand-500/5 blur-3xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom decorative gradient */}
      <div className="h-6 bg-gradient-to-b from-navy-950 to-white" />
    </section>
  )
}
