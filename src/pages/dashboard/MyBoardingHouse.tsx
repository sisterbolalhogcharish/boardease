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
  Plus,
  Repeat,
  Star,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HouseImage, Modal, Spinner } from '../../components/ui'
import { ImageCropperModal } from '../../components/ImageCropperModal'
import { useLandlordHouse } from '../../lib/landlordHouse'
import { getLandlordHouse, updateLandlordHouseVideo, type LandlordHouseInput } from '../../lib/api'
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
  useAddLandlordHouseVideos,
  useDeleteLandlordHouseVideo,
  useUpdateRoom,
} from '../../lib/hooks'
import { usePlanFeatures } from '../../components/dashboard/PlanGate'
import type { Room } from '../../server/types'
import { cn, peso } from '../../lib/utils'

/* ------------------------------------------------------------------ */
/*  Photo upload rules — same limits as landlord sign-up               */
/* ------------------------------------------------------------------ */
const IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogv,.mov'
const MAX_VIDEO_BYTES = 48 * 1024 * 1024

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

function isAllowedVideo(file: File) {
  const type = file.type.toLowerCase()
  const byMime = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'].includes(type)
  const byExt = /\.(mp4|webm|ogv|ogg|mov)$/i.test(file.name)
  return byMime || byExt
}

function validateVideoFile(file: File) {
  if (!isAllowedVideo(file)) {
    return 'Please upload an MP4, WebM, OGG, or MOV video.'
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return `${file.name} is larger than 48 MB.`
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
  photo: string
  needs: string[]
}

const EMPTY_ROOM: RoomForm = {
  roomNo: '',
  type: 'bedspace',
  capacity: '1',
  monthlyRent: '',
  gender: 'mixed',
  aircon: false,
  photo: '',
  needs: [],
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
/*  Staged edits — nothing below touches the server until "Save        */
/*  changes" is pressed, so the public listing only ever changes when  */
/*  the landlord says so.                                              */
/* ------------------------------------------------------------------ */

/** One gallery photo as shown on screen. Saved photos keep their server id
 *  and `url`; freshly picked ones only have the cropped `dataUrl` until the
 *  save assigns them a real row (ids starting with "new-"). */
interface StagedPhoto {
  id: string
  url?: string
  dataUrl?: string
}

/** One walkthrough video as shown on screen — same staging idea as photos:
 *  saved videos keep their server id + `url`; freshly picked ones only have
 *  the `dataUrl` until the save assigns them a real row (ids "new-"). */
interface StagedVideo {
  id: string
  url?: string
  title: string
  dataUrl?: string
}

const isNewPhotoId = (id: string) => id.startsWith('new-')
const isNewPhoto = (photo: StagedPhoto) => isNewPhotoId(photo.id)
const isNewVideo = (video: StagedVideo) => video.id.startsWith('new-')
const isNewVideoId = (id: string) => id.startsWith('new-')

/** Read any picked file (video or image) as a data URL for staging/upload. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })
}
const isNewRoom = (room: Room) => room.id.startsWith('local-')

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
  // A plain div, not a <label>: several fields (chip lists, toggles) contain
  // buttons, and interactive content nested in a label makes clicks behave
  // unpredictably across browsers — the label tries to redirect the
  // activation to the first input it finds.
  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-navy-700">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-mut">{hint}</span>}
    </div>
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
  const [note, setNote] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const add = () => {
    const value = draft.trim()
    if (!value) {
      // Nothing typed yet — put the cursor back so it's obvious where to type.
      inputRef.current?.focus()
      return
    }
    if (values.includes(value)) {
      setNote(`"${value}" is already in the list.`)
      inputRef.current?.focus()
      return
    }
    onChange([...values, value])
    setDraft('')
    setNote('')
    // Keep the cursor in the field so several entries can be added in a row.
    inputRef.current?.focus()
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (note) setNote('')
          }}
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
      {note && <p className="mt-2 text-[11px] font-medium text-amber-soft">{note}</p>}
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
  const addVideos = useAddLandlordHouseVideos()
  const deleteVideo = useDeleteLandlordHouseVideo()

  // Rooms are what make "available" real: beds free = SUM(capacity) - SUM(occupied).
  // Server rooms are only the seed — edits below are staged until save.
  const { data: serverRooms, refetch: refetchRooms } = useRooms()
  const addRoom = useAddRoom()
  const updateRoom = useUpdateRoom()
  const deleteRoom = useDeleteRoom()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  /** Photo picked for the crop step; null when no crop is in progress. The
   *  staged photo being replaced travels alongside, if any. */
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [replacePhotoId, setReplacePhotoId] = useState<string | null>(null)
  /** Video being picked/renamed — drives the little video meta modal. */
  const [videoPick, setVideoPick] = useState<{ file: File; title: string } | null>(null)
  const [renameVideoId, setRenameVideoId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  /** The "Your changes are live" pop-up after a successful save. */
  const [showSavedModal, setShowSavedModal] = useState(false)

  // Staged gallery + rooms. Seeded from the server once, then edited purely
  // locally — the server only sees them when "Save changes" runs.
  const [photos, setPhotos] = useState<StagedPhoto[]>([])
  const [videos, setVideos] = useState<StagedVideo[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [hasStagedEdits, setHasStagedEdits] = useState(false)
  const photosDirty = useRef(false)
  const videosDirty = useRef(false)
  const roomsDirty = useRef(false)
  const removedPhotoIds = useRef<string[]>([])
  const removedRoomIds = useRef<string[]>([])
  /** Server videos touched since the last save. */
  const removedVideoIds = useRef<string[]>([])
  const renamedVideoTitles = useRef<Map<string, string>>(new Map())
  const uploadedVideoUrls = useRef<Set<string>>(new Set())
  /** Server rooms touched since the last save — only these are PUT on save. */
  const editedRoomIds = useRef<Set<string>>(new Set())
  /** Progress trackers so retrying a save that failed half-way never
   *  double-uploads a photo or re-adds a room that already landed. */
  const replacedPhotoIds = useRef<Set<string>>(new Set())
  const uploadedPhotoUrls = useRef<Set<string>>(new Set())
  const addedRoomIds = useRef<Set<string>>(new Set())
  const localPhotoSeq = useRef(0)
  const localVideoSeq = useRef(0)
  const localRoomSeq = useRef(0)

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

  // Mirror the server gallery into the staged list — but never while there
  // are unsaved photo edits, and re-sync again after a save lands.
  useEffect(() => {
    if (photosDirty.current) return
    setPhotos((house?.images ?? []).map((i) => ({ id: i.id, url: i.url })))
  }, [house?.images])

  // Same mirror for walkthrough videos.
  useEffect(() => {
    if (videosDirty.current) return
    setVideos((house?.videos ?? []).map((v) => ({ id: v.id, url: v.url, title: v.title })))
  }, [house?.videos])

  // Same idea for rooms: follow the server unless edits are pending.
  useEffect(() => {
    if (roomsDirty.current) return
    setRooms((serverRooms ?? []).map((r) => ({ ...r })))
  }, [serverRooms])

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

  /* ------------------------ Save (everything) ------------------------ */

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

    setSaving(true)
    try {
      // 1) Listing details — also creates the house on first save, which the
      //    photo and room steps below depend on.
      await saveHouse.mutateAsync(payload)

      // The house id every owner-scoped endpoint resolves against. After a
      // create it only exists once the server confirms.
      let houseId = house?.id ?? null
      if (!houseId) {
        const fresh = await getLandlordHouse(userId)
        houseId = fresh.house?.id ?? null
      }
      if (!houseId) throw new Error('Could not confirm your boarding house was saved.')

      // 2) Photos: removals, replacements, additions, then one reorder that
      //    puts the gallery in exactly the order shown on screen. Each step
      //    records its progress, so a retry after a mid-way failure never
      //    re-deletes or double-uploads.
      if (photosDirty.current) {
        for (const imageId of [...removedPhotoIds.current]) {
          try {
            await deleteImage.mutateAsync({ userId, imageId })
          } catch (err) {
            const msg = err instanceof Error ? err.message : ''
            // Already gone server-side (e.g. the previous attempt deleted it
            // before failing later on) — treat as done.
            if (!msg.includes('not part of your boarding house')) throw err
          }
          removedPhotoIds.current = removedPhotoIds.current.filter((id) => id !== imageId)
        }
        for (const photo of photos) {
          if (photo.dataUrl && !isNewPhoto(photo) && !replacedPhotoIds.current.has(photo.id)) {
            // Renovation flow — overwrite in place, keeping its position and
            // the cover, if it was the cover.
            await updateImage.mutateAsync({ userId, imageId: photo.id, image: photo.dataUrl })
            replacedPhotoIds.current.add(photo.id)
          }
        }
        for (const photo of photos) {
          if (isNewPhoto(photo) && photo.dataUrl && !uploadedPhotoUrls.current.has(photo.dataUrl)) {
            await addImages.mutateAsync({ userId, images: [photo.dataUrl] })
            uploadedPhotoUrls.current.add(photo.dataUrl)
          }
        }
        // Always finish with one reorder, so the stored order matches the
        // screen exactly — including reorder-only edits (moves, new cover).
        const fresh = await getLandlordHouse(userId)
        const kept = fresh.house?.images ?? []
        const used = new Set<string>()
        const serverIdFor = (dataUrl: string) =>
          kept.find((i) => i.url === dataUrl && !used.has(i.id))?.id
        const orderedIds = photos
          .map((p) => {
            if (!isNewPhoto(p)) return p.id
            const id = serverIdFor(p.dataUrl ?? '')
            if (id) used.add(id)
            return id
          })
          .filter((id): id is string => typeof id === 'string')
        if (orderedIds.length === photos.length && orderedIds.length > 0) {
          await reorderImages.mutateAsync({ userId, ids: orderedIds })
        }
        // Adopt the server rows (real ids + urls) as the new staged list.
        photosDirty.current = false
        replacedPhotoIds.current.clear()
        uploadedPhotoUrls.current.clear()
        setPhotos(kept.map((i) => ({ id: i.id, url: i.url })))
      }

      // 3) Videos: removals, renames, additions — then adopt server rows.
      if (videosDirty.current) {
        for (const videoId of [...removedVideoIds.current]) {
          try {
            await deleteVideo.mutateAsync({ userId, videoId })
          } catch (err) {
            const msg = err instanceof Error ? err.message : ''
            if (!msg.includes('not part of your boarding house')) throw err
          }
          removedVideoIds.current = removedVideoIds.current.filter((id) => id !== videoId)
        }
        for (const [videoId, title] of renamedVideoTitles.current) {
          if (videos.some((v) => v.id === videoId)) {
            await updateLandlordHouseVideo(userId, videoId, title)
          }
        }
        for (const video of videos) {
          if (isNewVideo(video) && video.dataUrl && !uploadedVideoUrls.current.has(video.dataUrl)) {
            await addVideos.mutateAsync({ userId, videos: [{ dataUrl: video.dataUrl, title: video.title }] })
            uploadedVideoUrls.current.add(video.dataUrl)
          }
        }
        const freshHouse = await getLandlordHouse(userId)
        const keptVideos = freshHouse.house?.videos ?? []
        videosDirty.current = false
        renamedVideoTitles.current.clear()
        uploadedVideoUrls.current.clear()
        setVideos(keptVideos.map((v) => ({ id: v.id, url: v.url, title: v.title })))
      }

      // 4) Rooms: updates (idempotent), then additions, then removals — each
      //    tracked so a retry after a partial failure can't duplicate rows.
      if (roomsDirty.current) {
        for (const room of rooms) {
          // Only rooms actually edited since the last save are PUT — an edit
          // that was later reverted would otherwise still be written.
          if (isNewRoom(room) || !editedRoomIds.current.has(room.id)) continue
          await updateRoom.mutateAsync({
            id: room.id,
            patch: {
              roomNo: room.roomNo,
              type: room.type,
              capacity: room.capacity,
              monthlyRent: room.monthlyRent,
              gender: room.gender,
              aircon: room.aircon,
              photo: room.photo ?? '',
              needs: room.needs ?? [],
            },
          })
        }
        for (const room of rooms) {
          if (!isNewRoom(room) || addedRoomIds.current.has(room.id)) continue
          await addRoom.mutateAsync({
            userId,
            roomNo: room.roomNo,
            type: room.type,
            capacity: room.capacity,
            monthlyRent: room.monthlyRent,
            gender: room.gender,
            aircon: room.aircon,
            photo: room.photo ?? '',
            needs: room.needs ?? [],
          })
          addedRoomIds.current.add(room.id)
        }
        for (const roomId of [...removedRoomIds.current]) {
          try {
            await deleteRoom.mutateAsync(roomId)
          } catch (err) {
            const msg = err instanceof Error ? err.message : ''
            if (!msg.includes('Room not found')) throw err
          }
        }
        // Adopt the server rows so staged rooms carry their real ids.
        const freshRooms = await refetchRooms()
        roomsDirty.current = false
        editedRoomIds.current.clear()
        addedRoomIds.current.clear()
        removedRoomIds.current = []
        setRooms((freshRooms.data ?? []).map((r) => ({ ...r })))
      }

      setHasStagedEdits(false)
      setNotice(
        house
          ? 'All changes saved. Your public listing is up to date.'
          : 'Boarding house published. It is now listed in Explore.',
      )
      setShowSavedModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your boarding house.')
    } finally {
      setSaving(false)
    }
  }

  /* -------------------- Staged photo interactions -------------------- */

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
    // Hand off to the crop step (4:3 — the ratio of the public listing cards,
    // so the picture is shown in full on Explore). The photo is only staged;
    // the upload happens on "Save changes".
    setCropFile(files[0])
  }

  /** Plain "add" entry point — clears any pending replace so a cancelled
   *  replace can never turn the next upload into an accidental overwrite. */
  const openAddPhoto = () => {
    setReplacePhotoId(null)
    fileInputRef.current?.click()
  }

  const handleReplace = (photoId: string) => {
    setError('')
    setReplacePhotoId(photoId)
    fileInputRef.current?.click()
  }

  /** Crop applied — swap or append purely in local state. */
  const applyCroppedImage = (dataUrl: string) => {
    setError('')
    if (replacePhotoId) {
      // Renovation flow: overwrite the old photo in place, keeping its
      // position (and the cover, if it was the cover).
      setPhotos((prev) => prev.map((p) => (p.id === replacePhotoId ? { ...p, dataUrl } : p)))
    } else {
      setPhotos((prev) =>
        prev.some((p) => p.dataUrl === dataUrl)
          ? prev
          : [...prev, { id: `new-${++localPhotoSeq.current}`, dataUrl }],
      )
    }
    photosDirty.current = true
    setHasStagedEdits(true)
    setCropFile(null)
    setReplacePhotoId(null)
  }

  const moveImage = (index: number, direction: -1 | 1) => {
    setPhotos((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    photosDirty.current = true
    setHasStagedEdits(true)
  }

  const makeCover = (photoId: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === photoId)
      if (!photo) return prev
      return [photo, ...prev.filter((p) => p.id !== photoId)]
    })
    photosDirty.current = true
    setHasStagedEdits(true)
  }

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    photosDirty.current = true
    setHasStagedEdits(true)
    if (!isNewPhotoId(photoId)) removedPhotoIds.current.push(photoId)
  }

  /* -------------------- Staged video interactions -------------------- */

  const handleVideoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    const file = files[0]
    if (!file) return
    const problem = validateVideoFile(file)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    // Ask for a title in a tiny modal; the video is only staged on confirm.
    setVideoPick({ file, title: '' })
  }

  const confirmVideoPick = () => {
    if (!videoPick) return
    void (async () => {
      setError('')
      try {
        const dataUrl = await fileToDataUrl(videoPick.file)
        setVideos((prev) =>
          prev.some((v) => v.dataUrl === dataUrl)
            ? prev
            : [...prev, { id: `new-${++localVideoSeq.current}`, dataUrl, title: videoPick.title.trim() }],
        )
        videosDirty.current = true
        setHasStagedEdits(true)
        setVideoPick(null)
      } catch {
        setError('Could not read that video file. Please try again.')
      }
    })()
  }

  const renameVideo = (video: StagedVideo) => {
    setRenameVideoId(video.id)
    setRenameDraft(video.title)
  }

  const confirmVideoRename = () => {
    if (!renameVideoId) return
    const title = renameDraft.trim()
    setVideos((prev) => prev.map((v) => (v.id === renameVideoId ? { ...v, title } : v)))
    if (!isNewVideoId(renameVideoId)) renamedVideoTitles.current.set(renameVideoId, title)
    videosDirty.current = true
    setHasStagedEdits(true)
    setRenameVideoId(null)
    setRenameDraft('')
  }

  const removeVideo = (videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== videoId))
    videosDirty.current = true
    setHasStagedEdits(true)
    if (!isNewVideoId(videoId)) removedVideoIds.current.push(videoId)
  }

  /* ----------------------- Staged room edits ------------------------- */

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
      photo: room.photo ?? '',
      needs: room.needs ?? [],
    })
    setRoomError('')
    setRoomOpen(true)
  }

  /** Adds/updates stay on-screen only — the room rows are written on save. */
  const submitRoom = (e: React.FormEvent) => {
    e.preventDefault()
    setRoomError('')
    if (!roomForm.roomNo.trim()) {
      setRoomError('Please enter a room number.')
      return
    }
    const duplicate = rooms.some(
      (r) =>
        r.id !== editingRoom?.id &&
        r.roomNo.trim().toLowerCase() === roomForm.roomNo.trim().toLowerCase(),
    )
    if (duplicate) {
      setRoomError(`Room ${roomForm.roomNo.trim()} already exists.`)
      return
    }
    // `occupied` is deliberately not editable — it follows the boarders actually
    // renting the room, which is what makes "available" trustworthy.
    const values = {
      roomNo: roomForm.roomNo.trim(),
      type: roomForm.type as Room['type'],
      capacity: Math.max(1, Number(roomForm.capacity) || 1),
      monthlyRent: Number(roomForm.monthlyRent.replace(/[^\d]/g, '')) || 0,
      gender: roomForm.gender as Room['gender'],
      aircon: roomForm.aircon,
      photo: roomForm.photo,
      needs: roomForm.needs,
    }
    if (editingRoom) {
      setRooms((prev) => prev.map((r) => (r.id === editingRoom.id ? { ...r, ...values } : r)))
      if (!isNewRoom(editingRoom)) editedRoomIds.current.add(editingRoom.id)
    } else {
      setRooms((prev) => [
        ...prev,
        { id: `local-${++localRoomSeq.current}`, houseId: house?.id ?? '', occupied: 0, tenantIds: [], ...values },
      ])
    }
    roomsDirty.current = true
    setHasStagedEdits(true)
    setRoomOpen(false)
    setEditingRoom(null)
    setRoomForm(EMPTY_ROOM)
  }

  const removeRoom = (room: Room) => {
    if (!window.confirm(`Remove room ${room.roomNo}? It will be deleted when you save.`)) return
    setRooms((prev) => prev.filter((r) => r.id !== room.id))
    roomsDirty.current = true
    setHasStagedEdits(true)
    setRoomError('')
    if (!isNewRoom(room)) removedRoomIds.current.push(room.id)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-7 w-7 text-brand-500" />
      </div>
    )
  }

  const busy = saving
  const cover = photos[0]
  const totalBeds = rooms.reduce((sum, r) => sum + r.capacity, 0)
  const takenBeds = rooms.reduce((sum, r) => sum + r.occupied, 0)
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
            {cover ? (
              <HouseImage src={cover.dataUrl ?? cover.url ?? ''} alt="Listing cover" className="h-full w-full" />
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
                ? `${house.barangay}, ${house.municipality} · ${photos.length} photo${photos.length === 1 ? '' : 's'}${totalBeds > 0 ? ` · ${freeBeds} of ${totalBeds} beds free` : ''}`
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

        {/* -------- Photos (staged until save) -------- */}
        <Card
          title="Photos"
          subtitle="The first photo is your listing cover. JPG, PNG, or WebP, up to 4 MB each. Photos upload when you save."
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
            aspect={4 / 3}
            outputWidth={960}
            quality={0.82}
            title={replacePhotoId ? 'Replace photo' : 'Crop your photo'}
            hint={replacePhotoId ? 'Position the new photo — it will take this photo\u2019s place.' : undefined}
            onClose={() => {
              setCropFile(null)
              setReplacePhotoId(null)
            }}
            onApply={applyCroppedImage}
          />

          {photos.length === 0 ? (
            <button
              type="button"
              onClick={openAddPhoto}
              disabled={busy}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-surface px-4 py-10 text-center transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-60"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-navy-500 shadow-sm">
                <Upload size={20} />
              </span>
              <span className="text-sm font-semibold text-navy-800">Upload your first photo</span>
              <span className="text-xs text-mut">Listings with photos get far more enquiries.</span>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((photo, index) => (
                  <motion.div
                    key={photo.id}
                    layout
                    className="group relative overflow-hidden rounded-xl border border-slate-100 bg-surface"
                  >
                    {photo.dataUrl ? (
                      <img src={photo.dataUrl} alt={`Photo ${index + 1}`} className="h-40 w-full object-cover" />
                    ) : (
                      <HouseImage src={photo.url ?? ''} alt={`Photo ${index + 1}`} className="h-40 w-full" />
                    )}
                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-navy-900/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
                        Cover
                      </span>
                    )}
                    {isNewPhoto(photo) && (
                      <span className="absolute right-2 top-2 rounded-full bg-brand-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
                        New
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
                          disabled={index === photos.length - 1 || busy}
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
                            onClick={() => makeCover(photo.id)}
                            disabled={busy}
                            className="rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold text-navy-700 transition hover:bg-white disabled:opacity-40"
                          >
                            Make cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleReplace(photo.id)}
                          disabled={busy}
                          className="flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-semibold text-navy-700 transition hover:bg-white disabled:opacity-40"
                          aria-label={`Replace photo ${index + 1}`}
                        >
                          <Repeat size={12} /> Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
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
                  disabled={busy}
                  className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-surface text-center transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-60"
                >
                  <ImageIcon size={20} className="text-navy-400" />
                  <span className="text-xs font-semibold text-navy-700">Add photos</span>
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* -------- Videos (staged until save) -------- */}
        <Card
          title="Videos"
          subtitle="Short walkthrough clips boarders can play right on your listing. MP4, WebM, OGG, or MOV, up to 48 MB each. Videos upload when you save."
        >
          <input ref={videoInputRef} type="file" accept={VIDEO_ACCEPT} className="sr-only" onChange={handleVideoPick} />

          {videos.length === 0 ? (
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={busy}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-surface px-4 py-10 text-center transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-60"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-navy-500 shadow-sm">
                <Video size={20} />
              </span>
              <span className="text-sm font-semibold text-navy-800">Upload your first video</span>
              <span className="text-xs text-mut">A 30-second room tour says more than ten photos.</span>
            </button>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {videos.map((video) => (
                <div key={video.id} className="overflow-hidden rounded-xl border border-slate-100 bg-surface">
                  {isNewVideo(video) && video.dataUrl ? (
                    <video src={video.dataUrl} controls className="h-44 w-full bg-navy-950 object-contain" />
                  ) : (
                    <video src={video.url} controls className="h-44 w-full bg-navy-950 object-contain" />
                  )}
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy-800">
                        {video.title || 'Untitled video'}
                        {isNewVideo(video) && (
                          <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-600">
                            New
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => renameVideo(video)}
                      disabled={busy}
                      className="rounded-lg p-2 text-navy-400 transition hover:bg-navy-50 hover:text-navy-800 disabled:opacity-40"
                      aria-label="Rename video"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeVideo(video.id)}
                      disabled={busy}
                      className="rounded-lg p-2 text-navy-400 transition hover:bg-red-50 hover:text-danger disabled:opacity-40"
                      aria-label="Remove video"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={busy}
                className="flex h-44 min-h-44 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-surface text-center transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-60"
              >
                <Video size={20} className="text-navy-400" />
                <span className="text-xs font-semibold text-navy-700">Add video</span>
              </button>
            </div>
          )}
        </Card>

        {/* -------- Save bar — the single point where everything publishes -------- */}
        <div className="flex flex-col gap-3 rounded-[18px] border border-slate-100 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-sm text-ink">
            {hasStagedEdits
              ? 'You have unsaved changes — details, photos and rooms all go live together when you save.'
              : house
                ? 'Changes go live on the Explore page as soon as you save.'
                : 'Saving creates your listing — it will appear in Explore right away.'}
          </p>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgb(30_115_232/0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {saving ? (
              <>
                <Spinner className="h-4 w-4" /> Saving…
              </>
            ) : (
              <>
                {house ? 'Save changes' : 'Create my boarding house'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* -------- Rooms — staged locally too, published by the same Save button -------- */}
      <Card
        title="Rooms & availability"
        subtitle="Available beds are calculated from your rooms, so they always match reality — there's nothing to type in by hand. Room edits save when you click Save changes."
      >
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

          {rooms.length > 0 ? (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
              {rooms.map((room) => {
                const free = Math.max(0, room.capacity - room.occupied)
                return (
                  <li key={room.id} className="flex items-center gap-3 bg-white px-4 py-3">
                    {room.photo ? (
                      <img src={room.photo} alt={`Room ${room.roomNo}`} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-navy-500">
                        <BedDouble size={16} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy-800">
                        Room {room.roomNo} <span className="font-normal capitalize text-mut">· {room.type}</span>
                        {isNewRoom(room) && (
                          <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-600">
                            New
                          </span>
                        )}
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
                      disabled={saving}
                      className="rounded-lg p-2 text-navy-400 transition hover:bg-navy-50 hover:text-navy-800 disabled:opacity-40"
                      aria-label={`Edit room ${room.roomNo}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRoom(room)}
                      disabled={saving}
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

          <button
            type="button"
            onClick={openAddRoom}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-100 disabled:opacity-60"
          >
            <Plus size={15} /> Add a room
          </button>
        </div>
      </Card>

      {landlord?.locationPref && (
        <p className="pb-2 text-center text-xs text-mut">
          Signed-up as {landlord.businessName || 'your account'} · location on file: {landlord.locationPref}
        </p>
      )}

      {/* -------- Video pick: ask for a title before staging -------- */}
      <Modal open={videoPick !== null} onClose={() => setVideoPick(null)} title="Add a video">
        {videoPick && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              confirmVideoPick()
            }}
            className="space-y-4"
          >
            <video src={URL.createObjectURL(videoPick.file)} controls className="w-full rounded-xl bg-navy-950 object-contain" />
            <Field label="Video title" hint="e.g. Room tour — second floor">
              <input
                value={videoPick.title}
                onChange={(e) => setVideoPick({ ...videoPick, title: e.target.value })}
                placeholder="Walkthrough video"
                className={inputCls}
                autoFocus
              />
            </Field>
            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"
              >
                <Check size={15} /> Add video
              </button>
              <button
                type="button"
                onClick={() => setVideoPick(null)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-surface"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* -------- Video rename -------- */}
      <Modal open={renameVideoId !== null} onClose={() => setRenameVideoId(null)} title="Rename video">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            confirmVideoRename()
          }}
          className="space-y-4"
        >
          <Field label="Video title">
            <input value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)} className={inputCls} autoFocus />
          </Field>
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"
            >
              Save title
            </button>
            <button
              type="button"
              onClick={() => setRenameVideoId(null)}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* -------- Add / Edit room — a focused modal instead of an inline form -------- */}
      <Modal
        open={roomOpen}
        onClose={() => {
          setRoomOpen(false)
          setEditingRoom(null)
          setRoomError('')
        }}
        title={editingRoom ? `Edit room ${editingRoom.roomNo}` : 'Add a room'}
        wide
      >
        <form onSubmit={submitRoom} className="space-y-4">
          {roomError && (
            <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-medium text-danger">
              {roomError}
            </p>
          )}
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
                'flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition',
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

          {/* Room photo — what boarders see on the room list of your listing. */}
          <div className="rounded-xl border border-slate-100 bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Room photo</p>
            <div className="mt-3 flex items-center gap-4">
              {roomForm.photo ? (
                <img src={roomForm.photo} alt={`Room ${roomForm.roomNo || ''}`} className="h-20 w-28 rounded-lg object-cover" />
              ) : (
                <span className="flex h-20 w-28 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-navy-300">
                  <BedDouble size={22} />
                </span>
              )}
              <div className="flex flex-col gap-2">
                <label
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-navy-700 transition hover:border-brand-300 hover:text-brand-500',
                    saving && 'pointer-events-none opacity-50',
                  )}
                >
                  <Upload size={14} /> {roomForm.photo ? 'Change photo' : 'Upload photo'}
                  <input
                    type="file"
                    accept={IMAGE_ACCEPT}
                    className="sr-only"
                    onChange={(e) => {
                      const file = (e.target.files ?? [])[0]
                      e.target.value = ''
                      if (!file) return
                      const problem = validateImageFile(file)
                      if (problem) {
                        setRoomError(problem)
                        return
                      }
                      void fileToDataUrl(file).then((dataUrl) => {
                        setRoomForm((p) => ({ ...p, photo: dataUrl }))
                        setRoomError('')
                      })
                    }}
                  />
                </label>
                {roomForm.photo && (
                  <button
                    type="button"
                    onClick={() => setRoomForm((p) => ({ ...p, photo: '' }))}
                    className="text-xs font-semibold text-danger hover:underline"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Room needs — the small amenities boarders filter rooms by. */}
          <Field label="Room needs" hint="What this room includes — boarders see these on your listing.">
            <ChipList
              values={roomForm.needs}
              onChange={(next) => setRoomForm((p) => ({ ...p, needs: next }))}
              placeholder="e.g. Own cabinet, Study desk, Outlet per bed"
            />
          </Field>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"
            >
              {editingRoom ? 'Save room' : 'Add room'}
            </button>
            <button
              type="button"
              onClick={() => {
                setRoomOpen(false)
                setEditingRoom(null)
                setRoomError('')
              }}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* -------- "Changes are live" pop-up after a successful save -------- */}
      <Modal open={showSavedModal} onClose={() => setShowSavedModal(false)} title="Changes saved">
        <div className="space-y-4 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint-50 text-mint-600"
          >
            <Check size={28} strokeWidth={3} />
          </motion.div>
          <div>
            <p className="text-base font-bold text-navy-800">Your boarding house is updated!</p>
            <p className="mt-1 text-sm text-ink">
              {house
                ? 'All your changes — details, photos, videos and rooms — are live on your public listing.'
                : 'Your listing is now published and visible to boarders in Explore.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSavedModal(false)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"
          >
            Great, got it
          </button>
        </div>
      </Modal>
    </div>
  )
}
