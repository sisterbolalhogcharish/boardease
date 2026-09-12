import { AnimatePresence, motion } from 'framer-motion'
import { Globe, LogOut, Settings, User as UserIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { cn } from '../../lib/utils'
import { Avatar } from '../ui'

/**
 * Boarder profile menu. Previously the topbar avatar logged the user out
 * immediately; now it opens a menu (Profile / Account Settings / View public /
 * Log out) so logging out is always an explicit choice.
 */
export default function ProfileMenu({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
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

  const items = [
    { label: 'Profile', icon: UserIcon, action: () => go('/boarder/profile') },
    { label: 'Account Settings', icon: Settings, action: () => go('/boarder/profile?tab=settings') },
    { label: 'View public site', icon: Globe, action: () => go('/') },
  ]

  return (
    <div className={cn('relative', className)} ref={ref}>
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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            role="menu"
            className="absolute right-0 top-12 w-60 overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-float"
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
