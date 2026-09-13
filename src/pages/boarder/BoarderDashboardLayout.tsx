import { AnimatePresence, motion } from 'framer-motion'
import VirtualAssistant from '../../components/boarder/VirtualAssistant'
import {
  ArrowLeftRight,
  Building2,
  CalendarClock,
  CreditCard,
  Heart,
  Home,
  Menu,
  MessageCircle,
  Star,
} from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import NotificationBell from '../../components/boarder/NotificationBell'
import ProfileMenu from '../../components/boarder/ProfileMenu'
import { Avatar } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { useCompare } from '../../lib/compare'
import { useConversations, useFavorites, useReservations } from '../../lib/hooks'
import { cn } from '../../lib/utils'

interface NavItem {
  path: string
  label: string
  icon: ComponentType<{ size?: number | string; className?: string }>
  end?: boolean
  badge?: number
}

export default function BoarderDashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const { user } = useAuth()
  const compare = useCompare()
  const userId = user?.id?.toString()

  const { data: favorites } = useFavorites(userId)
  const { data: conversations } = useConversations(userId)
  const { data: reservations } = useReservations(userId)

  const unreadMessages = (conversations ?? []).reduce((sum, c) => sum + c.unreadCount, 0)
  const pendingReservations = (reservations ?? []).filter((r) => r.status === 'pending').length

  const NAV: NavItem[] = [
    { path: '/boarder', label: 'My Home', icon: Home, end: true },
    { path: '/boarder/browse', label: 'Browse Houses', icon: Building2 },
    { path: '/boarder/favorites', label: 'Favorites', icon: Heart, badge: favorites?.length },
    { path: '/boarder/compare', label: 'Compare', icon: ArrowLeftRight, badge: compare.count || undefined },
    { path: '/boarder/reservations', label: 'My Reservations', icon: CalendarClock, badge: pendingReservations || undefined },
    { path: '/boarder/payments', label: 'My Payments', icon: CreditCard },
    { path: '/boarder/reviews', label: 'My Reviews', icon: Star },
    { path: '/boarder/messages', label: 'Messages', icon: MessageCircle, badge: unreadMessages || undefined },
  ]

  const current = NAV.find((n) => (n.end ? pathname === n.path : pathname.startsWith(n.path))) ?? NAV[0]
  const closeMenu = () => setMobileOpen(false)

  const Sidebar = (
    <div className="flex h-full flex-col bg-navy-900">
      <div className="px-6 pb-2 pt-6">
        <Link to="/" className="inline-flex" aria-label="BoardEase home">
          <img
            src="/logo.png"
            alt="BoardEase"
            decoding="async"
            className="h-14 w-auto drop-shadow-sm"
            draggable={false}
          />
        </Link>
        <p className="mt-2 text-[10px] font-semibold tracking-wide text-navy-300 uppercase">Boarder Portal</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Boarder navigation">
        {NAV.map((item) => {
          const active = item.end ? pathname === item.path : pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeMenu}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-navy-950 shadow-[0_8px_20px_rgb(51_199_165/0.55)] ring-1 ring-white/20'
                  : 'text-navy-200 hover:bg-white/5 hover:text-white',
              )}
            >
              {active ? (
                <item.icon size={18} className="text-navy-950" />
              ) : (
                <item.icon size={18} className="text-navy-300 group-hover:text-mint-300" />
              )}
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span
                  className={cn(
                    'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                    active ? 'bg-navy-900/40 text-navy-50 ring-1 ring-white/20' : 'bg-mint-400/20 text-mint-300',
                  )}
                >
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/5">
          <Avatar
            src={user?.avatarUrl}
            name={user?.name}
            color={user?.avatarColor}
            className="h-9 w-9 text-sm shadow-sm"
            rounded="full"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{user?.name}</p>
            <p className="truncate text-[11px] text-navy-300">{user?.email}</p>
          </div>
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

      {/* Virtual assistant — only on boarder side */}
      <VirtualAssistant />

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
              <p className="hidden text-xs text-mut sm:block">
                Welcome back, {user?.name?.split(' ')[0]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell userId={userId} />
            <Link
              to="/"
              className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-navy-700 transition hover:border-mint-400 hover:text-mint-600 sm:inline-flex"
            >
              View public
            </Link>
            <ProfileMenu />
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
