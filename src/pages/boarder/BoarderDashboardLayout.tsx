import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Building2,
  CreditCard,
  Home,
  LogOut,
  Menu,
  Star,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { cn } from '../../lib/utils'

const NAV = [
  { path: '/boarder', label: 'My Home', icon: Home, end: true },
  { path: '/boarder/payments', label: 'My Payments', icon: CreditCard },
  { path: '/boarder/reviews', label: 'Reviews', icon: Star },
  { path: '/boarder/browse', label: 'Browse Houses', icon: Building2 },
]

export default function BoarderDashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const current = NAV.find((n) => (n.end ? pathname === n.path : pathname.startsWith(n.path))) ?? NAV[0]

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const closeMenu = () => setMobileOpen(false)

  const Sidebar = (
    <div className="flex h-full flex-col bg-navy-900">
      <div className="px-6 pb-2 pt-6">
        <Link to="/" className="inline-flex" aria-label="BoardEase home">
          <img src="/logo.png" alt="BoardEase" decoding="async" className="h-12 w-auto rounded-lg" />
        </Link>
        <p className="mt-2 text-[10px] font-medium tracking-wide text-navy-300">Boarder Portal</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV.map((item) => {
          const active = item.end ? pathname === item.path : pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeMenu}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-mint-500 text-white shadow-[0_8px_20px_rgb(51_199_165/0.4)]'
                  : 'text-navy-200 hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon size={18} className={active ? '' : 'text-navy-300 group-hover:text-mint-300'} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-mint-400 to-brand-500 text-sm font-bold text-white">
            {user?.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{user?.name}</p>
            <p className="truncate text-[11px] text-navy-300">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-navy-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{Sidebar}</aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-[70] bg-navy-950/60 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              className="absolute inset-y-0 left-0 w-72"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              {Sidebar}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-xl p-2 text-navy-800 transition hover:bg-navy-50 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-navy-800">{current.label}</h1>
              <p className="hidden text-xs text-mut sm:block">Welcome back, {user?.name.split(' ')[0]}!</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-navy-700 transition hover:border-mint-400 hover:text-mint-600" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <Link
              to="/"
              className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-navy-700 transition hover:border-mint-400 hover:text-mint-600 sm:inline-flex"
            >
              View public site
            </Link>
            <button
              onClick={handleLogout}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-mint-400 to-brand-500 text-sm font-bold text-white"
              aria-label="Profile"
            >
              {user?.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-6 sm:px-6">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
