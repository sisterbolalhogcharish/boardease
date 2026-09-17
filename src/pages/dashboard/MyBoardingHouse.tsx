import { motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowUp,
  BedDouble,
  Building2,
  Check,
  Crown,
  ExternalLink,
  Image as ImageIcon,
  Info,
  Lock,
  MapPin,
  Pencil,
  Repeat,
  Plus,
  Save,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HouseImage, Spinner } from '../../components/ui'
import { ImageCropperModal } from '../../components/ImageCropperModal'
import { useLandlordHouse } from '../../lib/landlordHouse'
import {
  useAddLandlordHouseImages,
  useAddRoom,
  useDeleteLandlordHouseImage,
  useDeleteRoom,
  useLocations,
  useReorderLandlordHouseImages,
  useRooms,
  useSaveLandlordHouse,
  useUpdateLandlordHouseImage,
  useUpdateRoom,
} from '../../lib/hooks'
import { usePlanFeatures } from '../../components/dashboard/PlanGate'
import type { LandlordHouseInput } from '../../lib/api'
import type { Room } from '../../server/types'
import { cn, peso } from '../../lib/utils'

/* ------------------------------------------------------------------ */
/*  Photo upload rules — same limits as landlord sign-up               */
/* ------------------------------------------------------------------ */
const IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
const MAX_IMAGE_BYTES = 4 * 1024 * 1024

function isAllowedImage(file: File) {
  const type = file.type.toLowerCase()
  const byMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(type)
  const byExt = /\.(jpe?g|png|webp)$/i.test(file.name)
  return byMime || byExt
}

function validateImageFile(file: File) {
  if (!isAllowedImage(file)) {
    return 'Please upload a JPG, JPEG, PNG, or WebP image.'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name} is larger than 4 MB.`
  }
  return ''
}

/* Siquijor's municipalities — offered as suggestions so a landlord is never
   blocked by the fact that `/locations` only lists places that already have a
   listing. They can still type anything. */
const MUNICIPALITY_SUGGESTIONS = [
  'Enrique Villanueva',
  'Larena',
  'Lazi',
  'Maria',
  'San Juan',
  'Siquijor',
]

const AMENITIES = [
  { key: 'wifi', label: 'WiFi', hint: 'Internet available on site' },
  { key: 'aircon', label: 'Air-conditioned', hint: 'Some or all rooms have aircon' },
  { key: 'kitchen', label: 'Kitchen', hint: 'Boarders can cook' },
  { key: 'laundry', label: 'Laundry', hint: 'Laundry area or service' },
  { key: 'parking', label: 'Parking lot', hint: 'Vehicle parking available' },
  { key: 'petFriendly', label: 'Pet friendly', hint: 'Pets are allowed' },
] as const

type AmenityKey = (typeof AMENITIES)[number]['key']

interface FormState {
  name: string
  tagline: string
  description: string
  municipality: string
  barangay: string
  address: string
  monthlyRent: string
  curfew: string
  visitorPolicy: string
  distanceFromSchool: string
  lat: number | null
  lng: number | null
  rules: string[]
  schoolNearby: string[]
  wifi: boolean
  aircon: boolean
  kitchen: boolean
  laundry: boolean
  parking: boolean
  petFriendly: boolean
}

interface RoomForm {
  roomNo: string
  type: string
  capacity: string
  monthlyRent: string
  gender: string
  aircon: boolean
}

const EMPTY_ROOM: RoomForm = {
  roomNo: '',
  type: 'bedspace',
  capacity: '1',
  monthlyRent: '',
  gender: 'mixed',
  aircon: false,
}

const ROOM_TYPES = ['bedspace', 'single', 'double', 'studio']
const ROOM_GENDERS = ['mixed', 'male', 'female']

const EMPTY_FORM: FormState = {
  name: '',
  tagline: '',
  description: '',
  municipality: '',
  barangay: '',
  address: '',
  monthlyRent: '',
  curfew: '',
  visitorPolicy: '',
  distanceFromSchool: '',
  lat: null,
  lng: null,
  rules: [],
  schoolNearby: [],
  wifi: false,
  aircon: false,
  kitchen: false,
  laundry: false,
  parking: false,
  petFriendly: false,
}

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-navy-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20'

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-navy-700">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-mut">{hint}</span>}
    </label>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-card sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-bold text-navy-800">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

/** Editable list of short strings (rules, nearby schools). */
function ChipList({
  values,
  onChange,
  placeholder,
}: {
  values: string[]
  onChange: (next: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const value = draft.trim()
    if (!value || values.includes(value)) {
      setDraft('')
      return
    }
    onChange([...values, value])
    setDraft('')
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className={inputCls}
        />
        <button
          type="button"
          onClick={add}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-navy-700 transition hover:border-brand-300 hover:text-brand-500"
        >
          <Plus size={15} /> Add
        </button>
      </div>
      {values.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <li
              key={value}
              className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-navy-700"
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== value))}
                className="rounded-full p-0.5 text-slate-400 transition hover:bg-red-50 hover:text-danger"
                aria-label={`Remove ${value}`}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MyBoardingHouse() {
  const { house, landlord, suggested, loading, userId } = useLandlordHouse()
  const { data: locations } = useLocations()

  const { planKey } = usePlanFeatures()
  const saveHouse = useSaveLandlordHouse()
  const addImages = useAddLandlordHouseImages()
  const reorderImages = useReorderLandlordHouseImages()
  const deleteImage = useDeleteLandlordHouseImage()
  const updateImage = useUpdateLandlordHouseImage()

  // Rooms are what make "available" real: beds free = SUM(capacity) - SUM(occupied).
  const { data: rooms } = useRooms()
  const addRoom = useAddRoom()
  const updateRoom = useUpdateRoom()
  const deleteRoom = useDeleteRoom()

  const fileInputRef = useRef<HTMLInputElement>(null)
  /** Photo picked for the crop step; null when no crop is in progress. The
   *  id of the gallery photo being replaced travels alongside, if any. */
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [replaceImageId, setReplaceImageId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [uploading, setUploading] = useState(false)

  // Rooms
  const [roomOpen, setRoomOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [roomForm, setRoomForm] = useState<RoomForm>(EMPTY_ROOM)
  const [roomError, setRoomError] = useState('')

  /** True once the form has been seeded, so a refetch never overwrites edits. */
  const seeded = useRef(false)

  // Seed the form from the saved house, falling back to the location the
  // landlord picked during sign-up so their listing starts where they live.
  useEffect(() => {
    if (seeded.current || loading) return
    if (house) {
      setForm({
        name: house.name,
        tagline: house.tagline,
        description: house.description,
        municipality: house.municipality,
        barangay: house.barangay,
        address: house.address,
        monthlyRent: house.monthlyRent ? String(house.monthlyRent) : '',
        curfew: house.curfew,
        visitorPolicy: house.visitorPolicy,
        distanceFromSchool: house.distanceFromSchool,
        lat: house.lat,
        lng: house.lng,
        rules: house.rules,
        schoolNearby: house.schoolNearby,
        wifi: house.wifi,
        aircon: house.aircon,
        kitchen: house.kitchen,
        laundry: house.laundry,
        parking: house.parking,
        petFriendly: house.petFriendly,
      })
      seeded.current = true
    } else if (suggested) {
      setForm((prev) => ({
        ...prev,
        address: prev.address || suggested.address || '',
        municipality: prev.municipality || suggested.municipality || '',
        lat: prev.lat ?? suggested.lat ?? null,
        lng: prev.lng ?? suggested.lng ?? null,
      }))
    }
  }, [house, suggested, loading])

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const municipalityOptions = useMemo(() => {
    const fromApi = (locations ?? []).map((l) => l.municipality)
    return Array.from(new Set([...fromApi, ...MUNICIPALITY_SUGGESTIONS])).sort()
  }, [locations])

  const barangayOptions = useMemo(() => {
    const match = (locations ?? []).find((l) => l.municipality === form.municipality)
    return match?.barangays ?? []
  }, [locations, form.municipality])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')

    if (!userId) {
      setError('You need to be signed in as a landlord.')
      return
    }
    if (!form.name.trim()) return setError('Please enter your boarding house name.')
    if (!form.municipality.trim()) return setError('Please select or enter your municipality.')
    if (!form.barangay.trim()) return setError('Please select or enter your barangay.')
    if (!form.address.trim()) return setError('Please enter your street address.')

    const payload: LandlordHouseInput = {
      userId,
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      description: form.description.trim(),
      municipality: form.municipality.trim(),
      barangay: form.barangay.trim(),
      address: form.address.trim(),
      monthlyRent: Number(form.monthlyRent.replace(/[^\d]/g, '')) || 0,
      curfew: form.curfew.trim(),
      visitorPolicy: form.visitorPolicy.trim(),
      distanceFromSchool: form.distanceFromSchool.trim(),
      lat: form.lat,
      lng: form.lng,
      rules: form.rules,
      schoolNearby: form.schoolNearby,
      wifi: form.wifi,
      aircon: form.aircon,
      kitchen: form.kitchen,
      laundry: form.laundry,
      parking: form.parking,
      petFriendly: form.petFriendly,
    }

    try {
      await saveHouse.mutateAsync(payload)
      setNotice(house ? 'Boarding house updated. Your public listing is live.' : 'Boarding house created. It is now listed in Explore.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your boarding house.')
    }
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    const bad = files.find((f) => validateImageFile(f))
    if (bad) {
      setError(validateImageFile(bad)!)
      return
    }
    setError('')
    setNotice('')
    // Hand off to the crop step (4:3 — the ratio of the public listing cards,
    // so the picture is shown in full on Explore). Upload happens on Apply.
    // `replaceImageId` is deliberately left alone: handleReplace sets it
    // before opening this picker, and the modal close/apply handlers clear it.
    setCropFile(files[0])
  }

  /** Plain "add" entry point — clears any pending replace so a cancelled
   *  replace can never turn the next upload into an accidental overwrite. */
  const openAddPhoto = () => {
    setReplaceImageId(null)
    fileInputRef.current?.click()
  }

  const handleReplace = (imageId: string) => {
    setError('')
    setNotice('')
    setReplaceImageId(imageId)
    fileInputRef.current?.click()
  }

  const applyCroppedImage = async (dataUrl: string) => {
    if (!userId) return
    setUploading(true)
    try {
      if (replaceImageId) {
        // Renovation flow: overwrite the old photo in place, keeping its
        // position (and the cover, if it was the cover).
        await updateImage.mutateAsync({ userId, imageId: replaceImageId, image: dataUrl })
        setNotice('Photo replaced.')
      } else {
        await addImages.mutateAsync({ userId, images: [dataUrl] })
        setNotice('Photo added.')
      }
      setCropFile(null)
      setReplaceImageId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that photo.')
    } finally {
      setUploading(false)
    }
  }

  const reorder = async (ids: string[]) => {
    if (!userId) return
    setError('')
    try {
      await reorderImages.mutateAsync({ userId, ids })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reorder photos.')
    }
  }

  const moveImage = (index: number, direction: -1 | 1) => {
    if (!house) return
    const ids = house.images.map((i) => i.id)
    const target = index + direction
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    void reorder(ids)
  }

  const makeCover = (id: string) => {
    if (!house) return
    void reorder([id, ...house.images.filter((i) => i.id !== id).map((i) => i.id)])
  }

  const removeImage = async (id: string) => {
    if (!userId) return
    setError('')
    try {
      await deleteImage.mutateAsync({ userId, imageId: id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that photo.')
    }
  }

  /* ---------------------------- Rooms ---------------------------- */

  const openAddRoom = () => {
    setEditingRoom(null)
    setRoomForm(EMPTY_ROOM)
    setRoomError('')
    setRoomOpen(true)
  }

  const openEditRoom = (room: Room) => {
    setEditingRoom(room)
    setRoomForm({
      roomNo: room.roomNo,
      type: room.type,
      capacity: String(room.capacity),
      monthlyRent: String(room.monthlyRent),
      gender: room.gender,
      aircon: room.aircon,
    })
    setRoomError('')
    setRoomOpen(true)
  }

  const submitRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setRoomError('')
    if (!roomForm.roomNo.trim()) {
      setRoomError('Please enter a room number.')
      return
    }
    // `occupied` is deliberately not editable — it follows the boarders actually
    // renting the room, which is what makes "available" trustworthy.
    const payload = {
      roomNo: roomForm.roomNo.trim(),
      type: roomForm.type,
      capacity: Math.max(1, Number(roomForm.capacity) || 1),
      monthlyRent: Number(roomForm.monthlyRent.replace(/[^\d]/g, '')) || 0,
      gender: roomForm.gender,
      aircon: roomForm.aircon,
    }
    try {
      if (editingRoom) await updateRoom.mutateAsync({ id: editingRoom.id, patch: payload })
      else await addRoom.mutateAsync(payload)
      setRoomOpen(false)
      setEditingRoom(null)
      setRoomForm(EMPTY_ROOM)
      setNotice(editingRoom ? 'Room updated.' : 'Room added.')
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : 'Could not save that room.')
    }
  }

  const removeRoom = async (room: Room) => {
    if (!window.confirm(`Remove room ${room.roomNo}? This cannot be undone.`)) return
    setRoomError('')
    try {
      await deleteRoom.mutateAsync(room.id)
      setNotice('Room removed.')
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : 'Could not remove that room.')
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-7 w-7 text-brand-500" />
      </div>
    )
  }

  const busy = saveHouse.isPending || reorderImages.isPending || deleteImage.isPending || uploading
  const roomBusy = addRoom.isPending || updateRoom.isPending || deleteRoom.isPending
  const gallery = house?.images ?? []
  const totalBeds = (rooms ?? []).reduce((sum, r) => sum + r.capacity, 0)
  const takenBeds = (rooms ?? []).reduce((sum, r) => sum + r.occupied, 0)
  const freeBeds = Math.max(0, totalBeds - takenBeds)
  const unpublished = !!house && planKey === 'none'

  return (
    <div className="space-y-6">
      {/* -------- Header -------- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-card"
      >
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-navy-100 via-brand-100 to-mint-100">
            {gallery[0] ? (
              <HouseImage src={gallery[0].url} alt="Listing cover" className="h-full w-full" />
            ) : (
              <Building2 className="h-7 w-7 text-navy-300" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-navy-800">
                {house ? house.name : 'Set up your boarding house'}
              </h1>
              {house && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                    house.verified
                      ? 'border-mint-100 bg-mint-50 text-mint-600'
                      : 'border-amber-100 bg-amber-50 text-amber-soft',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', house.verified ? 'bg-mint-400' : 'bg-amber-soft')} />
                  {house.verified ? 'Verified' : 'Pending verification'}
                </span>
              )}
              {unpublished && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  <Lock size={11} /> Not published
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink">
              {house
                ? `${house.barangay}, ${house.municipality} · ${gallery.length} photo${gallery.length === 1 ? '' : 's'}${totalBeds > 0 ? ` · ${freeBeds} of ${totalBeds} beds free` : ''}`
                : 'Fill in the details below. They are exactly what boarders see when they browse BoardEase.'}
            </p>
            {house && house.rating > 0 && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-mut">
                <Star size={13} className="text-amber-400" fill="currentColor" />
                {house.rating.toFixed(1)} from {house.reviewsCount} review{house.reviewsCount === 1 ? '' : 's'}
              </p>
            )}
          </div>
          {house && (
            <Link
              to={`/houses/${house.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-navy-700 transition hover:border-brand-300 hover:text-brand-500"
            >
              View public page <ExternalLink size={13} />
            </Link>
          )}
        </div>
      </motion.div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {notice && (
        <p className="flex items-center gap-2 rounded-xl border border-mint-100 bg-mint-50 px-4 py-3 text-sm font-medium text-mint-600">
          <Check size={15} /> {notice}
        </p>
      )}

      {/* Publishing is what the subscription buys: a free account gets a fully
          editable listing that boarders cannot find. */}
      {unpublished && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Lock size={16} className="mt-0.5 shrink-0 text-amber-soft" />
            <div>
              <p className="text-sm font-semibold text-navy-800">Your boarding house isn't visible to boarders yet</p>
              <p className="mt-0.5 text-xs text-ink">
                It won't appear in Explore and you can't add boarders until you have an active plan. Keep setting it up —
                everything you save here stays.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/subscription"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgb(30_115_232/0.3)] transition hover:-translate-y-0.5 hover:bg-brand-600"
          >
            Publish it <Crown size={14} />
          </Link>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* -------- Basics -------- */}
        <Card title="Listing details" subtitle="The name and description boarders see first.">
          <div className="space-y-4">
            <Field label="Boarding house name" required>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Cabasan Students' Home"
                className={inputCls}
              />
            </Field>
            <Field label="Tagline" hint="One short line shown under the name on your card.">
              <input
                value={form.tagline}
                onChange={(e) => set('tagline', e.target.value)}
                placeholder="e.g. Quiet study-friendly rooms near the campus"
                className={inputCls}
              />
            </Field>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={5}
                placeholder="Describe your rooms, common areas, rules and what makes the place comfortable."
                className={cn(inputCls, 'resize-y')}
              />
            </Field>
          </div>
        </Card>

        {/* -------- Location -------- */}
        <Card
          title="Location"
          subtitle="Where boarders find you. This is what we show on the Explore page and the house map."
        >
          <div className="space-y-4">
            {suggested && (suggested.address || suggested.lat != null) && (
              <div className="flex flex-col gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <Info size={16} className="mt-0.5 shrink-0 text-brand-500" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-navy-800">Location from your sign-up</p>
                    <p className="mt-0.5 text-xs text-ink">
                      {suggested.address || 'Coordinates only'}
                      {suggested.lat != null && suggested.lng != null && (
                        <span className="block text-mut">
                          {suggested.lat.toFixed(5)}, {suggested.lng.toFixed(5)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {(suggested.address || suggested.lat != null) && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        address: suggested.address || prev.address,
                        lat: suggested.lat ?? prev.lat,
                        lng: suggested.lng ?? prev.lng,
                      }))
                    }
                    className="shrink-0 rounded-xl border border-brand-200 bg-white px-3.5 py-2 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
                  >
                    Use this location
                  </button>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Municipality" required>
                <input
                  list="municipality-options"
                  value={form.municipality}
                  onChange={(e) => set('municipality', e.target.value)}
                  placeholder="e.g. San Juan"
                  className={inputCls}
                />
                <datalist id="municipality-options">
                  {municipalityOptions.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </Field>
              <Field label="Barangay" required>
                <input
                  list="barangay-options"
                  value={form.barangay}
                  onChange={(e) => set('barangay', e.target.value)}
                  placeholder="e.g. Maite"
                  className={inputCls}
                />
                <datalist id="barangay-options">
                  {barangayOptions.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </Field>
            </div>

            <Field label="Street address" required hint="Shown on your listing card and house page.">
              <input
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="e.g. Maite National Road, San Juan, Siquijor"
                className={inputCls}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude" hint="Used to pin your house on the map.">
                <input
                  value={form.lat ?? ''}
                  onChange={(e) => set('lat', e.target.value === '' ? null : Number(e.target.value))}
                  inputMode="decimal"
                  placeholder="9.1644000"
                  className={inputCls}
                />
              </Field>
              <Field label="Longitude">
                <input
                  value={form.lng ?? ''}
                  onChange={(e) => set('lng', e.target.value === '' ? null : Number(e.target.value))}
                  inputMode="decimal"
                  placeholder="123.4962000"
                  className={inputCls}
                />
              </Field>
            </div>

            {form.lat != null && form.lng != null && Number.isFinite(form.lat) && Number.isFinite(form.lng) && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${form.lat}&mlon=${form.lng}#map=17/${form.lat}/${form.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-500 hover:text-brand-600"
              >
                <MapPin size={13} /> Preview this pin on the map
              </a>
            )}
          </div>
        </Card>

        {/* -------- Amenities -------- */}
        <Card
          title="Amenities"
          subtitle="These become the filter chips boarders tick in Explore — parking, WiFi, aircon and more."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {AMENITIES.map(({ key, label, hint }) => {
              const active = form[key as AmenityKey]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => set(key as AmenityKey, !active)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                    active
                      ? 'border-mint-300 bg-mint-50/70'
                      : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-surface',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
                      active ? 'border-mint-400 bg-mint-400 text-white' : 'border-slate-300 bg-white',
                    )}
                  >
                    {active && <Check size={13} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-navy-800">{label}</span>
                    <span className="block text-xs text-mut">{hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </Card>

        {/* -------- Rent & policies -------- */}
        <Card title="Rent & house rules" subtitle="Boarders see these before they reserve a room.">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starting monthly rent (₱)" hint="Per boarder, per month.">
                <input
                  value={form.monthlyRent}
                  onChange={(e) => set('monthlyRent', e.target.value)}
                  inputMode="numeric"
                  placeholder="2500"
                  className={inputCls}
                />
              </Field>
              <Field label="Curfew" hint="e.g. 10:00 PM, or None">
                <input
                  value={form.curfew}
                  onChange={(e) => set('curfew', e.target.value)}
                  placeholder="10:00 PM"
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Visitor policy">
              <textarea
                value={form.visitorPolicy}
                onChange={(e) => set('visitorPolicy', e.target.value)}
                rows={3}
                placeholder="e.g. Visitors must register at the front desk. Overnight visitors are not allowed."
                className={cn(inputCls, 'resize-y')}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Distance from school" hint="e.g. 12 min tricycle">
                <input
                  value={form.distanceFromSchool}
                  onChange={(e) => set('distanceFromSchool', e.target.value)}
                  placeholder="10 min walk"
                  className={inputCls}
                />
              </Field>
              <Field label="Nearby schools" hint="Helps students find you by campus.">
                <ChipList
                  values={form.schoolNearby}
                  onChange={(next) => set('schoolNearby', next)}
                  placeholder="Siquijor State College"
                />
              </Field>
            </div>
            <Field label="House rules">
              <ChipList
                values={form.rules}
                onChange={(next) => set('rules', next)}
                placeholder="e.g. Quiet hours from 10:00 PM"
              />
            </Field>
          </div>
        </Card>

        {/* -------- Photos -------- */}
        <Card
          title="Photos"
          subtitle="The first photo is your listing cover. JPG, PNG, or WebP, up to 4 MB each."
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            onChange={handleUpload}
          />

          {/* 4:3 crop step — the same ratio as the public Explore cards, so a
              photo that fills the frame is shown complete on the listing. */}
          <ImageCropperModal
            file={cropFile}
            open={cropFile !== null}
            busy={uploading}
            aspect={4 / 3}
            outputWidth={960}
            quality={0.82}
            title={replaceImageId ? 'Replace photo' : 'Crop your photo'}
            hint={replaceImageId ? 'Position the new photo — it will take this photo\u2019s place.' : undefined}
            onClose={() => {
              setCropFile(null)
              setReplaceImageId(null)
            }}
            onApply={applyCroppedImage}
          />

          {gallery.length === 0 ? (
            <button
              type="button"
              onClick={openAddPhoto}
              disabled={uploading}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-surface px-4 py-10 text-center transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-60"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-navy-500 shadow-sm">
                {uploading ? <Spinner className="h-5 w-5 text-brand-500" /> : <Upload size={20} />}
              </span>
              <span className="text-sm font-semibold text-navy-800">
                {uploading ? 'Uploading…' : 'Upload your first photo'}
              </span>
              <span className="text-xs text-mut">Listings with photos get far more enquiries.</span>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {gallery.map((image, index) => (
                  <motion.div
                    key={image.id}
                    layout
                    className="group relative overflow-hidden rounded-xl border border-slate-100 bg-surface"
                  >
                    <HouseImage src={image.url} alt={`Photo ${index + 1}`} className="h-40 w-full" />
                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-navy-900/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
                        Cover
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-navy-950/80 to-transparent p-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveImage(index, -1)}
                          disabled={index === 0 || busy}
                          className="rounded-lg bg-white/90 p-1.5 text-navy-700 transition hover:bg-white disabled:opacity-40"
                          aria-label="Move photo earlier"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(index, 1)}
                          disabled={index === gallery.length - 1 || busy}
                          className="rounded-lg bg-white/90 p-1.5 text-navy-700 transition hover:bg-white disabled:opacity-40"
                          aria-label="Move photo later"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                      <div className="flex gap-1">
                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => makeCover(image.id)}
                            disabled={busy}
                            className="rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold text-navy-700 transition hover:bg-white disabled:opacity-40"
                          >
                            Make cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleReplace(image.id)}
                          disabled={busy}
                          className="flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold text-navy-700 transition hover:bg-white disabled:opacity-40"
                          aria-label={`Replace photo ${index + 1}`}
                        >
                          <Repeat size={12} /> Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(image.id)}
                          disabled={busy}
                          className="rounded-lg bg-white/90 p-1.5 text-danger transition hover:bg-white disabled:opacity-40"
                          aria-label="Remove photo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                <button
                  type="button"
                  onClick={openAddPhoto}
                  disabled={uploading}
                  className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-surface text-center transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-60"
                >
                  {uploading ? (
                    <Spinner className="h-5 w-5 text-brand-500" />
                  ) : (
                    <>
                      <ImageIcon size={20} className="text-navy-400" />
                      <span className="text-xs font-semibold text-navy-700">Add photos</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* -------- Sticky-ish save bar -------- */}
        <div className="flex flex-col gap-3 rounded-[18px] border border-slate-100 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-sm text-ink">
            {house
              ? 'Changes go live on the Explore page as soon as you save.'
              : 'Saving creates your listing — it will appear in Explore right away.'}
          </p>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgb(30_115_232/0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {saveHouse.isPending ? (
              <>
                <Spinner className="h-4 w-4" /> Saving…
              </>
            ) : (
              <>
                <Save size={16} /> {house ? 'Save changes' : 'Create my boarding house'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* -------- Rooms — kept outside the listing <form> so the two don't submit together -------- */}
      <Card
        title="Rooms & availability"
        subtitle="Available beds are calculated from your rooms, so they always match reality — there's nothing to type in by hand."
      >
        {!house ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-surface px-4 py-8 text-center text-sm text-ink">
            Save your boarding house first (above), then you can add its rooms here.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Total beds', value: totalBeds, cls: 'text-navy-800' },
                { label: 'Occupied', value: takenBeds, cls: 'text-brand-600' },
                { label: 'Available now', value: freeBeds, cls: 'text-mint-600' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-slate-100 bg-surface px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-mut">{stat.label}</p>
                  <p className={cn('mt-0.5 text-xl font-bold', stat.cls)}>{stat.value}</p>
                </div>
              ))}
            </div>

            {roomError && (
              <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-medium text-danger">
                {roomError}
              </p>
            )}

            {(rooms ?? []).length > 0 ? (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
                {(rooms ?? []).map((room) => {
                  const free = Math.max(0, room.capacity - room.occupied)
                  return (
                    <li key={room.id} className="flex items-center gap-3 bg-white px-4 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-navy-500">
                        <BedDouble size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-navy-800">
                          Room {room.roomNo} <span className="font-normal capitalize text-mut">· {room.type}</span>
                        </p>
                        <p className="truncate text-xs text-mut">
                          {room.occupied}/{room.capacity} occupied · {peso(room.monthlyRent)}/month · {room.gender}
                          {room.aircon ? ' · aircon' : ''}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',
                          free === 0 ? 'bg-red-50 text-danger' : 'bg-mint-50 text-mint-600',
                        )}
                      >
                        {free === 0 ? 'Full' : `${free} free`}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditRoom(room)}
                        className="rounded-lg p-2 text-navy-400 transition hover:bg-navy-50 hover:text-navy-800"
                        aria-label={`Edit room ${room.roomNo}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRoom(room)}
                        disabled={roomBusy}
                        className="rounded-lg p-2 text-navy-400 transition hover:bg-red-50 hover:text-danger disabled:opacity-40"
                        aria-label={`Remove room ${room.roomNo}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-surface px-4 py-6 text-center text-sm text-ink">
                No rooms yet. Until you add some, boarders will see this house as having no rooms available.
              </p>
            )}

            {roomOpen ? (
              <form onSubmit={submitRoom} className="space-y-4 rounded-xl border border-slate-100 bg-surface p-4">
                <p className="text-sm font-bold text-navy-800">{editingRoom ? `Edit room ${editingRoom.roomNo}` : 'Add a room'}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Room number" required>
                    <input
                      value={roomForm.roomNo}
                      onChange={(e) => setRoomForm((p) => ({ ...p, roomNo: e.target.value }))}
                      placeholder="e.g. 101"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Room type">
                    <select
                      value={roomForm.type}
                      onChange={(e) => setRoomForm((p) => ({ ...p, type: e.target.value }))}
                      className={inputCls}
                    >
                      {ROOM_TYPES.map((t) => (
                        <option key={t} value={t} className="capitalize">
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Capacity (beds)" hint="How many boarders fit in this room.">
                    <input
                      value={roomForm.capacity}
                      onChange={(e) => setRoomForm((p) => ({ ...p, capacity: e.target.value }))}
                      inputMode="numeric"
                      placeholder="1"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Monthly rent (₱)" hint="Per boarder.">
                    <input
                      value={roomForm.monthlyRent}
                      onChange={(e) => setRoomForm((p) => ({ ...p, monthlyRent: e.target.value }))}
                      inputMode="numeric"
                      placeholder="2500"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Gender policy">
                    <select
                      value={roomForm.gender}
                      onChange={(e) => setRoomForm((p) => ({ ...p, gender: e.target.value }))}
                      className={inputCls}
                    >
                      {ROOM_GENDERS.map((g) => (
                        <option key={g} value={g} className="capitalize">
                          {g}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <button
                    type="button"
                    onClick={() => setRoomForm((p) => ({ ...p, aircon: !p.aircon }))}
                    aria-pressed={roomForm.aircon}
                    className={cn(
                      'mt-6 flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition',
                      roomForm.aircon ? 'border-mint-300 bg-mint-50/70' : 'border-slate-200 bg-white hover:border-brand-200',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
                        roomForm.aircon ? 'border-mint-400 bg-mint-400 text-white' : 'border-slate-300 bg-white',
                      )}
                    >
                      {roomForm.aircon && <Check size={13} />}
                    </span>
                    <span className="text-sm font-semibold text-navy-800">Air-conditioned</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={roomBusy}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-60"
                  >
                    {roomBusy && <Spinner className="h-4 w-4" />}
                    {editingRoom ? 'Save room' : 'Add room'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRoomOpen(false)
                      setEditingRoom(null)
                      setRoomError('')
                    }}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={openAddRoom}
                className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-100"
              >
                <Plus size={15} /> Add a room
              </button>
            )}
          </div>
        )}
      </Card>

      {landlord?.locationPref && (
        <p className="pb-2 text-center text-xs text-mut">
          Signed-up as {landlord.businessName || 'your account'} · location on file: {landlord.locationPref}
        </p>
      )}
    </div>
  )
}
