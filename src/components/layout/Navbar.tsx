import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Globe, LogIn, LogOut, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useLanguage, type LangCode } from '../../lib/i18n'
import { usePrefetchSearch } from '../../lib/hooks'
import { cn, scrollToSectionId } from '../../lib/utils'
import { navigationSections } from '../../pages/Landing'

/* ------------------------------------------------------------------ */
/*  Nav model (computed once, lazily)                                  */
/* ------------------------------------------------------------------ */
type NavLinkMeta = { href: string; section?: string; labelKey: string }

/**
 * Built lazily on first render rather than at module scope: Navbar and
 * Landing.tsx (which owns `navigationSections`) import each other, so touching
 * that constant while this module evaluates would hit a TDZ ReferenceError.
 * After the first call the cache is reused for the app's lifetime — no
 * per-render rebuilding of the model.
 */
let navLinksCache: NavLinkMeta[] | null = null
function getNavLinks(): NavLinkMeta[] {
  if (navLinksCache) return navLinksCache

  const meta: NavLinkMeta[] = navigationSections.map((s) => {
    let href = '/'
    let section: string | undefined
    let labelKey: string

    if (s.id === 'explore') {
      // "Explore" goes to the existing browse page — real filtering, all
      // listings, photos, rates, availability, and house details.
      href = '/search'
      labelKey = 'nav.explore'
    } else {
      href = '/'
      section = s.id
      labelKey = `nav.${s.id === 'how-it-works' ? 'howItWorks' : s.id}`
    }

    return { href, section, labelKey }
  })

  navLinksCache = [
    meta.find((m) => m.labelKey === 'nav.explore'),
    meta.find((m) => m.labelKey === 'nav.categories'),
    meta.find((m) => m.labelKey === 'nav.locations'),
    meta.find((m) => m.labelKey === 'nav.howItWorks'),
    meta.find((m) => m.labelKey === 'nav.pricing'),
  ].filter((m): m is NavLinkMeta => Boolean(m))
  return navLinksCache
}

/* ------------------------------------------------------------------ */
/*  Nav badge — module-level component                                 */
/* ------------------------------------------------------------------ */
/**
 * Lives at module scope on purpose: the old inline component got a fresh
 * function identity on every Navbar render (every scroll tick flips `scrolled`
 * and the active-section effect flips `activeSection`), and React remounts a
 * subtree whenever its element type changes identity. That constant unmount/
 * remount churn reset in-flight CSS hover transitions and added mounting work
 * in the click path — the "slight delay" on the badges. With a stable type the
 * elements reconcile in place and interactions stay on the same DOM nodes.
 */
function NavBadge({
  href,
  section,
  markerId,
  label,
  active,
  onNavigate,
  onPrefetch,
}: {
  href: string
  section?: string
  markerId: string
  label: string
  active: boolean
  onNavigate: () => void
  /** Warm the Explore cache on pointer-over / press / keyboard focus. */
  onPrefetch?: () => void
}) {
  const baseClass = 'text-navy-500 hover:text-navy-800'

  return (
    <a
      href={section ? `#${section}` : href}
      onPointerEnter={onPrefetch}
      onPointerDown={onPrefetch}
      onFocus={onPrefetch}
      onClick={(e) => {
        e.preventDefault()
        onNavigate()
      }}
      className={cn(
        // 150 ms instead of 300 ms: the color feedback now completes almost as
        // soon as it starts, while the transition itself (same properties,
        // same easing feel) is preserved.
        'group relative rounded-full px-4 py-2 text-sm font-medium transition-[color,transform] duration-150 active:scale-[0.97]',
        active ? 'text-navy-800' : baseClass,
      )}
      aria-current={active ? 'page' : undefined}
    >
      {label}
      {/* One shared element per nav bar: because the *same* element glides
          between items, the underline slides over instead of one bar
          shrinking while another grows (the old blinking).
          Rendered whenever the badge is active — section badges while their
          section is in view on the landing page, and the Explore badge while
          the user is on the Explore page (/search). */}
      {active && (
        <motion.span
          layoutId={`nav-active-underline-${markerId}`}
          transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.6 }}
          className="absolute -bottom-0.5 left-[30%] h-1 w-[40%] rounded-full bg-brand-400"
          aria-hidden="true"
        />
      )}
    </a>
  )
}

export default function Navbar({ solid }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const { user, logout } = useAuth()
  const { lang, setLang, t, languages } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const langRef = useRef<HTMLDivElement>(null)
  const prefetchSearch = usePrefetchSearch()
  const navLinks = getNavLinks()

  const current = languages.find((l) => l.code === lang) ?? languages[0]

  const [activeSection, setActiveSection] = useState('hero')
  const activeSectionRef = useRef('hero')

  // One rAF-throttled reader drives both the solid header state and the active
  // section, so the nav underline gets a single, stable signal per frame.
  useEffect(() => {
    // DOM IDs that actually exist in the page, in document order.
    const domIds = ['featured', 'categories', 'locations', 'how-it-works', 'pricing']
    const SWITCH_LINE = 90 // px from the top of the viewport
    const HYSTERESIS = 32 // px of dead band that stops boundary flicker

    const measure = () => {
      setScrolled(window.scrollY > 12)

      // The active section is the last one whose top has crossed the line.
      let next = 'hero'
      let bestTop = -Infinity
      for (const id of domIds) {
        const el = document.getElementById(id)
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top - SWITCH_LINE <= 0 && top > bestTop) {
          bestTop = top
          next = id
        }
      }

      const current = activeSectionRef.current
      if (current === next) return

      // Don't hand the underline over while the current section is still
      // parked on the switch line — that was what made it flicker back and
      // forth between two items. Wait until we are clearly past it.
      const currentTop = document.getElementById(current)?.getBoundingClientRect().top
      if (currentTop !== undefined && Math.abs(currentTop - SWITCH_LINE) < HYSTERESIS) return

      activeSectionRef.current = next
      setActiveSection(next)
    }

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        measure()
      })
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const handleLogout = () => {
    logout()
    window.location.href = '/'
  }

  const pickLang = (code: LangCode) => {
    setLang(code)
    setLangOpen(false)
  }

  useEffect(() => {
    if (!langOpen) return
    const node = langRef.current
    if (!node) return
    const onPointer = (e: MouseEvent) => {
      if (!node.contains(e.target as Node)) setLangOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLangOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [langOpen])

  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    // Wait a frame so freshly-rendered landing sections exist in the DOM
    // before we try to measure their position.
    const raf = requestAnimationFrame(() => {
      scrollToSectionId(id)
    })
    return () => cancelAnimationFrame(raf)
  }, [location.hash, location.pathname])

  const scrolledSolid = solid || scrolled

  /**
   * One shared navigation handler for every badge. Section links smooth-scroll
   * with the app-controlled fast scroller (speed-capped, ~0.3-0.6 s instead of
   * the browser's distance-scaled crawl) — no setTimeout, no waits. Cross-page
   * links go through React Router synchronously (the Explore data itself was
   * already prefetched on pointer-over/press).
   */
  const navigateToBadge = (link: NavLinkMeta) => {
    setOpen(false)

    if (link.section) {
      if (document.getElementById(link.section)) {
        scrollToSectionId(link.section)
        // Keep the URL in sync (so refresh lands on the same section) without
        // adding a history entry or re-triggering the scroll effect.
        window.history.replaceState(null, '', `/#${link.section}`)
      } else {
        // Section isn't on this page (e.g. we're on /houses/1 or /search):
        // let React Router take us to the landing page and let the hash
        // effect above do the smooth scroll once the section has rendered.
        navigate(`/#${link.section}`)
      }
      return
    }

    // Page link (e.g. /search, /login): SPA navigation — no full reload,
    // back button works, and the URL updates. The matching /api/houses
    // request was already warmed by the hover/press prefetch, so results
    // render without a skeleton wait.
    if (link.href === '/search') prefetchSearch()
    navigate(link.href)
  }

  const langButtonClass = cn(
    'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition',
    'text-navy-700 hover:bg-navy-50',
  )

  const LangMenu = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn('relative', mobile && 'w-full')} ref={langRef} data-lang-menu>
      <button
        type="button"
        className={cn(langButtonClass, mobile && 'w-full justify-between rounded-xl px-4 py-3')}
        onClick={() => setLangOpen((v) => !v)}
        aria-expanded={langOpen}
        aria-haspopup="listbox"
        aria-label={t('nav.language')}
      >
        <span className="inline-flex items-center gap-1.5">
          <Globe size={15} />
          {current.short}
        </span>
        <ChevronDown size={14} className={cn('transition', langOpen && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {langOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            role="listbox"
            aria-label={t('nav.language')}
            className={cn(
              'z-50 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1.5 shadow-float',
              mobile ? 'relative mt-2 w-full' : 'absolute right-0 top-full mt-2 min-w-[200px]',
            )}
          >
            {languages.map((l) => (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={lang === l.code}
                onClick={() => {
                  pickLang(l.code)
                  if (mobile) setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition',
                  lang === l.code
                    ? 'bg-brand-50 font-semibold text-brand-600'
                    : 'font-medium text-navy-700 hover:bg-navy-50',
                )}
              >
                <span>
                  <span className="mr-2 text-xs font-bold text-mut">{l.short}</span>
                  {l.label}
                </span>
                {lang === l.code && <Check size={15} className="text-brand-500" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  const renderNavLink = (l: NavLinkMeta, markerId: string) => {
    const isPageActive = l.href === '/search' ? location.pathname === '/search' : location.pathname === '/'
    const active = l.section ? activeSection === l.section : isPageActive
    return (
      <NavBadge
        key={l.section ?? l.labelKey}
        href={l.href}
        section={l.section}
        markerId={markerId}
        label={t(l.labelKey)}
        active={active}
        onNavigate={() => navigateToBadge(l)}
        onPrefetch={l.href === '/search' ? prefetchSearch : undefined}
      />
    )
  }

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        'md:left-[10%] md:right-[10%] md:top-4 md:rounded-full md:inset-x-auto',
        open ? 'rounded-none' : 'md:rounded-full',
        'glass border border-slate-200/70 shadow-[0_8px_30px_rgb(11_45_99/0.08)]',
        scrolledSolid && 'shadow-md',
      )}
    >
      <nav className="mx-auto flex h-[64px] items-center justify-between px-5 sm:px-7 md:rounded-full">
        <Link to="/" className="group flex items-center" aria-label="BoardEase home">
          <img
            src="/logo.png"
            alt="BoardEase"
            decoding="async"
            className="h-11 w-auto rounded-lg transition-transform duration-300 group-hover:scale-[1.04] sm:h-12"
          />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {navLinks.map((l) => renderNavLink(l, 'desktop'))}
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <LangMenu />
          {user ? (
            <>
              <Link
                to={user.role === 'landlord' ? '/dashboard' : '/boarder'}
                onClick={() => setOpen(false)}
                className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgb(30_115_232/0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-[0_10px_24px_rgb(30_115_232/0.45)]"
              >
                {t('nav.dashboard')}
              </Link>
              <button
                onClick={handleLogout}
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-navy-800 to-navy-600 text-xs font-bold text-white ring-2 ring-white transition hover:ring-red-300 hover:bg-red-600"
                title={t('nav.logOut')}
                aria-label={t('nav.logOut')}
              >
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgb(30_115_232/0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-[0_10px_24px_rgb(30_115_232/0.45)]"
            >
              <LogIn size={15} /> {t('nav.signIn')}
            </Link>
          )}
        </div>

        <button
          className={cn(
            'rounded-xl p-2 transition md:hidden',
            'text-navy-800 hover:bg-navy-50',
          )}
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className={cn(
              'overflow-hidden border-t md:hidden',
              'bg-white/95 backdrop-blur-xl border-white/50',
            )}
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {navLinks.map((l) => renderNavLink(l, 'mobile'))}
              <div className="text-navy-800">
                <LangMenu mobile />
              </div>
              {user ? (
                <>
                  <Link
                    to={user.role === 'landlord' ? '/dashboard' : '/boarder'}
                    onClick={() => setOpen(false)}
                    className="mt-2 rounded-xl bg-brand-500 px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    <LogOut size={15} /> {t('nav.logOut')}
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-xl bg-brand-500 px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  <LogIn size={15} className="mr-1 inline" /> {t('nav.signIn')}
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
