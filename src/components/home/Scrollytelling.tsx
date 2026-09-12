import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  Bot,
  CalendarCheck,
  Check,
  CreditCard,
  FileText,
  Receipt,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useRef, useState, useEffect } from 'react'

/* ================================================================== */
/*  Step data                                                          */
/* ================================================================== */
const STEPS = [
  {
    num: '01',
    label: 'Discover',
    title: 'Search, compare, and find verified boarding houses that fit your needs.',
    accent: 'from-brand-500 to-brand-600',
    accentBg: 'bg-brand-500',
    accentText: 'text-brand-500',
    accentLight: 'bg-brand-50',
  },
  {
    num: '02',
    label: 'Book a Viewing',
    title: 'Message landlords, schedule a viewing, and secure your bed — all inside BoardEase.',
    accent: 'from-mint-400 to-mint-600',
    accentBg: 'bg-mint-500',
    accentText: 'text-mint-600',
    accentLight: 'bg-mint-50',
  },
  {
    num: '03',
    label: 'Pay & Move In',
    title: 'Pay digitally and keep your receipts, contracts, and payment history in one place.',
    accent: 'from-amber-400 to-amber-600',
    accentBg: 'bg-amber-500',
    accentText: 'text-amber-600',
    accentLight: 'bg-amber-50',
  },
  {
    num: '04',
    label: 'Manage Smartly',
    title: 'Track occupancy, payments, and analytics — with an AI assistant that answers in seconds.',
    accent: 'from-navy-600 to-brand-600',
    accentBg: 'bg-navy-600',
    accentText: 'text-navy-800',
    accentLight: 'bg-navy-50',
  },
]

/* ================================================================== */
/*  Step Visual — Each step has a unique animated mock UI               */
/* ================================================================== */

function StepDiscoverVisual({ progress }: { progress: number }) {
  const opacity = Math.max(0, Math.min(1, progress * 3))
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[20px] bg-gradient-to-br from-slate-50 to-white p-6 shadow-2xl">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 rounded-t-xl bg-slate-100 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-amber-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <div className="ml-3 flex flex-1 items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs text-slate-400">
          <Search size={12} />
          <span>boardease.com/search</span>
        </div>
      </div>

      {/* Search filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: opacity, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-4 grid grid-cols-3 gap-2"
      >
        {['San Juan', '₱2,500', 'Single'].map((f, i) => (
          <motion.div
            key={f}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: opacity > 0.3 ? 1 : 0, scale: 1 }}
            transition={{ delay: i * 0.15 + 0.2 }}
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: opacity > 0.4 ? 1 : 0, x: opacity > 0.4 ? 0 : 20 }}
            transition={{ delay: i * 0.2 + 0.4, duration: 0.5 }}
            className="flex gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
          >
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-brand-100 to-brand-200">
              <img src={`https://picsum.photos/seed/${h.img}/200/200`} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-navy-800">{h.name}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-0.5"><Star size={10} className="fill-amber-400 text-amber-400" />{h.rating}</span>
                <span>·</span>
                <span>{h.beds}</span>
              </div>
              <p className="mt-1 text-sm font-bold text-brand-500">{h.price}<span className="text-xs font-normal text-slate-400">/mo</span></p>
            </div>
            <BadgeCheck size={18} className="mt-1 shrink-0 text-brand-500" />
          </motion.div>
        ))}
      </div>

      {/* Floating filter chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: opacity > 0.6 ? 1 : 0 }}
        transition={{ delay: 0.6 }}
        className="mt-3 flex flex-wrap gap-1.5"
      >
        {['WiFi ✓', 'Aircon ✓', 'Near School ✓'].map((chip) => (
          <span key={chip} className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-600">{chip}</span>
        ))}
      </motion.div>
    </div>
  )
}

function StepBookVisual({ progress }: { progress: number }) {
  const opacity = Math.max(0, Math.min(1, progress * 3))
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[20px] bg-gradient-to-br from-slate-50 to-white shadow-2xl">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-xs font-bold text-white">RC</div>
        <div>
          <p className="text-sm font-bold text-navy-800">Rosario C.</p>
          <p className="text-[10px] text-green-500">● Online</p>
        </div>
      </div>

      {/* Chat messages */}
      <div className="space-y-3 p-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: opacity > 0.2 ? 1 : 0, y: opacity > 0.2 ? 0 : 8 }}
          transition={{ delay: 0.1 }}
          className="flex justify-end"
        >
          <div className="max-w-[75%] rounded-2xl rounded-tr-md bg-brand-500 px-4 py-2.5 text-sm text-white">
            Hi! Is Room 201 still available? I'd like to schedule a viewing.
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: opacity > 0.5 ? 1 : 0, y: opacity > 0.5 ? 0 : 8 }}
          transition={{ delay: 0.3 }}
          className="flex justify-start"
        >
          <div className="max-w-[75%] rounded-2xl rounded-tl-md border border-slate-100 bg-white px-4 py-2.5 text-sm text-navy-700 shadow-sm">
            Yes! Room 201 is available. When would you like to visit? 😊
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: opacity > 0.7 ? 1 : 0, y: opacity > 0.7 ? 0 : 8 }}
          transition={{ delay: 0.5 }}
          className="flex justify-end"
        >
          <div className="max-w-[75%] rounded-2xl rounded-tr-md bg-brand-500 px-4 py-2.5 text-sm text-white">
            Tomorrow at 2PM works for me! 🙏
          </div>
        </motion.div>
      </div>

      {/* Confirmation cards */}
      <div className="space-y-2 px-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: opacity > 0.75 ? 1 : 0, scale: opacity > 0.75 ? 1 : 0.95 }}
          transition={{ delay: 0.6, type: 'spring' }}
          className="flex items-center gap-3 rounded-xl border border-mint-200 bg-mint-50 p-3"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-500 text-white"><CalendarCheck size={16} /></span>
          <div>
            <p className="text-xs font-bold text-mint-700">Viewing Confirmed ✓</p>
            <p className="text-[10px] text-mint-600">Tomorrow at 2:00 PM · Room 201</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: opacity > 0.9 ? 1 : 0, scale: opacity > 0.9 ? 1 : 0.95 }}
          transition={{ delay: 0.8, type: 'spring' }}
          className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white"><BedDouble size={16} /></span>
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
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white"><Send size={12} /></span>
        </div>
      </div>
    </div>
  )
}

function StepPayVisual({ progress }: { progress: number }) {
  const opacity = Math.max(0, Math.min(1, progress * 3))
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[20px] bg-gradient-to-br from-slate-50 to-white p-5 shadow-2xl">
      {/* Payment header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: opacity > 0.2 ? 1 : 0, y: 0 }}
        className="rounded-2xl bg-gradient-to-r from-navy-900 to-navy-700 p-4 text-white"
      >
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
        transition={{ delay: 0.15 }}
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
        transition={{ delay: 0.3, type: 'spring' }}
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
              <span className="text-[10px] font-semibold text-navy-800">{d.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Real-life transition */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: opacity > 0.85 ? 1 : 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4 overflow-hidden rounded-xl"
      >
        <img
          src="https://picsum.photos/seed/move-in-scrolly/600/200"
          alt="Student arriving at boarding house"
          className="h-24 w-full object-cover"
        />
        <div className="absolute bottom-5 inset-x-5 rounded-lg bg-white/90 px-3 py-2 text-center text-xs font-bold text-navy-800 shadow-lg backdrop-blur">
          🎒 Welcome home! Your room is ready.
        </div>
      </motion.div>
    </div>
  )
}

function StepManageVisual({ progress }: { progress: number }) {
  const opacity = Math.max(0, Math.min(1, progress * 3))
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[20px] bg-gradient-to-br from-slate-50 to-white shadow-2xl">
      {/* Dashboard header */}
      <div className="border-b border-slate-100 bg-white px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-navy-800 to-brand-500 text-xs font-bold text-white">BE</div>
            <div>
              <p className="text-xs font-bold text-navy-800">Dashboard</p>
              <p className="text-[10px] text-slate-400">Sunset Boarding House</p>
            </div>
          </div>
          <ShieldCheck size={16} className="text-mint-500" />
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
            transition={{ delay: i * 0.1 + 0.2 }}
            className="rounded-xl bg-slate-50 p-2.5 text-center"
          >
            <p className={`text-lg font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-[9px] font-semibold text-slate-500">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Chart mock */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: opacity > 0.5 ? 1 : 0 }}
        transition={{ delay: 0.3 }}
        className="mx-4 overflow-hidden rounded-xl border border-slate-100 bg-white p-3"
      >
        <p className="text-[10px] font-bold text-navy-800">Revenue Trend</p>
        <div className="mt-2 flex items-end gap-1.5 h-16">
          {[40, 55, 45, 70, 60, 85, 75, 90].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: opacity > 0.5 ? `${h}%` : 0 }}
              transition={{ delay: i * 0.05 + 0.4, duration: 0.4, ease: 'easeOut' }}
              className="flex-1 rounded-t bg-gradient-to-t from-brand-500 to-brand-400"
            />
          ))}
        </div>
      </motion.div>

      {/* AI assistant */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: opacity > 0.7 ? 1 : 0, y: opacity > 0.7 ? 0 : 10 }}
        transition={{ delay: 0.5 }}
        className="mx-4 mt-3"
      >
        <div className="flex items-center gap-2 rounded-xl border border-mint-200 bg-mint-50 p-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-mint-400 to-brand-500 text-white"><Bot size={14} /></span>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-navy-800">AI Assistant</p>
            <p className="text-[10px] text-slate-500">"Which rooms have unpaid rent?"</p>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: opacity > 0.9 ? 1 : 0, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-2 rounded-xl border border-slate-100 bg-white p-3 text-[10px]"
        >
          <p className="font-bold text-navy-800">2 rooms with unpaid rent:</p>
          <div className="mt-1.5 space-y-1">
            {['Room 102 — ₱1,500 (overdue)', 'Room 205 — ₱4,000 (pending)'].map((r) => (
              <div key={r} className="flex items-center gap-1.5 text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {r}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

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

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 })

  // Determine active step from scroll progress
  useEffect(() => {
    return smoothProgress.on('change', (v) => {
      const step = Math.min(3, Math.floor(v * 4))
      setActiveStep(step)
    })
  }, [smoothProgress])

  // Transform for each step's opacity
  const step0Opacity = useTransform(smoothProgress, [0, 0.05, 0.2, 0.25], [0, 1, 1, 0])
  const step1Opacity = useTransform(smoothProgress, [0.2, 0.3, 0.5, 0.55], [0, 1, 1, 0])
  const step2Opacity = useTransform(smoothProgress, [0.5, 0.55, 0.75, 0.8], [0, 1, 1, 0])
  const step3Opacity = useTransform(smoothProgress, [0.75, 0.8, 0.98, 1], [0, 1, 1, 0.8])

  const stepOpacities = [step0Opacity, step1Opacity, step2Opacity, step3Opacity]

  // Step-level progress for visual animations
  const visualProgresses = [
    useTransform(smoothProgress, [0, 0.25], [0, 1]),
    useTransform(smoothProgress, [0.25, 0.5], [0, 1]),
    useTransform(smoothProgress, [0.5, 0.75], [0, 1]),
    useTransform(smoothProgress, [0.75, 1], [0, 1]),
  ]

  const [visualValues, setVisualValues] = useState([0, 0, 0, 0])

  useEffect(() => {
    const unsubs = visualProgresses.map((p, i) =>
      p.on('change', (v) => {
        setVisualValues((prev) => {
          const next = [...prev]
          next[i] = v
          return next
        })
      })
    )
    return () => unsubs.forEach((u) => u())
  }, [])

  return (
    <section id="how-it-works" className="relative bg-navy-950 text-white">
      {/* Section header */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-24 pb-8 sm:px-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-xs font-semibold text-mint-300 ring-1 ring-white/10">                <Sparkles size={14} /> The BoardEase experience
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            How BoardEase Works
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-navy-200">
            Three roles. One platform. A seamless experience for boarders, students, and landlords.
          </p>
        </div>
      </div>

      {/* Scrollytelling body */}
      <div ref={containerRef} className="relative" style={{ height: '500vh' }}>
        <div className="flex h-screen items-center">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:py-10">
            {/* Step text — MOBILE: non-absolute, above visual. DESKTOP: absolute side-by-side */}
            <div className="relative order-2 flex flex-col justify-center lg:order-1">
              {/* Desktop: absolute stacked steps */}
              <div className="hidden lg:block">
                {STEPS.map((step, i) => (
                  <motion.div
                    key={step.num}
                    style={{ opacity: stepOpacities[i] }}
                    className="absolute inset-0 flex flex-col justify-center"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${step.accent} text-lg font-extrabold text-white shadow-lg`}
                      >
                        {step.num}
                      </span>
                      <span className={`text-sm font-bold uppercase tracking-wider ${step.accentText}`}>
                        {step.label}
                      </span>
                    </div>
                    <h3 className="mt-5 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                      {step.title}
                    </h3>
                    <div className="mt-6 flex items-center gap-3">
                      <div className={`h-1 w-16 rounded-full bg-gradient-to-r ${step.accent}`} />
                      <span className="text-xs text-navy-400">Scroll to explore</span>
                      <ArrowRight size={14} className="text-navy-400" />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Mobile: non-absolute, shows only active step */}
              <div className="lg:hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="flex flex-col justify-center text-center"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${STEPS[activeStep].accent} text-base font-extrabold text-white shadow-lg`}
                      >
                        {STEPS[activeStep].num}
                      </span>
                      <span className={`text-xs font-bold uppercase tracking-wider ${STEPS[activeStep].accentText}`}>
                        {STEPS[activeStep].label}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-extrabold leading-tight tracking-tight text-white">
                      {STEPS[activeStep].title}
                    </h3>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <div className={`h-1 w-12 rounded-full bg-gradient-to-r ${STEPS[activeStep].accent}`} />
                      <span className="text-[10px] text-navy-400">Scroll to explore</span>
                      <ArrowRight size={12} className="text-navy-400" />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Visual — MOBILE: below text. DESKTOP: side-by-side */}
            <div className="relative order-1 flex items-center justify-center lg:order-2">
              <div className="relative h-[300px] w-full max-w-[380px] sm:h-[360px] lg:h-[480px] lg:max-w-[480px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.97 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="absolute inset-0"
                  >
                    {activeStep === 0 && <StepDiscoverVisual progress={visualValues[0]} />}
                    {activeStep === 1 && <StepBookVisual progress={visualValues[1]} />}
                    {activeStep === 2 && <StepPayVisual progress={visualValues[2]} />}
                    {activeStep === 3 && <StepManageVisual progress={visualValues[3]} />}
                  </motion.div>
                </AnimatePresence>

                {/* Glow effect behind visual */}
                <div className="pointer-events-none absolute -inset-10 rounded-full bg-brand-500/5 blur-3xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom decorative gradient */}
      <div className="h-12 bg-gradient-to-b from-navy-950 to-white" />
    </section>
  )
}
