import { AnimatePresence, motion } from 'framer-motion'
import { Globe, LogIn, LogOut, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { cn } from '../../lib/utils'

const LINKS = [
  { label: 'Explore', href: '/search' },
  { label: 'Locations', href: '/#locations' },
  { label: 'Categories', href: '/#categories' },
  { label: 'How it works', href: '/#how-it-works' },
]

export default function Navbar({ solid }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const overlay = !solid && !scrolled

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        overlay ? 'glass-dark' : 'glass shadow-[0_8px_30px_rgb(11_45_99/0.08)]',
      )}
    >
      <nav className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="group flex items-center" aria-label="BoardEase home">
          <img
            src="/logo.png"
            alt="BoardEase"
            decoding="async"
            className="h-11 w-auto rounded-lg transition-transform duration-300 group-hover:scale-[1.04] sm:h-12"
          />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                overlay
                  ? 'text-white/90 hover:bg-white/10 hover:text-white'
                  : 'text-navy-700 hover:bg-navy-50 hover:text-navy-800',
              )}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition',
              overlay ? 'text-white/90 hover:bg-white/10 hover:text-white' : 'text-navy-700 hover:bg-navy-50',
            )}
          >
            <Globe size={15} /> EN
          </button>
          {user ? (
            <>
              <Link
                to={user.role === 'landlord' ? '/dashboard' : '/boarder'}
                onClick={() => setOpen(false)}
                className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgb(30_115_232/0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-[0_10px_24px_rgb(30_115_232/0.45)]"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-navy-800 to-navy-600 text-xs font-bold text-white ring-2 ring-white transition hover:ring-red-300 hover:bg-red-600"
                title="Log out"
                aria-label="Log out"
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
              <LogIn size={15} /> Sign in
            </Link>
          )}
        </div>

        <button
          className={cn(
            'rounded-xl p-2 transition md:hidden',
            overlay ? 'text-white hover:bg-white/10' : 'text-navy-800 hover:bg-navy-50',
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
              overlay ? 'glass-dark border-white/10' : 'glass border-white/50',
            )}
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'rounded-xl px-4 py-3 text-sm font-medium transition',
                    overlay ? 'text-white/90 hover:bg-white/10' : 'text-navy-700 hover:bg-navy-50',
                  )}
                >
                  {l.label}
                </a>
              ))}
              {user ? (
                <>
                  <Link to={user.role === 'landlord' ? '/dashboard' : '/boarder'} onClick={() => setOpen(false)} className="mt-2 rounded-xl bg-brand-500 px-4 py-3 text-center text-sm font-semibold text-white">
                    Dashboard
                  </Link>
                  <button onClick={handleLogout} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-600 transition hover:bg-red-100">
                    <LogOut size={15} /> Log out
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={() => setOpen(false)} className="mt-2 rounded-xl bg-brand-500 px-4 py-3 text-center text-sm font-semibold text-white">
                  <LogIn size={15} className="mr-1 inline" /> Sign in
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
