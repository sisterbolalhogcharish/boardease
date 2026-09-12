import { motion } from 'framer-motion'
import { Bell, Camera, Mail, Phone, Save, ShieldCheck, Trash2, UserCog, User as UserIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Avatar, Skeleton } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { useBoarderProfile, useUpdateProfile } from '../../lib/hooks'
import { cn, fileToSquareDataUrl, prettyDate } from '../../lib/utils'

type Tab = 'profile' | 'settings'

export default function BoarderProfile() {
  const { user, updateUser } = useAuth()
  const userId = user?.id?.toString()
  const { data: profile, isLoading } = useBoarderProfile(userId)
  const updateProfile = useUpdateProfile(userId)
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'settings' ? 'settings' : 'profile')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    age: '',
    gender: '',
    school: '',
    course: '',
    guardianName: '',
    guardianPhone: '',
    address: '',
  })

  useEffect(() => {
    if (!profile) return
    setForm({
      name: profile.name ?? '',
      phone: profile.phone ?? '',
      age: profile.age ? String(profile.age) : '',
      gender: profile.gender ?? '',
      school: profile.school ?? '',
      course: profile.course ?? '',
      guardianName: profile.guardianName ?? '',
      guardianPhone: profile.guardianPhone ?? '',
      address: profile.address ?? '',
    })
  }, [profile])

  /* ---------------- profile photo ---------------- */
  const pickPhoto = () => photoInput.current?.click()

  const onPhotoChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset so choosing the same file twice still fires a change event.
    e.target.value = ''
    if (!file || !userId) return
    setNotice('')
    setError('')
    setPhotoBusy(true)
    try {
      const dataUrl = await fileToSquareDataUrl(file)
      await updateProfile.mutateAsync({ userId, avatarUrl: dataUrl })
      // Avatar updates everywhere immediately (topbar, profile menu, reviews…).
      updateUser({ avatarUrl: dataUrl })
      setNotice('Profile photo updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your profile photo.')
    } finally {
      setPhotoBusy(false)
    }
  }

  const removePhoto = async () => {
    if (!userId) return
    setNotice('')
    setError('')
    setPhotoBusy(true)
    try {
      await updateProfile.mutateAsync({ userId, avatarUrl: '' })
      updateUser({ avatarUrl: undefined })
      setNotice('Profile photo removed.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove your profile photo.')
    } finally {
      setPhotoBusy(false)
    }
  }

  const switchTab = (next: Tab) => {
    setTab(next)
    setNotice('')
    setError('')
    const p = new URLSearchParams(params)
    if (next === 'settings') p.set('tab', 'settings')
    else p.delete('tab')
    setParams(p, { replace: true })
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!userId) return
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setError('')
    try {
      await updateProfile.mutateAsync({
        userId,
        name: form.name.trim(),
        phone: form.phone.trim(),
        age: form.age ? Number(form.age) : null,
        gender: form.gender,
        school: form.school,
        course: form.course,
        guardianName: form.guardianName,
        guardianPhone: form.guardianPhone,
        address: form.address,
      })
      // Reflect the change in the signed-in session immediately.
      updateUser({ name: form.name.trim(), phone: form.phone.trim() || undefined })
      setNotice('Account settings saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your settings.')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 rounded-[18px]" />
        <Skeleton className="h-72 rounded-[18px]" />
      </div>
    )
  }

  const field = (
    key: keyof typeof form,
    label: string,
    opts?: { type?: string; placeholder?: string; optional?: boolean },
  ) => (
    <div>
      <label htmlFor={`profile-${key}`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mut">
        {label} {opts?.optional ? <span className="font-normal normal-case">(optional)</span> : null}
      </label>
      <input
        id={`profile-${key}`}
        type={opts?.type ?? 'text'}
        value={form[key]}
        placeholder={opts?.placeholder}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Identity card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-5 rounded-[18px] border border-slate-100 bg-white p-6 shadow-card"
      >
        <div className="flex flex-col items-center gap-2">
          <Avatar
            src={profile?.avatarUrl}
            name={profile?.name}
            color={profile?.avatarColor}
            rounded="full"
            className="h-16 w-16 text-lg"
          />
          <input
            ref={photoInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onPhotoChosen}
          />
          <button
            type="button"
            onClick={pickPhoto}
            disabled={photoBusy}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-ink transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-60"
          >
            <Camera size={12} /> {photoBusy ? 'Saving…' : profile?.avatarUrl ? 'Change' : 'Add photo'}
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-navy-800">{profile?.name}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink">
            <Mail size={13} className="text-mut" /> {profile?.email}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-mint-600">
              <ShieldCheck size={12} /> Boarder account
            </span>
            {profile?.phone && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-ink">
                <Phone size={11} /> {profile.phone}
              </span>
            )}
            {profile?.memberSince && (
              <span className="text-[11px] text-mut">Member since {prettyDate(profile.memberSince)}</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-[18px] border border-slate-100 bg-white p-3 shadow-card" role="tablist">
        {(
          [
            { value: 'profile' as const, label: 'Profile', icon: UserIcon },
            { value: 'settings' as const, label: 'Account Settings', icon: UserCog },
          ]
        ).map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => switchTab(t.value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
              tab === t.value ? 'bg-navy-800 text-white' : 'text-ink hover:bg-surface hover:text-navy-800',
            )}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {notice && <p className="rounded-lg bg-mint-50 px-3 py-2 text-sm font-medium text-mint-600">{notice}</p>}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{error}</p>}

      {tab === 'profile' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
            <h3 className="text-lg font-bold text-navy-800">My information</h3>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ['Full name', profile?.name],
                ['Email', profile?.email],
                ['Contact number', profile?.phone || 'Not provided'],
                ['Role', 'Boarder'],
                ['Age', profile?.age ? String(profile.age) : 'Not provided'],
                ['Gender', profile?.gender || 'Not provided'],
                ['Address', profile?.address || 'Not provided'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 border-b border-slate-50 pb-2.5 last:border-0">
                  <dt className="text-ink">{label}</dt>
                  <dd className="text-right font-semibold text-navy-800">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-6">
            <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
              <h3 className="text-lg font-bold text-navy-800">School details</h3>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  ['School', profile?.school || 'Not provided'],
                  ['Course', profile?.course || 'Not provided'],
                  ['Guardian', profile?.guardianName || 'Not provided'],
                  ['Guardian contact', profile?.guardianPhone || 'Not provided'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 border-b border-slate-50 pb-2.5 last:border-0">
                    <dt className="text-ink">{label}</dt>
                    <dd className="text-right font-semibold text-navy-800">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex items-start gap-3 rounded-[18px] border border-slate-100 bg-white p-5 shadow-card">
              <Bell size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <div>
                <p className="text-sm font-bold text-navy-800">Notifications</p>
                <p className="mt-1 text-xs leading-relaxed text-ink">
                  BoardEase notifies you in-app about reservation decisions, owner messages and room availability
                  updates. Email/SMS preferences are not configured in this version.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={save} className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
          <h3 className="text-lg font-bold text-navy-800">Account Settings</h3>
          <p className="mt-1 text-sm text-ink">
            Update your own account details. Your email address and account role cannot be changed here.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {field('name', 'Full name')}
            <div>
              <label htmlFor="profile-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mut">
                Email
              </label>
              <input
                id="profile-email"
                value={profile?.email ?? ''}
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-surface px-3 py-2.5 text-sm text-mut outline-none"
              />
            </div>
            {field('phone', 'Contact number', { placeholder: '0917 000 0000', optional: true })}
            {field('age', 'Age', { type: 'number', optional: true })}
            <div>
              <label htmlFor="profile-gender" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mut">
                Gender <span className="font-normal normal-case">(optional)</span>
              </label>
              <select
                id="profile-gender"
                value={form.gender}
                onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
                className="w-full cursor-pointer rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-navy-800 outline-none transition focus:border-brand-400"
              >
                <option value="">Not specified</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            {field('school', 'School', { optional: true })}
            {field('course', 'Course', { optional: true })}
            {field('guardianName', 'Guardian name', { optional: true })}
            {field('guardianPhone', 'Guardian contact', { optional: true })}
          </div>

          <div className="mt-4">{field('address', 'Home address', { optional: true })}</div>

          {/* Profile photo */}
          <div className="mt-6 rounded-[14px] border border-slate-100 bg-surface/60 p-4">
            <p className="text-sm font-bold text-navy-800">Profile photo</p>
            <p className="mt-1 text-xs leading-relaxed text-ink">
              Attach a picture and your avatar updates everywhere. Images are resized in your browser before
              saving, so a JPG or PNG of any size works. Optional.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Avatar
                src={profile?.avatarUrl}
                name={profile?.name}
                color={profile?.avatarColor}
                rounded="full"
                className="h-14 w-14 text-base"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={pickPhoto}
                  disabled={photoBusy}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-60"
                >
                  <Camera size={14} /> {profile?.avatarUrl ? 'Change photo' : 'Upload photo'}
                </button>
                {profile?.avatarUrl && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    disabled={photoBusy}
                    className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-danger transition hover:bg-red-50 disabled:opacity-60"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
            </div>
            {profile?.avatarUrl && (
              <p className="mt-2 text-[11px] text-mut">A profile photo is attached to this account.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            <Save size={15} /> {updateProfile.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      )}
    </div>
  )
}
