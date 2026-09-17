import { AnimatePresence, motion } from 'framer-motion'
import {
  Building2,
  Crown,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth'
import { getAdminMessages, getAdminReceipts } from '../../lib/api'
import { cn } from '../../lib/utils'
import { Avatar } from '../../components/ui'

const NAV = [
  { path: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { path: '/admin/landlords', label: 'Landlords', icon: Users },
  { path: '/admin/receipts', label: 'Payment Receipts', icon: FileText },
  { path: '/admin/messages', label: 'Landlord Messages', icon: MessageSquare },
  { path: '/admin/plans', label: 'Plan Management', icon: Crown },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
]

/** Counts the admin last saw — viewing a tab clears its counter (across
 *  pages) until new activity pushes the count back up. */
let seenPendingReceipts = 0
let seenOpenMessages = 0

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  /* New-subscription counter for the Payment Receipts tab. Polls every 15s
     so a landlord subscribing shows up without a refresh; approving on the
     receipts page invalidates the same query key and updates this too. */
  const { data: pendingReceipts } = useQuery({
    queryKey: ['admin-receipts', 'pending'],
    queryFn: () => getAdminReceipts('pending'),
    refetchInterval: 15000,
  })
  const pendingCount = pendingReceipts?.length ?? 0
  const [seenReceipts, setSeenReceipts] = useState(seenPendingReceipts)
  const viewingReceipts = pathname.startsWith('/admin/receipts')

  // Opening the tab counts as reading it — clear the badge for good.
  useEffect(() => {
    if (!viewingReceipts) return
    seenPendingReceipts = pendingCount
    setSeenReceipts((s) => (s === pendingCount ? s : pendingCount))
  }, [viewingReceipts, pendingCount])

  const unseenReceipts = Math.max(0, pendingCount - seenReceipts)

  /* Landlord Messages tab badge — counts unanswered messages, polled every
     15s; replying on the messages page invalidates the same query key. */
  const { data: adminMessages } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: getAdminMessages,
    refetchInterval: 15000,
  })
  const openMessages = (adminMessages ?? []).filter((m) => !m.reply).length
  const [seenMessages, setSeenMessages] = useState(seenOpenMessages)
  const viewingMessages = pathname.startsWith('/admin/messages')

  // Opening the tab counts as reading it — clear the badge for good.
  useEffect(() => {
    if (!viewingMessages) return
    seenOpenMessages = openMessages
    setSeenMessages((s) => (s === openMessages ? s : openMessages))
  }, [viewingMessages, openMessages])

  const unseenMessages = Math.max(0, openMessages - seenMessages)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const current = NAV.find((n) => (n.end ? pathname === n.path : pathname.startsWith(n.path))) ?? NAV[0]
  const closeMenu = () => setMobileOpen(false)

  const Sidebar = (
    <div className="flex h-full flex-col bg-navy-900">
      <div className="border-b border-white/10 px-6 pb-4 pt-6">
        <Link to="/" className="inline-flex" aria-label="BoardEase home">
          <img src="/logo.png" alt="BoardEase" decoding="async" className="h-12 w-auto rounded-lg" />
        </Link>
        <p className="mt-3 flex items-center gap-2 text-[10px] font-medium tracking-wide text-navy-300">
          <Shield size={11} className="text-mint-400" /> Admin Console
        </p>
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
              {item.path === '/admin/receipts' && unseenReceipts > 0 && (
                <span
                  className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white"
                  title={`${unseenReceipts} new subscription receipt${unseenReceipts === 1 ? '' : 's'} to review`}
                >
                  {unseenReceipts}
                </span>
              )}
              {item.path === '/admin/messages' && unseenMessages > 0 && (
                <span
                  className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white"
                  title={`${unseenMessages} new landlord message${unseenMessages === 1 ? '' : 's'} to answer`}
                >
                  {unseenMessages}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <Avatar
            src={user?.avatarUrl}
            name={user?.name ?? 'Admin'}
            color="#33C7A5"
            className="h-10 w-10 text-sm"
            rounded="full"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{user?.name ?? 'Admin'}</p>
            <p className="truncate text-[11px] text-navy-300">System Administrator</p>
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
              <p className="hidden text-xs text-mut sm:block">BoardEase System Administration</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-navy-700 transition hover:border-brand-300 hover:text-brand-500 sm:inline-flex"
            >
              <Building2 size={14} /> Landlord View
            </Link>
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
