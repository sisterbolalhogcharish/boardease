import { Camera, Check, Download, Languages, Mail, Phone, Save, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useLanguage, type LangCode } from '../../lib/i18n'
import { useAuth } from '../../lib/auth'
import { Avatar } from '../../components/ui'
import { useUpdateLandlordProfile, useUpdateProfile } from '../../lib/hooks'
import { cn, fileToSquareDataUrl } from '../../lib/utils'

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
  const updateLandlordProfile = useUpdateLandlordProfile(user?.id?.toString())
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
    property: user?.property ?? '',
  })

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      property: user?.property ?? '',
    }))
  }, [user?.name, user?.phone, user?.property])

  const pickPhoto = () => photoInput.current?.click()

  const runProfileMutation = async (patch: Parameters<typeof updateLandlordProfile['mutateAsync']>[0]) => {
    if (updateLandlordProfile) {
      await updateLandlordProfile.mutateAsync(patch)
      return
    }
    if (updateProfile) {
      await updateProfile.mutateAsync(patch)
    }
  }

  const onPhotoChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    setNotice('')
    setError('')
    setPhotoBusy(true)
    try {
      const dataUrl = await fileToSquareDataUrl(file)
      await runProfileMutation({ userId: user.id.toString(), avatarUrl: dataUrl })
      updateUser({ avatarUrl: dataUrl })
      setNotice('Profile photo updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your profile photo.')
    } finally {
      setPhotoBusy(false)
    }
  }

  const removePhoto = async () => {
    if (!user) return
    setNotice('')
    setError('')
    setPhotoBusy(true)
    try {
      await runProfileMutation({ userId: user.id.toString(), avatarUrl: '' })
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
    if (!user) return
    if (!form.name.trim()) {
      setError('Full name is required.')
      return
    }
    setError('')
    try {
      await runProfileMutation({
        userId: user.id.toString(),
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        property: form.property.trim() || undefined,
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
    opts?: { type?: string; placeholder?: string; optional?: boolean; help?: string },
  ) => (
    <div className="grid gap-1.5">
      <label htmlFor={`settings-${key}`} className="text-xs font-semibold uppercase tracking-wider text-mut">
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
      {opts?.help && <p className="text-[11px] text-mut">{opts.help}</p>}
    </div>
  )

  return (
    <form onSubmit={save} className="max-w-3xl space-y-5">
      {user ? (
        <>
          <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-navy-800">Landlord profile</h3>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-600">
                Account owner
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-ink">
              This is your landlord account: the name, contact number and profile photo show up whenever you appear in BoardEase — on your boarding house page, in messages and in boarder communications.
            </p>

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
                <p className="text-base font-bold text-navy-800">{user?.name ?? 'Landlord account'}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink">
                  <Mail size={13} className="text-mut" /> {user?.email}
                </p>
                {user?.phone && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                    <Phone size={13} className="text-mut" /> {user.phone}
                  </p>
                )}
              </div>
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
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-60"
              >
                <Camera size={14} /> {user?.avatarUrl ? 'Change photo' : 'Add photo'}
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
            {user?.avatarUrl && <p className="mt-2 text-[11px] text-mut">A profile photo is attached to this account.</p>}
            {!user?.avatarUrl && (
              <p className="mt-2 text-[11px] text-mut">No profile photo yet. Add one and your avatar updates everywhere.</p>
            )}

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {field('name', 'Full name', { help: 'This is the name boarders see on your boarding house page and messages.' })}
              {field('phone', 'Contact number', { placeholder: '0917 000 0000', optional: true, help: 'Used when boarders contact you about a room or reservation.' })}
              <div>
                <label htmlFor="settings-email" className="text-xs font-semibold uppercase tracking-wider text-mut">
                  Email
                </label>
                <input
                  id="settings-email"
                  value={user?.email ?? ''}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-surface px-3 py-2.5 text-sm text-mut outline-none"
                />
                <p className="mt-1 text-[11px] text-mut">Your login email. To change it, contact support.</p>
              </div>
              {field('property', 'Property / boarding house name', { placeholder: 'Sunset Boarding House', optional: true, help: 'Your main boarding house name. Update it in house details to change your listing.' })}
            </div>
          </div>

          <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
            <h3 className="flex items-center gap-2 font-bold text-navy-800">
              <Languages size={17} className="text-brand-500" /> {t('settings.language') ?? 'Language'}
            </h3>
            <p className="mt-0.5 text-xs text-mut">{t('settings.languageHint') ?? 'Choose your preferred interface language.'}</p>
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
          disabled={saved || updateLandlordProfile?.isPending || updateProfile?.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgb(30_115_232/0.35)] transition hover:-translate-y-0.5 hover:bg-brand-600 disabled:opacity-70"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? 'Saving…' : (updateLandlordProfile?.isPending ?? updateProfile?.isPending ?? false) ? 'Saving…' : 'Save changes'}
        </button>
        {notice && (
          <p className="rounded-lg bg-mint-50 px-3 py-2 text-sm font-medium text-mint-600">{notice}</p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-danger">{error}</p>
        )}
      </div>

    </form>
  )
}
