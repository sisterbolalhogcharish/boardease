import type {
  AnalyticsData,
  Boarder,
  BoardingHouse,
  DashboardOverview,
  Gender,
  HouseStatus,
  Payment,
  PaymentStatus,
  Room,
  RoomType,
  Subscription,
} from './types'
import {
  BOARDERS,
  HOUSES,
  NOTIFICATIONS,
  PAYMENTS,
  REVIEWS,
  ROOMS,
  SUBSCRIPTION,
  analyticsPayments,
  currentMonthKey,
  houseById,
  houseReviews,
  LOCATIONS,
  occupancyTrend,
  paymentsThisMonth,
  revenueTrend,
  roomStatusRows,
} from './db'
import { askAI } from './ai'

/* ------------------------------------------------------------------ */
/*  Simulated network layer                                            */
/* ------------------------------------------------------------------ */
const delay = (ms = 380) => new Promise((r) => setTimeout(r, ms + Math.random() * 220))

let paymentSeq = PAYMENTS.length

/* ------------------------------------------------------------------ */
/*  Search                                                             */
/* ------------------------------------------------------------------ */
export interface SearchFilters {
  municipality?: string
  barangay?: string
  school?: string
  maxRent?: number
  roomTypes: RoomType[]
  gender?: Gender
  onlyAvailable?: boolean
  minRating?: number
  amenities: {
    wifi: boolean
    aircon: boolean
    kitchen: boolean
    laundry: boolean
    parking: boolean
    petFriendly: boolean
    curfew: boolean
  }
}

export type SortKey = 'recommended' | 'price-asc' | 'price-desc' | 'rating' | 'available'

export interface HouseCard extends BoardingHouse {
  status: HouseStatus
  vacant: number
}

export function houseCard(h: BoardingHouse): HouseCard {
  const vacant = Math.max(0, h.totalRooms - h.occupiedRooms)
  const status: HouseStatus =
    vacant <= 0 ? 'full' : vacant <= Math.max(2, Math.round(h.totalRooms * 0.1)) ? 'almost-full' : 'available'
  return { ...h, status, vacant }
}

export async function getHouses(filters?: SearchFilters, sort: SortKey = 'recommended'): Promise<HouseCard[]> {
  await delay()
  let list = HOUSES.map(houseCard)
  if (filters) {
    if (filters.municipality) list = list.filter((h) => h.municipality === filters.municipality)
    if (filters.barangay) list = list.filter((h) => h.barangay === filters.barangay)
    if (filters.school) list = list.filter((h) => h.schoolNearby.includes(filters.school!))
    if (filters.maxRent) list = list.filter((h) => h.monthlyRent <= filters.maxRent!)
    if (filters.roomTypes.length) list = list.filter((h) => h.roomTypes.some((t) => filters.roomTypes.includes(t)))
    if (filters.gender) list = list.filter((h) => h.gender === filters.gender || h.gender === 'mixed')
    if (filters.onlyAvailable) list = list.filter((h) => h.vacant > 0)
    if (filters.minRating) list = list.filter((h) => h.rating >= filters.minRating!)
    const a = filters.amenities
    if (a.wifi) list = list.filter((h) => h.wifi)
    if (a.aircon) list = list.filter((h) => h.aircon)
    if (a.kitchen) list = list.filter((h) => h.kitchen)
    if (a.laundry) list = list.filter((h) => h.laundry)
    if (a.parking) list = list.filter((h) => h.parking)
    if (a.petFriendly) list = list.filter((h) => h.petFriendly)
    if (a.curfew) list = list.filter((h) => !!h.curfew)
  }
  switch (sort) {
    case 'price-asc':
      list.sort((a, b) => a.monthlyRent - b.monthlyRent)
      break
    case 'price-desc':
      list.sort((a, b) => b.monthlyRent - a.monthlyRent)
      break
    case 'rating':
      list.sort((a, b) => b.rating - a.rating)
      break
    case 'available':
      list.sort((a, b) => b.vacant - a.vacant)
      break
    default:
      list.sort((a, b) => Number(b.verified) - Number(a.verified) || b.rating - a.rating)
  }
  return list
}

export async function getHouse(id: string): Promise<HouseCard | null> {
  await delay(300)
  const h = houseById(id)
  return h ? houseCard(h) : null
}

export async function getFeaturedHouses(): Promise<HouseCard[]> {
  await delay(300)
  return HOUSES.map(houseCard)
    .sort((a, b) => Number(b.topRated) - Number(a.topRated) || b.rating - a.rating)
    .slice(0, 4)
}

export async function getSimilarHouses(id: string): Promise<HouseCard[]> {
  await delay(250)
  const h = houseById(id)
  if (!h) return []
  return HOUSES.filter((x) => x.id !== id)
    .map(houseCard)
    .filter((x) => x.municipality === h.municipality || x.monthlyRent <= h.monthlyRent + 1000)
    .slice(0, 3)
}

export async function getLocations() {
  await delay(200)
  return LOCATIONS
}

/* ------------------------------------------------------------------ */
/*  Reviews                                                            */
/* ------------------------------------------------------------------ */
export async function getReviews(houseId?: string) {
  await delay(250)
  return houseId ? houseReviews(houseId) : REVIEWS
}

/* ------------------------------------------------------------------ */
/*  Payments                                                           */
/* ------------------------------------------------------------------ */
export interface PaymentRow extends Payment {
  boarderName: string
  roomNo: string
}

function toPaymentRow(p: Payment): PaymentRow {
  const b = BOARDERS.find((x) => x.id === p.boarderId)
  const r = ROOMS.find((x) => x.id === p.roomId)
  return { ...p, boarderName: b?.name ?? '—', roomNo: r?.roomNo ?? '—' }
}

export async function getPayments(opts?: { status?: PaymentStatus; month?: string; q?: string }): Promise<PaymentRow[]> {
  await delay()
  let list = PAYMENTS.map(toPaymentRow)
  if (opts?.status) list = list.filter((p) => p.status === opts.status)
  if (opts?.month) list = list.filter((p) => p.month === opts.month)
  if (opts?.q) {
    const q = opts.q.toLowerCase()
    list = list.filter((p) => p.boarderName.toLowerCase().includes(q) || p.roomNo.includes(q))
  }
  return list.sort((a, b) => b.dueDate.localeCompare(a.dueDate))
}

export async function getPaymentMonths(): Promise<string[]> {
  await delay(120)
  return Array.from(new Set(PAYMENTS.map((p) => p.month))).sort().reverse()
}

export async function markPaymentPaid(id: string, method: string): Promise<PaymentRow> {
  await delay(450)
  const p = PAYMENTS.find((x) => x.id === id)
  if (!p) throw new Error('Payment not found')
  p.status = 'paid'
  p.paidDate = new Date().toISOString().slice(0, 10)
  p.method = method
  p.reference = `${method === 'GCash' ? 'GC' : method === 'PayLink' ? 'PL' : 'RC'}-${Math.floor(100000 + Math.random() * 899999)}`
  return toPaymentRow(p)
}

/* ------------------------------------------------------------------ */
/*  Boarders                                                           */
/* ------------------------------------------------------------------ */
export async function getBoarders(opts?: { q?: string; gender?: 'male' | 'female'; roomId?: string }): Promise<Boarder[]> {
  await delay()
  let list = BOARDERS
  if (opts?.q) {
    const q = opts.q.toLowerCase()
    list = list.filter((b) => b.name.toLowerCase().includes(q) || b.school.toLowerCase().includes(q))
  }
  if (opts?.gender) list = list.filter((b) => b.gender === opts.gender)
  if (opts?.roomId) list = list.filter((b) => b.roomId === opts.roomId)
  return [...list].sort((a, b) => a.name.localeCompare(b.name))
}

const AVATAR_COLORS = ['#1E73E8', '#33C7A5', '#0B2D63', '#F59E0B', '#EF4444']

export async function addBoarder(
  input: Omit<Boarder, 'id' | 'houseId' | 'status' | 'avatarColor' | 'contractEnd' | 'deposit' | 'advance'> & { deposit: number; advance: number },
): Promise<Boarder> {
  await delay(500)
  const id = `b${Date.now()}`
  const end = new Date(input.moveInDate)
  end.setFullYear(end.getFullYear() + 1)
  const boarder: Boarder = {
    ...input,
    id,
    houseId: 'sunset',
    status: 'active',
    avatarColor: AVATAR_COLORS[BOARDERS.length % AVATAR_COLORS.length],
    contractEnd: end.toISOString().slice(0, 10),
  }
  BOARDERS.push(boarder)
  const room = ROOMS.find((r) => r.id === input.roomId)
  if (room) {
    room.occupied = Math.min(room.capacity, room.occupied + 1)
    room.tenantIds.push(id)
    const due = new Date()
    PAYMENTS.push({
      id: `p-${paymentSeq++}`,
      boarderId: id,
      roomId: input.roomId,
      houseId: 'sunset',
      month: currentMonthKey(),
      label: due.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      amount: input.monthlyRent,
      dueDate: due.toISOString().slice(0, 10),
      paidDate: null,
      status: 'pending',
      method: null,
      reference: null,
    })
  }
  return boarder
}

export async function removeBoarder(id: string): Promise<void> {
  await delay(400)
  const idx = BOARDERS.findIndex((b) => b.id === id)
  if (idx >= 0) {
    const [b] = BOARDERS.splice(idx, 1)
    const room = ROOMS.find((r) => r.id === b.roomId)
    if (room) {
      room.occupied = Math.max(0, room.occupied - 1)
      room.tenantIds = room.tenantIds.filter((t) => t !== id)
    }
    // Remove the boarder's payment history so the ledger stays consistent.
    for (let i = PAYMENTS.length - 1; i >= 0; i--) {
      if (PAYMENTS[i].boarderId === id) PAYMENTS.splice(i, 1)
    }
  }
}

export interface NeedsAttentionRow {
  id: string
  name: string
  roomNo: string
  amount: number
  status: 'overdue' | 'pending'
}

export async function getNeedsAttention(): Promise<NeedsAttentionRow[]> {
  await delay(250)
  return paymentsThisMonth()
    .filter((p): p is Payment & { status: 'overdue' | 'pending' } => p.status === 'overdue' || p.status === 'pending')
    .map((p) => {
      const b = BOARDERS.find((x) => x.id === p.boarderId)
      const r = ROOMS.find((x) => x.id === p.roomId)
      return { id: p.id, name: b?.name ?? '—', roomNo: r?.roomNo ?? '—', amount: p.amount, status: p.status }
    })
    .sort((a, b) => (a.status === 'overdue' ? -1 : 1) - (b.status === 'overdue' ? -1 : 1))
}

/* ------------------------------------------------------------------ */
/*  Rooms                                                              */
/* ------------------------------------------------------------------ */
export async function getRooms(): Promise<Room[]> {
  await delay()
  return ROOMS
}

export async function getRoomStatus() {
  await delay(250)
  return roomStatusRows()
}

export async function addRoom(input: { roomNo: string; type: RoomType; capacity: number; monthlyRent: number; gender: Gender; aircon: boolean }): Promise<Room> {
  await delay(450)
  const room: Room = {
    id: `r-${Date.now()}`,
    houseId: 'sunset',
    roomNo: input.roomNo,
    type: input.type,
    capacity: input.capacity,
    occupied: 0,
    monthlyRent: input.monthlyRent,
    gender: input.gender,
    aircon: input.aircon,
    tenantIds: [],
  }
  ROOMS.push(room)
  const house = houseById('sunset')
  if (house) house.totalRooms += input.capacity
  return room
}

export async function deleteRoom(id: string): Promise<void> {
  await delay(400)
  const idx = ROOMS.findIndex((r) => r.id === id)
  if (idx >= 0) {
    const [room] = ROOMS.splice(idx, 1)
    const house = houseById('sunset')
    if (house) house.totalRooms = Math.max(0, house.totalRooms - room.capacity)
  }
}

export async function updateRoom(
  id: string,
  patch: Partial<{ roomNo: string; type: RoomType; capacity: number; monthlyRent: number; gender: Gender; aircon: boolean }>,
): Promise<Room> {
  await delay(400)
  const room = ROOMS.find((r) => r.id === id)
  if (!room) throw new Error('Room not found')
  const house = houseById('sunset')
  if (house && patch.capacity && patch.capacity !== room.capacity) {
    house.totalRooms = Math.max(0, house.totalRooms - room.capacity + patch.capacity)
  }
  Object.assign(room, patch)
  room.occupied = Math.min(room.capacity, room.occupied)
  return room
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  await delay()
  const rooms = ROOMS
  const total = rooms.reduce((s, r) => s + r.capacity, 0)
  const occupied = rooms.reduce((s, r) => s + r.occupied, 0)
  const current = paymentsThisMonth()
  const collected = current.filter((p) => p.status === 'paid' || p.status === 'late').reduce((s, p) => s + p.amount, 0)
  const pending = current.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  const overdue = current.filter((p) => p.status === 'overdue')
  const lateCount = overdue.length + current.filter((p) => p.status === 'late').length
  const expected = current.reduce((s, p) => s + p.amount, 0)
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const newBoarders = BOARDERS.filter((b) => b.moveInDate.startsWith(thisMonth)).length
  const expiring = BOARDERS.filter((b) => b.status === 'expiring' || (new Date(b.contractEnd).getTime() - Date.now()) / 86400000 <= 45).length

  return {
    totalRooms: total,
    occupiedRooms: occupied,
    vacantRooms: total - occupied,
    occupancyRate: Math.round((occupied / total) * 100),
    monthlyIncome: collected,
    expectedIncome: expected,
    lateCount,
    paidThisMonth: current.filter((p) => p.status === 'paid' || p.status === 'late').length,
    pendingAmount: pending,
    expiringContracts: expiring,
    newBoardersThisMonth: newBoarders,
    boarderCount: BOARDERS.length,
    genderSplit: {
      male: BOARDERS.filter((b) => b.gender === 'male').length,
      female: BOARDERS.filter((b) => b.gender === 'female').length,
    },
    revenueTrend: revenueTrend(),
    occupancyTrend: occupancyTrend(),
    roomStatus: roomStatusRows(),
  }
}

export async function getAnalytics(): Promise<AnalyticsData> {
  await delay(400)
  const rev = revenueTrend()
  const occ = occupancyTrend()
  const payments = analyticsPayments()
  const male = BOARDERS.filter((b) => b.gender === 'male').length
  const female = BOARDERS.filter((b) => b.gender === 'female').length
  const schools = new Map<string, number>()
  BOARDERS.forEach((b) => schools.set(b.school, (schools.get(b.school) ?? 0) + 1))
  const lateByMonth = Array.from(new Set(payments.map((p) => p.month))).sort().map((m) => {
    const inM = payments.filter((p) => p.month === m)
    return {
      name: m.slice(5),
      late: inM.filter((p) => p.status === 'late').length,
      overdue: inM.filter((p) => p.status === 'overdue').length,
    }
  })
  const income = rev.map((r) => r.income)
  const avg = income.reduce((s, v) => s + v, 0) / Math.max(1, income.length)
  const forecast = Array.from({ length: 6 }, (_, i) => ({
    name: `${new Date(new Date().getFullYear(), new Date().getMonth() + 1 + i, 1).toLocaleDateString('en-US', { month: 'short' })}`,
    value: Math.round(avg * (1 + 0.02 * (i + 1))),
    forecast: true,
  }))
  const baseForecast = rev.slice(-3).map((r) => ({ name: r.name.slice(5), value: r.income, forecast: false }))

  return {
    revenueByMonth: rev.map((r) => ({ name: r.name.slice(5), income: r.income, expected: r.expected, late: 0 })),
    occupancyByMonth: occ.map((o) => ({ name: o.name.slice(5), occupancy: o.occupancy })),
    revenueForecast: [...baseForecast, ...forecast],
    genderDistribution: [
      { name: 'Female', value: female },
      { name: 'Male', value: male },
    ],
    schoolDistribution: Array.from(schools.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    roomOccupancy: ROOMS.map((r) => ({ name: r.roomNo, occupied: r.occupied, capacity: r.capacity })),
    boarderGrowth: occ.map((o) => ({ name: o.name.slice(5), boarders: Math.round((o.occupancy / 100) * 28) })),
    lateTrend: lateByMonth,
    topRooms: ROOMS.map((r) => ({ name: r.roomNo, revenue: r.monthlyRent * r.occupied })).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  }
}

/* ------------------------------------------------------------------ */
/*  Notifications / subscription / AI                                  */
/* ------------------------------------------------------------------ */
export async function getNotifications() {
  await delay(200)
  return [...NOTIFICATIONS].sort((a, b) => b.date.localeCompare(a.date))
}

export async function markNotificationsRead() {
  await delay(150)
  NOTIFICATIONS.forEach((n) => (n.read = true))
}

export async function getSubscription(): Promise<Subscription> {
  await delay(200)
  return SUBSCRIPTION
}

export async function askAssistant(question: string) {
  await delay(700 + Math.random() * 500)
  return askAI(question)
}

export const PLANS: Subscription[] = [
  {
    plan: 'Starter',
    price: 100,
    cycle: 'month',
    status: 'active',
    renewsOn: '',
    boarderLimit: 5,
    features: ['Basic dashboard', 'Room management', 'Payment tracking', 'PDF reports'],
  },
  {
    plan: 'Standard',
    price: 200,
    cycle: 'month',
    status: 'active',
    renewsOn: '2026-08-28',
    boarderLimit: 15,
    features: ['Everything in Starter', 'Analytics & charts', 'AI Assistant', 'Smart notifications', 'Reviews management', 'Excel export'],
  },
  {
    plan: 'Premium',
    price: 500,
    cycle: 'year',
    status: 'active',
    renewsOn: '',
    boarderLimit: null,
    features: ['Everything unlocked', 'Unlimited boarders', 'Advanced analytics', 'Priority support', 'Unlimited storage', 'Future premium features'],
  },
]
