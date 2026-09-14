import { Camera, Check, Eye, EyeOff, Mail, Phone, Save, ShieldCheck, User, Lock } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../../lib/auth'
import { Avatar, Spinner } from '../../components/ui'
import { fileToSquareDataUrl } from '../../lib/utils'

export default function AdminSettings() {
  const { user, updateUser } = useAuth()
  const [saved, setSaved] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)

  // Profile form
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')

  // Email change
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [showEmailPw, setShowEmailPw] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)

  // Password change
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name ?? '')
      setPhone(user.phone ?? '')
      setNewEmail(user.email ?? '')
    }
  }, [user?.name, user?.phone, user?.email])

  const pickPhoto = () => photoInput.current?.click()

  const onPhotoChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    setNotice('')
    setError('')
    setPhotoBusy(true)
    try {
      const dataUrl = await fileToSquareDataUrl(file)
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id.toString(), avatarUrl: dataUrl }),
      })
      if (!res.ok) throw new Error('Could not update profile photo')
      updateUser({ avatarUrl: dataUrl })
      setNotice('Profile photo updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your profile photo.')
    } finally {
      setPhotoBusy(false)
    }
  }

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!name.trim()) {
      setError('Full name is required.')
      return
    }
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id.toString(),
          name: name.trim(),
          phone: phone.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Could not save profile')
      }
      updateUser({ name: name.trim(), phone: phone.trim() || undefined })
      setNotice('Profile saved successfully.')
      setSaved(true)
      setTimeout(() => setSaved(false), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your settings.')
    }
  }

  const changeEmail = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!newEmail.trim()) {
      setError('Please enter a new email address.')
      return
    }
    if (!emailPassword) {
      setError('Please enter your current password to confirm.')
      return
    }
    setError('')
    setNotice('')
    setEmailSaving(true)
    try {
      const res = await fetch('/api/admin/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id.toString(),
          newEmail: newEmail.trim(),
          currentPassword: emailPassword,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not change email')
      updateUser({ email: body.email || newEmail.trim() })
      setEmailPassword('')
      setNotice('Email changed successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change email.')
    } finally {
      setEmailSaving(false)
    }
  }

  const changePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!currentPw) {
      setError('Please enter your current password.')
      return
    }
    if (newPw.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (newPw !== confirmPw) {
      setError('New passwords do not match.')
      return
    }
    setError('')
    setNotice('')
    setPwSaving(true)
    try {
      const res = await fetch('/api/admin/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id.toString(),
          currentPassword: currentPw,
          newPassword: newPw,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not change password')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setNotice('Password changed successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.')
    } finally {
      setPwSaving(false)
    }
  }

  const pwInput = (id: string, label: string, value: string, onChange: (v: string) => void, show: boolean, toggleShow: () => void, placeholder?: string) => (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-mut">{label}</label>
      <div className="relative">
        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-10 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        <button type="button" onClick={toggleShow} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-navy-700" tabIndex={-1}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl space-y-5">
      {/* Profile section */}
      <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-navy-800">Admin Profile</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-600">
            <ShieldCheck size={11} /> System Administrator
          </span>
        </div>
        <p className="mt-1 text-sm text-ink">Manage your admin account details.</p>

        {/* Identity card */}
        <div className="mt-6 flex flex-wrap items-center gap-5 rounded-[16px] border border-slate-100 bg-surface/40 p-5">
          <Avatar
            src={user?.avatarUrl}
            name={user?.name}
            color={user?.avatarColor}
            rounded="full"
            className="h-16 w-16 rounded-full text-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-navy-800">{user?.name ?? 'Admin'}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink">
              <Mail size={13} className="text-mut" /> {user?.email}
            </p>
          </div>
          <input ref={photoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPhotoChosen} />
          <button
            type="button"
            onClick={pickPhoto}
            disabled={photoBusy}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-60"
          >
            {photoBusy ? <Spinner className="h-4 w-4" /> : <Camera size={14} />}
            {user?.avatarUrl ? 'Change photo' : 'Add photo'}
          </button>
        </div>

        <form onSubmit={saveProfile} className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="admin-name" className="text-xs font-semibold uppercase tracking-wider text-mut">Full name</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="admin-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="admin-phone" className="text-xs font-semibold uppercase tracking-wider text-mut">Phone number</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="admin-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0917 000 0000"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saved}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgb(30_115_232/0.3)] transition hover:-translate-y-0.5 hover:bg-brand-600 disabled:opacity-70"
            >
              {saved ? <Check size={16} /> : <Save size={16} />}
              {saved ? 'Saved!' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Change email */}
      <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
        <h3 className="font-bold text-navy-800">Change Email</h3>
        <p className="mt-1 text-sm text-ink">Update the email address used to log in. You must enter your current password to confirm.</p>
        <form onSubmit={changeEmail} className="mt-5 space-y-4">
          <div className="grid gap-1.5">
            <label htmlFor="admin-email" className="text-xs font-semibold uppercase tracking-wider text-mut">New email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="admin-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
          {pwInput('email-pw', 'Current password', emailPassword, setEmailPassword, showEmailPw, () => setShowEmailPw(!showEmailPw), 'Enter current password to confirm')}
          <button
            type="submit"
            disabled={emailSaving}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-navy-800 transition hover:border-brand-300 hover:text-brand-500 disabled:opacity-60"
          >
            {emailSaving ? <Spinner className="h-4 w-4" /> : <Mail size={15} />}
            {emailSaving ? 'Updating…' : 'Update email'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
        <h3 className="font-bold text-navy-800">Change Password</h3>
        <p className="mt-1 text-sm text-ink">Choose a strong password. Minimum 6 characters.</p>
        <form onSubmit={changePassword} className="mt-5 space-y-4">
          {pwInput('pw-current', 'Current password', currentPw, setCurrentPw, showCurrentPw, () => setShowCurrentPw(!showCurrentPw))}
          {pwInput('pw-new', 'New password', newPw, setNewPw, showNewPw, () => setShowNewPw(!showNewPw), 'Minimum 6 characters')}
          <div className="grid gap-1.5">
            <label htmlFor="pw-confirm" className="text-xs font-semibold uppercase tracking-wider text-mut">Confirm new password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="pw-confirm"
                type={showNewPw ? 'text' : 'password'}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-10 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={pwSaving}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-navy-800 transition hover:border-brand-300 hover:text-brand-500 disabled:opacity-60"
          >
            {pwSaving ? <Spinner className="h-4 w-4" /> : <Lock size={15} />}
            {pwSaving ? 'Updating…' : 'Change password'}
          </button>
        </form>
      </div>

      {/* Notices */}
      {(notice || error) && (
        <div className="flex flex-wrap items-center gap-3">
          {notice && <p className="rounded-lg bg-mint-50 px-4 py-2.5 text-sm font-medium text-mint-600">{notice}</p>}
          {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-danger">{error}</p>}
        </div>
      )}
    </div>
  )
}
