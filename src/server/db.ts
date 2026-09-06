import type { Boarder, BoardingHouse, HouseStatus, Payment, Room } from './types'
import { HOUSES, NOTIFICATIONS, REVIEWS, SUBSCRIPTION } from './data/houses'
import { BOARDERS, ROOMS } from './data/people'
import { NOW, PAYMENTS, monthKey } from './data/payments'

export { HOUSES, ROOMS, BOARDERS, PAYMENTS, REVIEWS, NOTIFICATIONS, SUBSCRIPTION, NOW }

export type { BoardingHouse, Boarder, Room, Payment }

/* ------------------------------------------------------------------ */
/*  Derived lookups                                                    */
/* ------------------------------------------------------------------ */
export const houseById = (id: string) => HOUSES.find((h) => h.id === id)
export const roomById = (id: string) => ROOMS.find((r) => r.id === id)
export const boarderById = (id: string) => BOARDERS.find((b) => b.id === id)
export const boardersOfRoom = (roomId: string) => BOARDERS.filter((b) => b.roomId === roomId)
export const roomStatusOf = (h: BoardingHouse): HouseStatus => {
  const vacant = h.totalRooms - h.occupiedRooms
  if (vacant <= 0) return 'full'
  if (vacant <= Math.max(2, Math.round(h.totalRooms * 0.1))) return 'almost-full'
  return 'available'
}
export const houseReviews = (houseId: string) => REVIEWS.filter((r) => r.houseId === houseId)

/* ------------------------------------------------------------------ */
/*  Locations (municipalities + barangays)                             */
/* ------------------------------------------------------------------ */
export interface LocationStat {
  municipality: string
  count: number
  image: string
  barangays: string[]
}

export const LOCATIONS: LocationStat[] = [
  { municipality: 'San Juan', count: 2, image: HOUSES[0].images[0], barangays: ['Maite', 'Poblacion', 'Tambisan'] },
  { municipality: 'Siquijor', count: 2, image: HOUSES[3].images[0], barangays: ['Poblacion', 'Cang-asa', 'Banban'] },
  { municipality: 'Larena', count: 1, image: HOUSES[2].images[0], barangays: ['Poblacion', 'Nonoc', 'Sabang'] },
  { municipality: 'Lazi', count: 1, image: HOUSES[5].images[0], barangays: ['Poblacion', 'Campalanas'] },
  { municipality: 'Maria', count: 1, image: HOUSES[4].images[0], barangays: ['Logucan', 'Bogo', 'Olang'] },
  { municipality: 'Enrique Villanueva', count: 1, image: HOUSES[6].images[0], barangays: ['Balolong', 'Lugsangan'] },
]

export const SCHOOLS = [
  'Siquijor State College',
  'Notre Dame of Siquijor',
  'St. Francis of Assisi College',
  'Siquijor Science High School',
]

/* ------------------------------------------------------------------ */
/*  Dashboard & analytics builders                                     */
/* ------------------------------------------------------------------ */
export const LANLORD_HOUSE_ID = 'sunset'

export interface RoomStatusRow {
  roomNo: string
  type: Room['type']
  occupied: number
  capacity: number
  monthlyRent: number
  aircon: boolean
  tenantNames: string[]
}

export function roomStatusRows(houseId = LANLORD_HOUSE_ID): RoomStatusRow[] {
  return ROOMS.filter((r) => r.houseId === houseId).map((r) => ({
    roomNo: r.roomNo,
    type: r.type,
    occupied: r.occupied,
    capacity: r.capacity,
    monthlyRent: r.monthlyRent,
    aircon: r.aircon,
    tenantNames: boardersOfRoom(r.id).map((b) => b.name),
  }))
}

export function revenueTrend(): { name: string; income: number; expected: number }[] {
  const months = Array.from(new Set(PAYMENTS.map((p) => p.month))).sort()
  return months.map((m) => {
    const inMonth = PAYMENTS.filter((p) => p.month === m)
    const income = inMonth.filter((p) => p.status === 'paid' || p.status === 'late').reduce((s, p) => s + p.amount, 0)
    const expected = inMonth.reduce((s, p) => s + p.amount, 0)
    return { name: m, income, expected }
  })
}

export function occupancyTrend(): { name: string; occupancy: number }[] {
  const months = Array.from(new Set(PAYMENTS.map((p) => p.month))).sort()
  const total = ROOMS.filter((r) => r.houseId === LANLORD_HOUSE_ID).reduce((s, r) => s + r.capacity, 0)
  const occupied = ROOMS.filter((r) => r.houseId === LANLORD_HOUSE_ID).reduce((s, r) => s + r.occupied, 0)
  // Walk backwards from today's occupancy so the series converges to reality.
  return months.map((m, i) => {
    const idx = i / Math.max(1, months.length - 1)
    const occ = Math.round((occupied / total) * 100 - (1 - idx) * 14)
    return { name: m, occupancy: Math.max(0, Math.min(100, occ)) }
  })
}

export function currentMonthKey(): string {
  return monthKey(NOW)
}

export function paymentsThisMonth(): Payment[] {
  const key = currentMonthKey()
  return PAYMENTS.filter((p) => p.month === key)
}

export function analyticsPayments(): Payment[] {
  return [...PAYMENTS].sort((a, b) => a.month.localeCompare(b.month))
}
