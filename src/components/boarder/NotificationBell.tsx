import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Building2, CalendarClock, CheckCheck, CreditCard, DoorOpen, MessageCircle, Star } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarkNotificationRead, useMarkNotificationsRead, useNotifications } from '../../lib/hooks'
import { cn, timeAgo } from '../../lib/utils'
import { Spinner } from '../ui'

const TYPE_META: Record<string, { icon: ReactNode; cls: string }> = {
  reservation: { icon: <CalendarClock size={14} />, cls: 'bg-brand-50 text-brand-500' },
  message: { icon: <MessageCircle size={14} />, cls: 'bg-mint-50 text-mint-600' },
  availability: { icon: <DoorOpen size={14} />, cls: 'bg-navy-50 text-navy-800' },
  review: { icon: <Star size={14} />, cls: 'bg-amber-50 text-amber-soft' },
  'rent-due': { icon: <CreditCard size={14} />, cls: 'bg-amber-50 text-amber-soft' },
  late: { icon: <CreditCard size={14} />, cls: 'bg-red-50 text-danger' },
  contract: { icon: <CalendarClock size={14} />, cls: 'bg-amber-50 text-amber-soft' },
  vacant: { icon: <Building2 size={14} />, cls: 'bg-mint-50 text-mint-600' },
  occupancy: { icon: <Building2 size={14} />, cls: 'bg-navy-50 text-navy-800' },
  subscription: { icon: <CreditCard size={14} />, cls: 'bg-mint-50 text-mint-600' },
}

/**
 * Notification bell for a single account. Backed by the existing
 * `notifications` table and scoped by userId, so boarder A never sees
 * boarder B's (or the owner's) notifications.
 */
export default function NotificationBell({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { data: notifications, isLoading } = useNotifications(userId)
  const markRead = useMarkNotificationRead()
  const markAll = useMarkNotificationsRead()

  const list = notifications ?? []
  const unread = list.filter((n) => !n.read).length

  useEffect(() => {
    if (!open) return
    const onPointer = (e: globalThis.MouseEvent) => {
      const target = e.target as Element | null
      if (!target?.closest?.('[data-notif-menu]')) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openNotification = (id: string, link: string | null) => {
    if (userId) markRead.mutate({ id, userId })
    setOpen(false)
    if (link) navigate(link)
  }

  return (
    <div className="relative" data-notif-menu>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-navy-700 transition hover:border-mint-400 hover:text-mint-600"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-12 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-float"
            role="dialog"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <p className="font-bold text-navy-800">Notifications</p>
              {unread > 0 && (
                <button
                  onClick={() => userId && markAll.mutate(userId)}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-brand-500 transition hover:bg-brand-50"
                >
                  <CheckCheck size={13} /> Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner className="text-brand-500" />
                </div>
              ) : list.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-mint-50 text-mint-600">
                    <CheckCheck size={18} />
                  </span>
                  <p className="text-sm font-semibold text-navy-800">You&apos;re all caught up.</p>
                  <p className="mt-1 text-xs text-ink">Updates about your reservations and messages will appear here.</p>
                </div>
              ) : (
                list.map((n) => {
                  const meta = TYPE_META[n.type] ?? { icon: <Bell size={14} />, cls: 'bg-slate-100 text-slate-500' }
                  return (
                    <button
                      key={n.id}
                      onClick={() => openNotification(n.id, n.link)}
                      className={cn(
                        'flex w-full gap-3 border-b border-slate-50 px-5 py-3.5 text-left transition hover:bg-surface',
                        !n.read && 'bg-brand-50/40',
                      )}
                    >
                      <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', meta.cls)}>
                        {meta.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-semibold text-navy-800">{n.title}</span>
                          {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-ink">{n.message}</span>
                        <span className="mt-1 block text-[10px] font-medium text-mut">{n.date ? timeAgo(n.date) : ''}</span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
