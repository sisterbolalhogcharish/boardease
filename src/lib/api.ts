import type {
  AnalyticsData,
  BoardingHouse,
  DashboardOverview,
  Payment,
  PaymentStatus,
  Room,
  Subscription,
} from '../server/types'

const API_BASE = '/api'

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

/* ------------------------------------------------------------------ */
/*  Search                                                             */
/* ------------------------------------------------------------------ */
export interface SearchFilters {
  municipality?: string
  barangay?: string
  school?: string
  maxRent?: number
  roomTypes: string[]
  gender?: string
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
  status: string
  vacant: number
}

export async function getHouses(filters?: SearchFilters, sort: SortKey = 'recommended'): Promise<HouseCard[]> {
  const params = new URLSearchParams()
  if (filters) {
    if (filters.municipality) params.set('municipality', filters.municipality)
    if (filters.barangay) params.set('barangay', filters.barangay)
    if (filters.school) params.set('school', filters.school)
    if (filters.maxRent) params.set('maxRent', String(filters.maxRent))
    if (filters.gender) params.set('gender', filters.gender)
    if (filters.onlyAvailable) params.set('onlyAvailable', 'true')
    if (filters.minRating) params.set('minRating', String(filters.minRating))
    if (filters.amenities.wifi) params.set('wifi', 'true')
    if (filters.amenities.aircon) params.set('aircon', 'true')
    if (filters.amenities.kitchen) params.set('kitchen', 'true')
    if (filters.amenities.laundry) params.set('laundry', 'true')
    if (filters.amenities.parking) params.set('parking', 'true')
    if (filters.amenities.petFriendly) params.set('petFriendly', 'true')
    if (filters.amenities.curfew) params.set('curfew', 'true')
  }
  params.set('sort', sort)
  return fetchJSON<HouseCard[]>(`/houses?${params.toString()}`)
}

export async function getHouse(id: string): Promise<HouseCard | null> {
  try {
    return await fetchJSON<HouseCard>(`/houses/${id}`)
  } catch {
    return null
  }
}

export async function getFeaturedHouses(): Promise<HouseCard[]> {
  return fetchJSON<HouseCard[]>('/houses/featured')
}

export async function getSimilarHouses(id: string): Promise<HouseCard[]> {
  return fetchJSON<HouseCard[]>(`/houses/${id}/similar`)
}

export async function getLocations() {
  return fetchJSON<{ municipality: string; count: number; image: string; barangays: string[] }[]>('/locations')
}

/* ------------------------------------------------------------------ */
/*  Reviews                                                            */
/* ------------------------------------------------------------------ */
export async function getReviews(houseId?: string) {
  const params = houseId ? `?houseId=${houseId}` : ''
  return fetchJSON<any[]>(`/reviews${params}`)
}

/* ------------------------------------------------------------------ */
/*  Payments                                                           */
/* ------------------------------------------------------------------ */
export interface PaymentRow extends Payment {
  boarderName: string
  roomNo: string
}

export async function getPayments(opts?: { status?: PaymentStatus; month?: string; q?: string }): Promise<PaymentRow[]> {
  const params = new URLSearchParams()
  if (opts?.status) params.set('status', opts.status)
  if (opts?.month) params.set('month', opts.month)
  if (opts?.q) params.set('q', opts.q)
  const qs = params.toString()
  return fetchJSON<PaymentRow[]>(`/payments${qs ? `?${qs}` : ''}`)
}

export async function getPaymentMonths(): Promise<string[]> {
  return fetchJSON<string[]>('/payments/months')
}

export async function markPaymentPaid(id: string, method: string): Promise<PaymentRow> {
  return fetchJSON<PaymentRow>(`/payments/${id}/pay`, {
    method: 'PUT',
    body: JSON.stringify({ method }),
  })
}

/* ------------------------------------------------------------------ */
/*  Boarders                                                           */
/* ------------------------------------------------------------------ */
export async function getBoarders(opts?: { q?: string; gender?: 'male' | 'female'; roomId?: string }): Promise<any[]> {
  const params = new URLSearchParams()
  if (opts?.q) params.set('q', opts.q)
  if (opts?.gender) params.set('gender', opts.gender)
  if (opts?.roomId) params.set('roomId', opts.roomId)
  const qs = params.toString()
  return fetchJSON<any[]>(`/boarders${qs ? `?${qs}` : ''}`)
}

export async function addBoarder(input: any): Promise<any> {
  return fetchJSON<any>('/boarders', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function removeBoarder(id: string): Promise<void> {
  await fetchJSON(`/boarders/${id}`, { method: 'DELETE' })
}

/* ------------------------------------------------------------------ */
/*  Rooms                                                              */
/* ------------------------------------------------------------------ */
export async function getRooms(): Promise<Room[]> {
  return fetchJSON<Room[]>('/rooms')
}

export async function addRoom(input: any): Promise<Room> {
  return fetchJSON<Room>('/rooms', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function deleteRoom(id: string): Promise<void> {
  await fetchJSON(`/rooms/${id}`, { method: 'DELETE' })
}

export async function updateRoom(id: string, patch: any): Promise<Room> {
  return fetchJSON<Room>(`/rooms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  return fetchJSON<DashboardOverview>('/dashboard/overview')
}

export async function getAnalytics(): Promise<AnalyticsData> {
  // Build analytics from payments + rooms
  const [payments, rooms] = await Promise.all([
    fetchJSON<any[]>('/payments'),
    fetchJSON<Room[]>('/rooms'),
  ])

  // Revenue by month
  const monthMap = new Map<string, { income: number; expected: number }>()
  for (const p of payments) {
    const m = p.month
    if (!monthMap.has(m)) monthMap.set(m, { income: 0, expected: 0 })
    const entry = monthMap.get(m)!
    entry.expected += p.amount
    if (p.status === 'paid' || p.status === 'late') entry.income += p.amount
  }
  const revenueByMonth = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, { income, expected }]) => ({ name, income, expected, late: 0 }))

  // Occupancy by month (same as revenue months)
  const occupancyByMonth = revenueByMonth.map(r => ({
    name: r.name,
    occupancy: rooms.length > 0 ? Math.round((rooms.reduce((s, r) => s + r.occupied, 0) / rooms.reduce((s, r) => s + r.capacity, 0)) * 100) : 0,
  }))

  // Revenue forecast
  const avg = revenueByMonth.length > 0 ? revenueByMonth.reduce((s, r) => s + r.income, 0) / revenueByMonth.length : 0
  const forecast = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1 + i)
    return { name: d.toLocaleDateString('en-US', { month: 'short' }), value: Math.round(avg * (1 + 0.02 * (i + 1))), forecast: true }
  })
  const baseForecast = revenueByMonth.slice(-3).map(r => ({ name: r.name.slice(5), value: r.income, forecast: false }))

  return {
    revenueByMonth: revenueByMonth.map(r => ({ name: r.name.slice(5), income: r.income, expected: r.expected, late: r.late })),
    occupancyByMonth: occupancyByMonth.map(o => ({ name: o.name.slice(5), occupancy: o.occupancy })),
    revenueForecast: [...baseForecast, ...forecast],
    genderDistribution: [
      { name: 'Female', value: Math.round(rooms.reduce((s, r) => s + r.occupied, 0) * 0.6) },
      { name: 'Male', value: Math.round(rooms.reduce((s, r) => s + r.occupied, 0) * 0.4) },
    ],
    schoolDistribution: [{ name: 'Siquijor State College', value: 1 }],
    roomOccupancy: rooms.map(r => ({ name: r.roomNo, occupied: r.occupied, capacity: r.capacity })),
    boarderGrowth: occupancyByMonth.map(o => ({ name: o.name.slice(5), boarders: Math.round((o.occupancy / 100) * rooms.reduce((s, r) => s + r.capacity, 0)) })),
    lateTrend: revenueByMonth.map(r => ({ name: r.name.slice(5), late: 0, overdue: 0 })),
    topRooms: rooms.map(r => ({ name: r.roomNo, revenue: r.monthlyRent * r.occupied })).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  }
}

/* ------------------------------------------------------------------ */
/*  Notifications / Subscription                                       */
/* ------------------------------------------------------------------ */
export async function getNotifications() {
  return fetchJSON<any[]>('/notifications')
}

export async function markNotificationsRead() {
  await fetchJSON('/notifications/read', { method: 'PUT', body: JSON.stringify({}) })
}

export async function getSubscription(): Promise<Subscription> {
  return fetchJSON<Subscription>('/subscription')
}

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */
export async function loginAPI(email: string, password: string) {
  return fetchJSON<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

/* ------------------------------------------------------------------ */
/*  AI (stub — will need a real AI integration later)                  */
/* ------------------------------------------------------------------ */
export async function askAssistant(question: string) {
  // Simple local response for now
  return {
    summary: `Based on the current data, here's what I found regarding "${question}". Connect a real AI API for more detailed insights.`,
    type: 'text' as const,
    suggested: ['Show revenue trend', 'List overdue payments', 'Room occupancy report'],
  }
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
export const PLANS: Subscription[] = [
  {
    plan: 'Starter', price: 100, cycle: 'month', status: 'active', renewsOn: '', boarderLimit: 5,
    features: ['Basic dashboard', 'Room management', 'Payment tracking', 'PDF reports'],
  },
  {
    plan: 'Standard', price: 200, cycle: 'month', status: 'active', renewsOn: '2026-08-28', boarderLimit: 15,
    features: ['Everything in Starter', 'Analytics & charts', 'AI Assistant', 'Smart notifications', 'Reviews management', 'Excel export'],
  },
  {
    plan: 'Premium', price: 500, cycle: 'year', status: 'active', renewsOn: '', boarderLimit: null,
    features: ['Everything unlocked', 'Unlimited boarders', 'Advanced analytics', 'Priority support', 'Unlimited storage', 'Future premium features'],
  },
]
