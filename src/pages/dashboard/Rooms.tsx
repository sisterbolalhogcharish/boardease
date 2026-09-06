import { motion } from 'framer-motion'
import { BedDouble, DoorOpen, Pencil, Plus, Snowflake, Trash2, Users, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { EmptyState, Modal, Skeleton, Spinner } from '../../components/ui'
import { useAddRoom, useBoarders, useDeleteRoom, useRooms, useUpdateRoom } from '../../lib/hooks'
import { cn, peso } from '../../lib/utils'
import type { Gender, Room, RoomType } from '../../server/types'

const TYPE_LABEL: Record<RoomType, string> = { bedspace: 'Bedspace', single: 'Single', double: 'Double', studio: 'Studio' }
const ROOM_TYPES: RoomType[] = ['bedspace', 'single', 'double', 'studio']

interface RoomForm {
  roomNo: string
  type: RoomType
  capacity: number
  monthlyRent: number
  gender: Gender
  aircon: boolean
}

const emptyForm: RoomForm = { roomNo: '', type: 'bedspace', capacity: 1, monthlyRent: 1500, gender: 'mixed', aircon: false }

export default function Rooms() {
  const { data: rooms, isLoading } = useRooms()
  const { data: boarders } = useBoarders()
  const addRoom = useAddRoom()
  const updateRoom = useUpdateRoom()
  const deleteRoom = useDeleteRoom()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Room | null>(null)
  const [form, setForm] = useState<RoomForm>(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState<Room | null>(null)
  const [viewing, setViewing] = useState<Room | null>(null)

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }
  const openEdit = (room: Room) => {
    setEditing(room)
    setForm({ roomNo: room.roomNo, type: room.type, capacity: room.capacity, monthlyRent: room.monthlyRent, gender: room.gender, aircon: room.aircon })
    setFormOpen(true)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (editing) updateRoom.mutate({ id: editing.id, patch: form })
    else addRoom.mutate(form)
    setFormOpen(false)
  }

  const occupants = (roomId: string) => boarders?.filter((b) => b.roomId === roomId) ?? []

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-navy-800">Rooms & occupancy</h2>
          <p className="text-sm text-ink">Manage capacity, rent, and boarders per room.</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgb(30_115_232/0.35)] transition hover:-translate-y-0.5 hover:bg-brand-600"
        >
          <Plus size={16} /> Add room
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-[18px]" />
          ))}
        </div>
      ) : rooms && rooms.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room, i) => {
            const pct = Math.round((room.occupied / room.capacity) * 100)
            const tenants = occupants(room.id)
            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                className="group relative overflow-hidden rounded-[18px] border border-slate-100 bg-white p-5 shadow-card transition hover:shadow-card-hover"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-extrabold',
                        pct >= 100 ? 'bg-red-50 text-danger' : pct >= 60 ? 'bg-amber-50 text-amber-soft' : 'bg-mint-50 text-mint-600',
                      )}
                    >
                      {room.roomNo}
                    </span>
                    <div>
                      <p className="font-bold capitalize text-navy-800">{TYPE_LABEL[room.type]}</p>
                      <p className="flex items-center gap-1 text-xs text-mut">
                        {room.aircon && (
                          <span className="inline-flex items-center gap-0.5 text-brand-500">
                            <Snowflake size={11} /> Aircon
                          </span>
                        )}
                        <span className="capitalize">{room.gender === 'mixed' ? 'Mixed' : room.gender === 'female' ? 'Female only' : 'Male only'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => openEdit(room)} className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-500" aria-label="Edit room">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setConfirmDelete(room)} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-danger" aria-label="Delete room">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <p className="text-xl font-extrabold text-navy-800">
                    {peso(room.monthlyRent)}
                    <span className="text-xs font-medium text-mut"> /mo</span>
                  </p>
                  <p className="text-xs font-semibold text-mut">
                    {room.occupied}/{room.capacity} occupied
                  </p>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={cn('h-full rounded-full', pct >= 100 ? 'bg-danger' : pct >= 60 ? 'bg-amber-soft' : 'bg-gradient-to-r from-brand-500 to-mint-400')}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex -space-x-2">
                    {tenants.slice(0, 4).map((t) => (
                      <span
                        key={t.id}
                        title={t.name}
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white"
                        style={{ backgroundColor: t.avatarColor }}
                      >
                        {t.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                      </span>
                    ))}
                    {room.occupied - tenants.slice(0, 4).length > 0 && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[9px] font-bold text-slate-500">
                        +{room.occupied - tenants.slice(0, 4).length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setViewing(room)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-500 transition hover:text-brand-600"
                  >
                    <Users size={13} /> View occupants
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={<DoorOpen size={22} />} title="No rooms yet" subtitle="Add your first room to start tracking occupancy." />
      )}

      {/* Add / Edit modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? `Edit room ${editing.roomNo}` : 'Add a new room'}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-ink">Room number</span>
              <input
                required
                value={form.roomNo}
                onChange={(e) => setForm((f) => ({ ...f, roomNo: e.target.value }))}
                placeholder="e.g. 304"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-ink">Room type</span>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as RoomType }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-ink">Capacity</span>
              <input
                required
                type="number"
                min={1}
                max={12}
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: Math.max(1, Number(e.target.value)) }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-ink">Monthly rent (₱)</span>
              <input
                required
                type="number"
                min={500}
                step={100}
                value={form.monthlyRent}
                onChange={(e) => setForm((f) => ({ ...f, monthlyRent: Number(e.target.value) }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-ink">Gender policy</span>
              <select
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as Gender }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                <option value="mixed">Mixed</option>
                <option value="female">Female only</option>
                <option value="male">Male only</option>
              </select>
            </label>
            <label className="flex cursor-pointer items-end gap-2 pb-2.5">
              <input
                type="checkbox"
                checked={form.aircon}
                onChange={(e) => setForm((f) => ({ ...f, aircon: e.target.checked }))}
                className="h-4 w-4 accent-brand-500"
              />
              <span className="text-sm font-semibold text-ink">With aircon</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={addRoom.isPending || updateRoom.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {(addRoom.isPending || updateRoom.isPending) && <Spinner className="h-4 w-4" />}
            {editing ? 'Save changes' : 'Add room'}
          </button>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete room?">
        <p className="text-sm text-ink">
          Are you sure you want to delete room <span className="font-bold text-navy-800">{confirmDelete?.roomNo}</span>? This
          will free {confirmDelete?.capacity} beds. Occupants must be reassigned first.
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-navy-800 transition hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => {
              if (confirmDelete) deleteRoom.mutate(confirmDelete.id)
              setConfirmDelete(null)
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-danger py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </Modal>

      {/* Occupants modal */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Room ${viewing?.roomNo ?? ''} — occupants`}>
        {viewing && (
          <div className="space-y-3">
            {occupants(viewing.id).length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <BedDouble className="mx-auto text-slate-300" size={28} />
                <p className="mt-2 text-sm font-semibold text-navy-800">This room is vacant</p>
                <p className="text-xs text-ink">{viewing.capacity} bed{viewing.capacity > 1 ? 's' : ''} available · {peso(viewing.monthlyRent)}/mo</p>
              </div>
            )}
            {occupants(viewing.id).map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: b.avatarColor }}>
                  {b.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-navy-800">{b.name}</p>
                  <p className="text-xs text-ink">{b.school} · {b.course}</p>
                </div>
                <span className="text-xs font-semibold text-mut">Since {b.moveInDate}</span>
              </div>
            ))}
            <button onClick={() => setViewing(null)} className="mt-2 w-full rounded-xl bg-navy-800 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-700">
              <span className="inline-flex items-center gap-1.5"><X size={14} /> Close</span>
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
