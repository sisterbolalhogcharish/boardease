import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Bot,
  Building2,
  CalendarClock,
  CreditCard,
  Crown,
  FileText,
  Home,
  LayoutDashboard,
  LineChart,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquareHeart,
  Receipt,
  Settings,
  Star,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth'
import { deleteAccountAPI, getSubscriptionReceipts } from '../../lib/api'
import { showToast } from '../../components/boarder/HouseActions'
import { useLandlordHouse } from '../../lib/landlordHouse'
import { useMarkNotificationsRead, useNotifications } from '../../lib/hooks'
import { cn, timeAgo } from '../../lib/utils'
import { Avatar, Modal, Spinner } from '../../components/ui'
import { usePlanFeatures } from '../../components/dashboard/PlanGate'

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true, always: true },
  // Always available, like Subscription and Settings — a landlord must be able
  // to set up their listing before any paid feature makes sense.
  { path: '/dashboard/my-house', label: 'My Boarding House', icon: Home, always: true },
  { path: '/dashboard/rooms', label: 'Rooms', icon: Building2, feature: 'rooms' as const },
  { path: '/dashboard/boarders', label: 'Boarders', icon: Users, feature: 'boarders' as const },
  { path: '/dashboard/reservations', label: 'Reservations', icon: CalendarClock, feature: 'reservations' as const },
  { path: '/dashboard/messages', label: 'Messages', icon: MessageCircle, feature: 'messages' as const },
  { path: '/dashboard/payments', label: 'Payments', icon: CreditCard, feature: 'payments' as const },
  { path: '/dashboard/analytics', label: 'Analytics', icon: LineChart, feature: 'analytics' as const },
  { path: '/dashboard/reports', label: 'Reports', icon: FileText, feature: 'reports' as const },
  { path: '/dashboard/reviews', label: 'Reviews', icon: Star, feature: 'reviews' as const },
  // `end` keeps the longer `/dashboard/subscription/history` route from
  // highlighting both entries at once.
  { path: '/dashboard/subscription', label: 'Subscription', icon: Crown, always: true, end: true },
  { path: '/dashboard/subscription/history', label: 'Payment History', icon: Receipt },
  { path: '/dashboard/settings', label: 'Settings', icon: Settings },
  // Always available feedback form; its rating + comment show on the home page.
  { path: '/dashboard/rate-us', label: 'Rate us', icon: MessageSquareHeart, always: true },
]

const NOTIF_ICON: Record<string, string> = {
  'rent-due': 'bg-brand-50 text-brand-500',
  late: 'bg-red-50 text-danger',
  contract: 'bg-amber-50 text-amber-soft',
  vacant: 'bg-mint-50 text-mint-600',
  occupancy: 'bg-navy-50 text-navy-800',
  review: 'bg-amber-50 text-amber-soft',
  subscription: 'bg-mint-50 text-mint-600',
  message: 'bg-brand-50 text-brand-500',
}

/** Reviewed-receipt count the landlord last saw on Payment History — once
 *  viewed the counter stays cleared (across pages) until the admin reviews
 *  another of their receipts. */
let seenReviewedReceipts = 0

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const profileRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  // The landlord's own house — replaces the hardcoded "Sunset Boarding House"
  // that used to show for every account, including brand-new landlords.
  const { house, userId: houseUserId, loading: houseLoading } = useLandlordHouse()
  const userId = houseUserId?.toString()
  // Scoped to this landlord — without the userId this returned *every*
  // landlord's notifications, so admin replies and rent reminders for other
  // accounts showed up in this user's bell.
  const { data: notifications } = useNotifications(userId)
  const markRead = useMarkNotificationsRead()
  const { features, planKey } = usePlanFeatures()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // The topbar avatar opens a small menu; deleting the account is a permanent
  // action, so it opens the confirmation modal instead of acting directly.
  useEffect(() => {
    if (!profileOpen) return
    const onPointer = (e: globalThis.MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) setProfileOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setProfileOpen(false)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [profileOpen])

  const handleDeleteAccount = async () => {
    if (!user) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteAccountAPI(user.id)
      setDeleteOpen(false)
      setProfileOpen(false)
      // The toast host lives above the routes, so the confirmation stays
      // visible on the landing page after the redirect.
      showToast(
        house
          ? 'Your account and boarding house listing have been permanently deleted.'
          : 'Your account has been permanently deleted.',
      )
      logout()
      navigate('/', { replace: true })
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete the account. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const unread = notifications?.filter((n) => !n.read).length ?? 0

  /* Payment History tab badge — counts subscription receipts the admin has
     reviewed (approved or rejected) since the landlord last opened the page.
     Polls every 15s; submitting/reviewing invalidates the same query key. */
  const { data: historyReceipts } = useQuery({
    queryKey: ['subscription-receipts', userId],
    queryFn: () => getSubscriptionReceipts(userId!),
    enabled: !!userId,
    refetchInterval: 15000,
  })
  const reviewedCount = (historyReceipts ?? []).filter((r) => r.status !== 'pending').length
  const [seenReviewed, setSeenReviewed] = useState(seenReviewedReceipts)
  const viewingHistory = pathname.startsWith('/dashboard/subscription/history')

  // Opening the tab counts as reading it — clear the badge for good.
  useEffect(() => {
    if (!viewingHistory) return
    seenReviewedReceipts = reviewedCount
    setSeenReviewed((s) => (s === reviewedCount ? s : reviewedCount))
  }, [viewingHistory, reviewedCount])

  const unseenReviewed = Math.max(0, reviewedCount - seenReviewed)
  const current = NAV.find((n) => (n.end ? pathname === n.path : pathname.startsWith(n.path))) ?? NAV[0]

  const closeMenu = () => setMobileOpen(false)

  const Sidebar = (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="px-6 pb-2 pt-6">
        <Link to="/" className="inline-flex" aria-label="BoardEase home">
          <img src="/logo.png" alt="BoardEase" decoding="async" className="h-12 w-auto rounded-lg" />
        </Link>
        <p className="mt-2 text-[10px] font-medium tracking-wide text-mut">Landlord Console</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV.filter((item) => item.always || !item.feature || features[item.feature]).map((item) => {
          const active = item.end ? pathname === item.path : pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeMenu}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-brand-50 font-semibold text-brand-700'
                  : 'text-navy-800 hover:bg-navy-50 hover:text-navy-900',
              )}
            >
              <item.icon size={18} className={active ? 'text-brand-500' : 'text-mut group-hover:text-brand-500'} />
              {item.label}
              {item.path === '/dashboard/subscription/history' && unseenReviewed > 0 && (
                <span
                  className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white"
                  title={`${unseenReviewed} of your payment${unseenReviewed === 1 ? '' : 's'} was reviewed by the admin`}
                >
                  {unseenReviewed}
                </span>
              )}
            </Link>
          )
        })}

        {features.aiAssistant && (
          <Link
            to="/dashboard/ai"
            onClick={closeMenu}
            className={cn(
              'group mt-4 flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-3.5 py-3 text-sm font-semibold transition-all duration-200',
              pathname.startsWith('/dashboard/ai')
                ? 'border-brand-300 bg-brand-100/70 text-brand-700'
                : 'text-brand-600 hover:bg-brand-100/60 hover:text-brand-700',
            )}
          >
            <Bot size={19} />
            AI Assistant
            <span className="ml-auto rounded-full bg-mint-400/20 px-2 py-0.5 text-[10px] font-bold text-mint-600">NEW</span>
          </Link>
        )}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-navy-50 p-3">
          <Avatar
            src={user?.avatarUrl}
            name={user?.name}
            color={user?.avatarColor}
            className="h-10 w-10 text-sm"
            rounded="full"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-navy-800">{user?.name ?? 'Landlord'}</p>
            <p className="truncate text-[11px] text-mut">
              {house ? house.name : 'No boarding house yet'}
              {planKey !== 'none' ? ` · ${planKey.charAt(0).toUpperCase() + planKey.slice(1)}` : ''}
            </p>
          </div>
          <button onClick={handleLogout} className="rounded-lg p-2 text-mut transition hover:bg-navy-100 hover:text-navy-800" aria-label="Log out">
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
              <p className="hidden text-xs text-mut sm:block">
                {house ? `${house.name} · ${house.barangay}, ${house.municipality}` : 'Not listed in Explore yet'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen((o) => !o)
                  if (!notifOpen && unread > 0) markRead.mutate(userId)
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
                        notifications.map((n) => {
                          const body = (
                            <>
                              <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', NOTIF_ICON[n.type])}>
                                <Bell size={14} />
                              </span>
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-navy-800">{n.title}</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-ink">{n.message}</p>
                                <p className="mt-1 text-[10px] font-medium text-mut">{timeAgo(n.date)}</p>
                              </div>
                            </>
                          )
                          const cls = cn('flex gap-3 border-b border-slate-50 px-5 py-3.5 transition hover:bg-surface', !n.read && 'bg-brand-50/40')
                          // Notifications that carry a destination (e.g. an admin
                          // reply) open it; the rest stay informational.
                          return n.link ? (
                            <Link key={n.id} to={n.link} onClick={() => setNotifOpen(false)} className={cls}>
                              {body}
                            </Link>
                          ) : (
                            <div key={n.id} className={cls}>
                              {body}
                            </div>
                          )
                        })
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
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="rounded-full transition hover:opacity-90"
                aria-label={user?.name ? `${user.name} profile` : 'Profile'}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <Avatar
                  src={user?.avatarUrl}
                  name={user?.name}
                  color={user?.avatarColor}
                  className="h-10 w-10 text-sm"
                  rounded="full"
                />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    role="menu"
                    className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-float"
                  >
                    <div className="border-b border-slate-100 px-4 py-3.5">
                      <p className="truncate text-sm font-bold text-navy-800">{user?.name}</p>
                      <p className="truncate text-[11px] text-mut">{user?.email}</p>
                    </div>
                    <div className="border-b border-slate-100 py-1.5">
                      <button
                        role="menuitem"
                        onClick={() => {
                          setProfileOpen(false)
                          navigate('/dashboard/settings')
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-navy-700 transition hover:bg-surface"
                      >
                        <Settings size={16} className="text-mut" /> Account settings
                      </button>
                      <button
                        role="menuitem"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-danger transition hover:bg-red-50"
                      >
                        <LogOut size={16} /> Log out
                      </button>
                    </div>
                    <div className="py-1.5">
                      <button
                        role="menuitem"
                        onClick={() => {
                          setProfileOpen(false)
                          setDeleteError('')
                          setDeleteOpen(true)
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-danger transition hover:bg-red-50"
                      >
                        <Trash2 size={16} /> Delete account
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button className="rounded-xl p-2 text-navy-700 transition hover:bg-navy-50 lg:hidden" aria-label="Close">
              <X size={18} className="opacity-0" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-6 sm:px-6">
          {/* No-listing banner — a brand-new landlord has nothing in Explore yet,
              and every other page would just show empty tables. */}
          {!houseLoading && !house && !pathname.startsWith('/dashboard/my-house') && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 to-mint-50 p-6 shadow-sm"
            >
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
                    <Home size={20} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-navy-800">Set up your boarding house</p>
                    <p className="mt-0.5 text-sm text-ink">
                      Add your rooms, amenities and photos so boarders can find you in Explore.
                    </p>
                  </div>
                </div>
                <Link
                  to="/dashboard/my-house"
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgb(30_115_232/0.3)] transition hover:-translate-y-0.5 hover:bg-brand-600"
                >
                  Set it up <ArrowRight size={15} />
                </Link>
              </div>
            </motion.div>
          )}

          {/* No-plan banner — shown on every dashboard page when subscription is 'none' */}
          {planKey === 'none' && !pathname.startsWith('/dashboard/subscription') && !pathname.startsWith('/dashboard/settings') && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 shadow-sm"
            >
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                    <Crown size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-navy-800">No active subscription</p>
                    <p className="mt-0.5 text-sm text-ink">
                      Choose a plan to start managing your boarding house — add boarders, track payments, and more.
                    </p>
                  </div>
                </div>
                <Link
                  to="/dashboard/subscription"
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgb(30_115_232/0.3)] transition hover:-translate-y-0.5 hover:bg-brand-600"
                >
                  Choose a plan <Crown size={15} />
                </Link>
              </div>
            </motion.div>
          )}
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

      {/* Delete-account confirmation — a permanent action, so it asks first.
          For a landlord this also takes down their whole listing. */}
      <Modal open={deleteOpen} onClose={deleting ? () => {} : () => setDeleteOpen(false)} title="Delete account?">
        <div className="space-y-4">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-danger">
            <AlertTriangle size={24} />
          </span>
          <p className="text-center text-sm font-semibold text-navy-800">
            Are you sure you want to delete? All the information you have will be permanently deleted.
          </p>
          <ul className="space-y-1.5 rounded-xl bg-surface p-4 text-[13px] text-ink">
            <li>• Your account and profile information</li>
            <li>• Your boarding house listing, rooms and photos</li>
            <li>• Boarder rentals, reservations and payment records</li>
            <li>• Your reviews, favorites and messages</li>
          </ul>
          {deleteError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{deleteError}</p>}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-danger px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </button>
            <button
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-navy-800 transition hover:border-slate-300 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
