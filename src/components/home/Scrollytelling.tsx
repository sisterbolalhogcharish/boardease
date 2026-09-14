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
    <section id="how-it-works" className="relative bg-gradient-to-b from-white via-brand-50/60 to-white text-navy-900">
      {/* Blurry bubble effects */}
      <div className="hero-blob -left-24 top-24 h-80 w-80 bg-brand-200" />
      <div className="hero-blob -right-16 top-1/3 h-72 w-72 bg-mint-200" />
      <div className="hero-blob left-1/3 bottom-10 h-64 w-64 bg-mint-100" />

      {/* Section header */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-24 pb-8 sm:px-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
            <Sparkles size={14} /> The BoardEase experience
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl lg:text-5xl">
            How BoardEase Works
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink">
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
                    <h3 className="mt-5 text-2xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-3xl lg:text-4xl">
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
                    transition={{ duration: 0.35, ease: 'easeOut' }}
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
                    <h3 className="mt-3 text-xl font-extrabold leading-tight tracking-tight text-navy-900">
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
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  >
                    <div
                      className="h-full w-full"
                      style={
                        i === 0
                          ? {
                              WebkitMaskImage:
                                'linear-gradient(to right, transparent, #000 20%), linear-gradient(to top, transparent, #000 20%)',
                              WebkitMaskComposite: 'intersect' as const,
                              maskImage:
                                'linear-gradient(to right, transparent, #000 20%), linear-gradient(to top, transparent, #000 20%)',
                              maskComposite: 'intersect' as const,
                            }
                          : undefined
                      }
                    >
                      <img
                        src={step.image}
                        alt={step.label}
                        draggable={false}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </motion.div>
                ))}


              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom decorative gradient */}
      <div className="h-12 bg-gradient-to-b from-brand-50/60 to-white" />
    </section>
  )
}
