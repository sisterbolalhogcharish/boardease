import { Camera, Check, Download, Languages, Save, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useLanguage, type LangCode } from '../../lib/i18n'
import { useAuth } from '../../lib/auth'
import { Avatar } from '../../components/ui'
import { useUpdateProfile } from '../../lib/hooks'
import { cn, fileToSquareDataUrl, prettyDate } from '../../lib/utils'

const TOGGLES = [
  { key: 'rentDue', label: 'Rent due reminders', desc: 'Notify 3 days before rent is due.' },
  { key: 'late', label: 'Late payments', desc: 'Alert immediately when a payment is overdue.' },
  { key: 'contract', label: 'Contract expiry', desc: 'Warn 30 days before a contract ends.' },
  { key: 'vacant', label: 'Vacant rooms', desc: 'Tell me when a room becomes available.' },
  { key: 'review', label: 'New reviews', desc: 'Notify when a boarder leaves a review.' },
  { key: 'subscription', label: 'Subscription', desc: 'Reminders before my plan renews.' },
]

export default function Settings() {
  const { user, updateUser } = useAuth()
  const { lang, setLang, t, languages } = useLanguage()
  const updateProfile = useUpdateProfile(user?.id?.toString())
  const [saved, setSaved] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    rentDue: true,
    late: true,
    contract: true,
    vacant: false,
    review: true,
    subscription: true,
  })
  const photoInput = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    property: '',
  })

  useEffect(() => {
    setForm((prev) => ({ ...prev, name: user?.name ?? '', phone: user?.phone ?? '' }))
  }, [user?.name, user?.phone])

  const pickPhoto = () => photoInput.current?.click()

  const onPhotoChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    if (!updateProfile) return
    setNotice('')
    setError('')
    setPhotoBusy(true)
    try {
      const dataUrl = await fileToSquareDataUrl(file)
      await updateProfile.mutateAsync({ userId: user.id.toString(), avatarUrl: dataUrl })
      updateUser({ avatarUrl: dataUrl })
      setNotice('Profile photo updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your profile photo.')
    } finally {
      setPhotoBusy(false)
    }
  }

  const removePhoto = async () => {
    if (!user || !updateProfile) return
    setNotice('')
    setError('')
    setPhotoBusy(true)
    try {
      await updateProfile.mutateAsync({ userId: user.id.toString(), avatarUrl: '' })
      updateUser({ avatarUrl: undefined })
      setNotice('Profile photo removed.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove your profile photo.')
    } finally {
      setPhotoBusy(false)
    }
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !updateProfile) return
    if (!form.name.trim()) {
      setError('Full name is required.')
      return
    }
    setError('')
    try {
      await updateProfile.mutateAsync({
        userId: user.id.toString(),
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
      })
      updateUser({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        property: form.property.trim() || undefined,
      })
      setNotice('Account settings saved.')
      setSaved(true)
      setTimeout(() => setSaved(false), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your settings.')
    }
  }

  const field = (
    key: keyof typeof form,
    label: string,
    opts?: { type?: string; placeholder?: string; optional?: boolean },
  ) => (
    <div>
      <label htmlFor={`settings-${key}`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mut">
        {label} {opts?.optional ? <span className="font-normal normal-case">(optional)</span> : null}
      </label>
      <input
        id={`settings-${key}`}
        type={opts?.type ?? 'text'}
        value={form[key]}
        placeholder={opts?.placeholder}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-navy-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
    </div>
  )

  return (
    <form onSubmit={save} className="max-w-3xl space-y-5">
      {updateProfile ? (
        <>
          <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
            <h3 className="font-bold text-navy-800">Landlord profile</h3>
            <div className="mt-5 flex items-center gap-4">
              <Avatar
                src={user?.avatarUrl}
                name={user?.name}
                color={user?.avatarColor}
                rounded="full"
                className="h-16 w-16 text-xl"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-navy-800">{user?.name ?? 'Landlord account'}</p>
                <p className="text-xs text-mut">Landlord · Sunset Boarding House</p>
              </div>
            </div>

            <div className="mt-6 rounded-[14px] border border-slate-100 bg-surface/60 p-4">
              <p className="text-sm font-bold text-navy-800">Profile photo</p>
              <p className="mt-1 text-xs leading-relaxed text-ink">
                Attach a picture and your avatar updates everywhere. Images are resized in your browser before saving, so a
                JPG, PNG or WebP of any size works. Optional.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <Avatar
                  src={user?.avatarUrl}
                  name={user?.name}
                  color={user?.avatarColor}
                  rounded="2xl"
                  className="h-14 w-14 text-base"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={pickPhoto}
                    disabled={photoBusy}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-60"
                  >
                    <Camera size={14} /> {user?.avatarUrl ? 'Change photo' : 'Upload photo'}
                  </button>
                  {user?.avatarUrl && (
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
              {user?.avatarUrl && <p className="mt-2 text-[11px] text-mut">A profile photo is attached to this account.</p>}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {field('name', 'Full name')}
              <div>
                <label htmlFor="settings-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mut">
                  Email
                </label>
                <input
                  id="settings-email"
                  value={user?.email ?? ''}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-surface px-3 py-2.5 text-sm text-mut outline-none"
                />
              </div>
              {field('phone', 'Contact number', { placeholder: '0917 000 0000', optional: true })}
              {field('property', 'Property / boarding house name', { placeholder: 'Sunset Boarding House', optional: true })}
              <div className="sm:col-start-2">
                <p className="mt-1.5 text-[11px] text-mut">
                  Property name is saved locally on this device. To appear on your listing, update it in your boarding house details.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
            <h3 className="flex items-center gap-2 font-bold text-navy-800">
              <Languages size={17} className="text-brand-500" /> {t('settings.language')}
            </h3>
            <p className="mt-0.5 text-xs text-mut">{t('settings.languageHint')}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {languages.map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code as LangCode)}
                  className={cn(
                    'flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition',
                    lang === code ? 'border-brand-500 bg-brand-50 text-brand-500' : 'border-slate-200 text-ink hover:border-brand-300',
                  )}
                >
                  {label}
                  {lang === code && <Check size={15} />}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
            <h3 className="font-bold text-navy-800">Notification preferences</h3>
            <p className="mt-0.5 text-xs text-mut">Choose which alerts you want to receive by email &amp; in-app.</p>
            <div className="mt-5 space-y-3">
              {TOGGLES.map((toggle) => (
                <label key={toggle.key} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-slate-200">
                  <div>
                    <p className="text-sm font-semibold text-navy-800">{toggle.label}</p>
                    <p className="text-xs text-ink">{toggle.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrefs((p) => ({ ...p, [toggle.key]: !p[toggle.key] }))}
                    className={cn('relative h-6 w-11 shrink-0 rounded-full transition', prefs[toggle.key] ? 'bg-mint-400' : 'bg-slate-200')}
                    aria-label={toggle.label}
                  >
                    <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', prefs[toggle.key] ? 'left-[22px]' : 'left-0.5')} />
                  </button>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-[18px] border border-red-100 bg-white p-6 shadow-card">
            <h3 className="font-bold text-danger">Data &amp; account</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-500">
                <Download size={15} /> Export all data
              </button>
              <button type="button" className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-red-100">
                Delete account
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-sm">
            <ShieldCheck size={16} className="shrink-0 text-amber-600" />
            <p className="font-semibold text-amber-900">Your account is not connected to a landlord profile yet.</p>
          </div>
          <p className="mt-3 text-xs text-ink">Once your landlord account is set up, you can update your name, phone, profile photo and other details from this page.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saved || updateProfile?.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgb(30_115_232/0.35)] transition hover:-translate-y-0.5 hover:bg-brand-600 disabled:opacity-70"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? 'Saving…' : updateProfile?.isPending ? 'Saving…' : 'Save changes'}
        </button>
        {notice && (
          <p className="rounded-lg bg-mint-50 px-3 py-2 text-sm font-medium text-mint-600">{notice}</p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{error}</p>
        )}
      </div>

      <input
        ref={photoInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onPhotoChosen}
      />
    </form>
  )
}
