import { motion } from 'framer-motion'
import { Eye, Plus, Search, Trash2, UserRound, Users } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { EmptyState, Modal, Skeleton, Spinner } from '../../components/ui'
import { useAddBoarder, useBoarders, useRemoveBoarder, useRooms } from '../../lib/hooks'
import { cn, peso, prettyDate } from '../../lib/utils'
import type { Boarder } from '../../server/types'

const STATUS_STYLE: Record<Boarder['status'], { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-mint-50 text-mint-600' },
  expiring: { label: 'Contract expiring', cls: 'bg-amber-50 text-amber-soft' },
  notice: { label: 'On notice', cls: 'bg-brand-50 text-brand-500' },
}

export default function Boarders() {
  const [q, setQ] = useState('')
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all')
  const { data: boarders, isLoading } = useBoarders({ q: q || undefined, gender: gender === 'all' ? undefined : gender })
  const { data: rooms } = useRooms()
  const addBoarder = useAddBoarder()
  const removeBoarder = useRemoveBoarder()

  const [viewing, setViewing] = useState<Boarder | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Boarder | null>(null)
  const [form, setForm] = useState({
    name: '',
    age: 20,
    gender: 'female' as 'male' | 'female',
    school: 'Siquijor State College',
    course: '',
    phone: '',
    guardian: '',
    address: '',
    moveInDate: new Date().toISOString().slice(0, 10),
    roomId: '',
    monthlyRent: 1500,
    deposit: 1500,
    advance: 1500,
  })

  const roomOf = (roomId: string) => rooms?.find((r) => r.id === roomId)

  const availableRooms = useMemo(
    () => (rooms ?? []).filter((r) => r.occupied < r.capacity),
    [rooms],
  )

  const submit = (e: FormEvent) => {
    e.preventDefault()
    addBoarder.mutate(form)
    setAddOpen(false)
    setForm({ ...form, name: '', course: '', phone: '', guardian: '', address: '' })
  }

  const countByGender = useMemo(() => {
    const all = boarders ?? []
    return { total: all.length, male: all.filter((b) => b.gender === 'male').length, female: all.filter((b) => b.gender === 'female').length }
  }, [boarders])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-navy-800">Boarders</h2>
          <p className="text-sm text-ink">
            {isLoading ? 'Loading…' : `${countByGender.total} boarders · ${countByGender.female} female · ${countByGender.male} male`}
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgb(30_115_232/0.35)] transition hover:-translate-y-0.5 hover:bg-brand-600"
        >
          <Plus size={16} /> Add boarder
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mut" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or school…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {(['all', 'female', 'male'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition',
                gender === g ? 'bg-navy-800 text-white' : 'text-ink hover:text-navy-800',
              )}
            >
              {g === 'all' ? 'All' : g}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-[18px]" />
      ) : boarders && boarders.length > 0 ? (
        <div className="overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-mut">
                  <th className="px-5 py-3.5 font-semibold">Boarder</th>
                  <th className="px-5 py-3.5 font-semibold">Room</th>
                  <th className="px-5 py-3.5 font-semibold">School</th>
                  <th className="px-5 py-3.5 font-semibold">Rent</th>
                  <th className="px-5 py-3.5 font-semibold">Contract ends</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {boarders.map((b, i) => (
                  <motion.tr
                    key={b.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-slate-50 transition hover:bg-surface"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: b.avatarColor }}>
                          {b.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                        </span>
                        <div>
                          <p className="font-bold text-navy-800">{b.name}</p>
                          <p className="text-xs text-mut">
                            {b.age} · {b.gender === 'female' ? 'Female' : 'Male'} · {b.course}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-navy-800">{roomOf(b.roomId)?.roomNo ?? '—'}</td>
                    <td className="px-5 py-3.5 text-ink">{b.school}</td>
                    <td className="px-5 py-3.5 font-semibold text-navy-800">{peso(b.monthlyRent)}</td>
                    <td className="px-5 py-3.5 text-ink">{prettyDate(b.contractEnd)}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', STATUS_STYLE[b.status as keyof typeof STATUS_STYLE]?.cls)}>{STATUS_STYLE[b.status as keyof typeof STATUS_STYLE]?.label}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewing(b)} className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-500" aria-label="View profile">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => setRemoveTarget(b)} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-danger" aria-label="Remove boarder">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={<Users size={22} />} title="No boarders found" subtitle="Try a different search, or add your first boarder." />
      )}

      {/* Profile modal */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Boarder profile" wide>
        {viewing && (
          <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-6">
              <span className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white" style={{ backgroundColor: viewing.avatarColor }}>
                {viewing.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
              </span>
              <p className="text-center font-bold text-navy-800">{viewing.name}</p>
              <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', STATUS_STYLE[viewing.status].cls)}>{STATUS_STYLE[viewing.status].label}</span>
              <div className="mt-2 w-full space-y-1 rounded-xl bg-white p-3 text-center">
                <p className="text-xs text-mut">Monthly rent</p>
                <p className="text-lg font-extrabold text-navy-800">{peso(viewing.monthlyRent)}</p>
                <p className="text-[11px] text-mut">Deposit {peso(viewing.deposit)} · Advance {peso(viewing.advance)}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                {[
                  ['Age', `${viewing.age}`],
                  ['Gender', viewing.gender === 'female' ? 'Female' : 'Male'],
                  ['School', viewing.school],
                  ['Course', viewing.course],
                  ['Phone', viewing.phone],
                  ['Guardian', viewing.guardian],
                  ['Address', viewing.address],
                  ['Move-in date', prettyDate(viewing.moveInDate)],
                  ['Contract ends', prettyDate(viewing.contractEnd)],
                  ['Room', roomOf(viewing.roomId)?.roomNo ?? '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-mut">{k}</p>
                    <p className="mt-0.5 font-semibold text-navy-800">{v}</p>
                  </div>
                ))}
              </div>
              {viewing.notes && (
                <div className="rounded-xl bg-amber-50/70 p-3.5 text-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-soft">Notes</p>
                  <p className="mt-1 text-ink">{viewing.notes}</p>
                </div>
              )}
              <button
                onClick={() => {
                  setRemoveTarget(viewing)
                  setViewing(null)
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-red-100"
              >
                <Trash2 size={14} /> Remove boarder
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add boarder modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a boarder" wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ['name', 'Full name'],
                ['course', 'Course / Profession'],
                ['phone', 'Phone number'],
                ['guardian', 'Guardian name'],
                ['address', 'Home address'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="space-y-1.5">
                <span className="text-xs font-semibold text-ink">{label}</span>
                <input
                  required
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </label>
            ))}
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-ink">School</span>
              <input
                required
                value={form.school}
                onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-ink">Age</span>
              <input
                required
                type="number"
                min={16}
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: Number(e.target.value) }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-ink">Gender</span>
              <select
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as 'male' | 'female' }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-ink">Move-in date</span>
              <input
                required
                type="date"
                value={form.moveInDate}
                onChange={(e) => setForm((f) => ({ ...f, moveInDate: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-ink">Room</span>
              <select
                required
                value={form.roomId}
                onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                <option value="" disabled>
                  Select room…
                </option>
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.roomNo} · {peso(r.monthlyRent)}/mo ({r.capacity - r.occupied} free)
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {(
              [
                ['monthlyRent', 'Monthly rent (₱)'],
                ['deposit', 'Deposit (₱)'],
                ['advance', 'Advance (₱)'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="space-y-1.5">
                <span className="text-xs font-semibold text-ink">{label}</span>
                <input
                  required
                  type="number"
                  min={0}
                  step={100}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={addBoarder.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {addBoarder.isPending && <Spinner className="h-4 w-4" />}
            <UserRound size={15} /> Add boarder
          </button>
        </form>
      </Modal>

      {/* Remove confirm */}
      <Modal open={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove boarder?">
        <p className="text-sm text-ink">
          Remove <span className="font-bold text-navy-800">{removeTarget?.name}</span> from room{' '}
          <span className="font-bold text-navy-800">{removeTarget ? roomOf(removeTarget.roomId)?.roomNo : ''}</span>? Their bed will
          be freed and payment records will be kept for history.
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={() => setRemoveTarget(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-navy-800 transition hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => {
              if (removeTarget) removeBoarder.mutate(removeTarget.id)
              setRemoveTarget(null)
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-danger py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            <Trash2 size={14} /> Remove
          </button>
        </div>
      </Modal>
    </div>
  )
}
