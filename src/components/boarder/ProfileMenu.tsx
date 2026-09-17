import { AnimatePresence, motion } from 'framer-motion'
import { ChevronUp, Globe, Loader2, LogOut, Settings, Trash2, AlertTriangle, User as UserIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { cn } from '../../lib/utils'
import { deleteAccountAPI } from '../../lib/api'
import { showToast } from './HouseActions'
import { Avatar, Modal } from '../ui'

/**
 * Boarder profile menu, in two shapes:
 *  - "avatar" (default): the topbar avatar opens the menu.
 *  - "card": the sidebar profile card opens the same menu.
 * Either way, logging out and deleting the account are always explicit
 * choices — never accidental clicks.
 */
export default function ProfileMenu({
  className,
  variant = 'avatar',
}: {
  className?: string
  variant?: 'avatar' | 'card'
}) {
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: globalThis.MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/', { replace: true })
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    setDeleting(true)
    setError('')
    try {
      await deleteAccountAPI(user.id)
      setConfirmOpen(false)
      setOpen(false)
      // The toast host lives above the routes, so the confirmation stays
      // visible on the landing page after the redirect.
      showToast('Your account has been permanently deleted.')
      logout()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the account. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const items = [
    { label: 'Profile', icon: UserIcon, action: () => go('/boarder/profile') },
    { label: 'Account Settings', icon: Settings, action: () => go('/boarder/profile?tab=settings') },
    { label: 'View public site', icon: Globe, action: () => go('/') },
  ]

  const menu = (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.16 }}
      role="menu"
      className={cn(
        'absolute w-60 overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-float',
        // The avatar sits in the topbar — open downward. The sidebar card sits
        // at the bottom of the screen — open upward instead.
        variant === 'avatar' ? 'right-0 top-12' : 'bottom-2 left-0 z-50',
      )}
    >
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
        <Avatar
          src={user?.avatarUrl}
          name={user?.name}
          color={user?.avatarColor}
          className="h-10 w-10 text-sm"
          rounded="full"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-navy-800">{user?.name}</p>
          <p className="truncate text-[11px] text-mut">{user?.email}</p>
        </div>
      </div>

      <div className="py-1.5">
        {items.map((item) => (
          <button
            key={item.label}
            role="menuitem"
            onClick={item.action}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-navy-700 transition hover:bg-surface"
          >
            <item.icon size={16} className="text-mut" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="border-t border-slate-100 py-1.5">
        <button
          role="menuitem"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-danger transition hover:bg-red-50"
        >
          <LogOut size={16} />
          Log Out
        </button>
        <button
          role="menuitem"
          onClick={() => {
            setOpen(false)
            setError('')
            setConfirmOpen(true)
          }}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-danger transition hover:bg-red-50"
        >
          <Trash2 size={16} />
          Delete Account
        </button>
      </div>
    </motion.div>
  )

  return (
    <div className={cn('relative', className)} ref={ref}>
      {variant === 'avatar' ? (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-xl transition hover:opacity-90"
            aria-label="Open profile menu"
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <Avatar
              src={user?.avatarUrl}
              name={user?.name}
              color={user?.avatarColor}
              rounded="full"
              className="h-10 w-10 text-sm"
            />
          </button>
          <AnimatePresence>{open && menu}</AnimatePresence>
        </>
      ) : (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl p-3 text-left ring-1 transition',
              open ? 'bg-brand-100/70 ring-brand-200' : 'bg-brand-50/70 ring-brand-100 hover:bg-brand-100/50',
            )}
            aria-label="Open account menu"
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <Avatar
              src={user?.avatarUrl}
              name={user?.name}
              color={user?.avatarColor}
              className="h-9 w-9 text-sm shadow-sm"
              rounded="full"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-navy-800">{user?.name}</p>
              <p className="truncate text-[11px] text-navy-400">{user?.email}</p>
            </div>
            <ChevronUp size={16} className={cn('shrink-0 text-mut transition-transform', open && 'rotate-180')} />
          </button>
          <AnimatePresence>{open && menu}</AnimatePresence>
        </>
      )}

      {/* Delete-account confirmation — a permanent action, so it asks first. */}
      <Modal open={confirmOpen} onClose={deleting ? () => {} : () => setConfirmOpen(false)} title="Delete account?">
        <div className="space-y-4">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-danger">
            <AlertTriangle size={24} />
          </span>
          <p className="text-center text-sm font-semibold text-navy-800">
            Are you sure you want to delete this account? All the information will be permanently deleted.
          </p>
          <ul className="space-y-1.5 rounded-xl bg-surface p-4 text-[13px] text-ink">
            <li>• Your profile, reservations, rentals and payments</li>
            <li>• Your saved favorites and reviews</li>
            <li>• Your messages with landlords</li>
            <li>• Beds you occupy are released back to the house</li>
          </ul>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{error}</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-danger px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {deleting ? 'Deleting…' : 'Delete this account permanently'}
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
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
