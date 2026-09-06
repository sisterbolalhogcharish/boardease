import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Bot,
  Building2,
  CreditCard,
  Crown,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Settings,
  Star,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useMarkNotificationsRead, useNotifications } from '../../lib/hooks'
import { cn, timeAgo } from '../../lib/utils'
import { Spinner } from '../../components/ui'

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/dashboard/rooms', label: 'Rooms', icon: Building2 },
  { path: '/dashboard/boarders', label: 'Boarders', icon: Users },
  { path: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { path: '/dashboard/analytics', label: 'Analytics', icon: LineChart },
  { path: '/dashboard/reports', label: 'Reports', icon: FileText },
  { path: '/dashboard/reviews', label: 'Reviews', icon: Star },
  { path: '/dashboard/subscription', label: 'Subscription', icon: Crown },
  { path: '/dashboard/settings', label: 'Settings', icon: Settings },
]

const NOTIF_ICON: Record<string, string> = {
  'rent-due': 'bg-brand-50 text-brand-500',
  late: 'bg-red-50 text-danger',
  contract: 'bg-amber-50 text-amber-soft',
  vacant: 'bg-mint-50 text-mint-600',
  occupancy: 'bg-navy-50 text-navy-800',
  review: 'bg-amber-50 text-amber-soft',
  subscription: 'bg-mint-50 text-mint-600',
}

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { data: notifications } = useNotifications()
  const markRead = useMarkNotificationsRead()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const unread = notifications?.filter((n) => !n.read).length ?? 0
  const current = NAV.find((n) => (n.end ? pathname === n.path : pathname.startsWith(n.path))) ?? NAV[0]

  const closeMenu = () => setMobileOpen(false)

  const Sidebar = (
    <div className="flex h-full flex-col bg-navy-900">
      <div className="px-6 pb-2 pt-6">
        <Link to="/" className="inline-flex" aria-label="BoardEase home">
          <img src="/logo.png" alt="BoardEase" decoding="async" className="h-12 w-auto rounded-lg" />
        </Link>
        <p className="mt-2 text-[10px] font-medium tracking-wide text-navy-300">Landlord Console</p>
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
                  ? 'bg-brand-500 text-white shadow-[0_8px_20px_rgb(30_115_232/0.4)]'
                  : 'text-navy-200 hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon size={18} className={active ? '' : 'text-navy-300 group-hover:text-mint-300'} />
              {item.label}
            </Link>
          )
        })}

        <Link
          to="/dashboard/ai"
          onClick={closeMenu}
          className={cn(
            'group mt-4 flex items-center gap-3 rounded-xl border border-mint-400/25 bg-gradient-to-r from-mint-400/15 to-brand-500/15 px-3.5 py-3 text-sm font-semibold transition-all duration-200',
            pathname.startsWith('/dashboard/ai')
              ? 'bg-gradient-to-r from-mint-400 to-brand-500 text-white shadow-[0_8px_20px_rgb(51_199_165/0.4)]'
              : 'text-mint-300 hover:from-mint-400/25 hover:to-brand-500/25 hover:text-white',
          )}
        >
          <Bot size={19} />
          AI Assistant
          <span className="ml-auto rounded-full bg-mint-400/20 px-2 py-0.5 text-[10px] font-bold text-mint-300">NEW</span>
        </Link>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-mint-400 text-sm font-bold text-white">
            RC
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">Rosario C. Cabasan</p>
            <p className="truncate text-[11px] text-navy-300">Sunset Boarding House · Standard</p>
          </div>
          <button onClick={handleLogout} className="rounded-lg p-2 text-navy-300 transition hover:bg-white/10 hover:text-white" aria-label="Log out">
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
              <p className="hidden text-xs text-mut sm:block">Sunset Boarding House · San Juan, Siquijor</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen((o) => !o)
                  if (!notifOpen && unread > 0) markRead.mutate()
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-navy-700 transition hover:border-brand-300 hover:text-brand-500"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white ring-2 ring-white">
                    {unread}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-12 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-float"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                      <p className="font-bold text-navy-800">Notifications</p>
                      {unread > 0 && (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-500">{unread} new</span>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {!notifications ? (
                        <div className="flex justify-center py-8">
                          <Spinner className="text-brand-500" />
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={cn('flex gap-3 border-b border-slate-50 px-5 py-3.5 transition hover:bg-surface', !n.read && 'bg-brand-50/40')}>
                            <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', NOTIF_ICON[n.type])}>
                              <Bell size={14} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-navy-800">{n.title}</p>
                              <p className="mt-0.5 text-xs leading-relaxed text-ink">{n.message}</p>
                              <p className="mt-1 text-[10px] font-medium text-mut">{timeAgo(n.date)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              to="/"
              className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-navy-700 transition hover:border-brand-300 hover:text-brand-500 sm:inline-flex"
            >
              View public site
            </Link>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-navy-800 to-navy-600 text-sm font-bold text-white" aria-label="Profile">
              RC
            </button>
            <button className="rounded-xl p-2 text-navy-700 transition hover:bg-navy-50 lg:hidden" aria-label="Close">
              <X size={18} className="opacity-0" />
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
