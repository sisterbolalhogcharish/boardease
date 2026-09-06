import { Check, Download, Languages, Save } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { cn } from '../../lib/utils'

const TOGGLES = [
  { key: 'rentDue', label: 'Rent due reminders', desc: 'Notify 3 days before rent is due.' },
  { key: 'late', label: 'Late payments', desc: 'Alert immediately when a payment is overdue.' },
  { key: 'contract', label: 'Contract expiry', desc: 'Warn 30 days before a contract ends.' },
  { key: 'vacant', label: 'Vacant rooms', desc: 'Tell me when a room becomes available.' },
  { key: 'review', label: 'New reviews', desc: 'Notify when a boarder leaves a review.' },
  { key: 'subscription', label: 'Subscription', desc: 'Reminders before my plan renews.' },
]

export default function Settings() {
  const [saved, setSaved] = useState(false)
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    rentDue: true,
    late: true,
    contract: true,
    vacant: false,
    review: true,
    subscription: true,
  })
  const [lang, setLang] = useState('en')

  const save = (e: FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-5">
      {/* Profile */}
      <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
        <h3 className="font-bold text-navy-800">Landlord profile</h3>
        <div className="mt-5 flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-mint-400 text-xl font-bold text-white">
            RC
          </span>
          <div>
            <p className="font-bold text-navy-800">Rosario C. Cabasan</p>
            <p className="text-xs text-mut">Landlord · Sunset Boarding House</p>
            <button type="button" className="mt-1 text-xs font-bold text-brand-500 hover:underline">
              Change photo
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(
            [
              ['Full name', 'Rosario C. Cabasan'],
              ['Email', 'rosario@sunsetboarding.ph'],
              ['Phone', '0917 555 0100'],
              ['Property', 'Sunset Boarding House, San Juan, Siquijor'],
            ] as const
          ).map(([label, value]) => (
            <label key={label} className="space-y-1.5">
              <span className="text-xs font-semibold text-ink">{label}</span>
              <input
                defaultValue={value}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
        <h3 className="font-bold text-navy-800">Notification preferences</h3>
        <p className="mt-0.5 text-xs text-mut">Choose which alerts you want to receive by email & in-app.</p>
        <div className="mt-5 space-y-3">
          {TOGGLES.map((t) => (
            <label key={t.key} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-slate-200">
              <div>
                <p className="text-sm font-semibold text-navy-800">{t.label}</p>
                <p className="text-xs text-ink">{t.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, [t.key]: !p[t.key] }))}
                className={cn('relative h-6 w-11 shrink-0 rounded-full transition', prefs[t.key] ? 'bg-mint-400' : 'bg-slate-200')}
                aria-label={t.label}
              >
                <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', prefs[t.key] ? 'left-[22px]' : 'left-0.5')} />
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="rounded-[18px] border border-slate-100 bg-white p-6 shadow-card">
        <h3 className="flex items-center gap-2 font-bold text-navy-800">
          <Languages size={17} className="text-brand-500" /> Language
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(
            [
              ['en', 'English'],
              ['ceb', 'Cebuano (Bisaya)'],
            ] as const
          ).map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
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

      {/* Danger zone */}
      <div className="rounded-[18px] border border-red-100 bg-white p-6 shadow-card">
        <h3 className="font-bold text-danger">Data & account</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-brand-300 hover:text-brand-500">
            <Download size={15} /> Export all data
          </button>
          <button type="button" className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-red-100">
            Delete account
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={saved}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgb(30_115_232/0.35)] transition hover:-translate-y-0.5 hover:bg-brand-600 disabled:opacity-70"
      >
        {saved ? <Check size={16} /> : <Save size={16} />}
        {saved ? 'Saved!' : 'Save changes'}
      </button>
      {saved && <span className="ml-3 text-sm font-semibold text-mint-600">Settings updated successfully.</span>}
    </form>
  )
}
