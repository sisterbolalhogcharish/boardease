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
  let res
  try {
    res = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch (err: any) {
    const msg = err?.message?.toLowerCase() ?? ''
    if (msg.includes('failed to fetch') || msg.includes('connection') || msg.includes('network')) {
      throw new Error('The API server is not running. Start it with npm run dev and try again.')
    }
    throw new Error('Network error. Please check your connection and try again.')
  }
  if (!res.ok) {
    // Prefer the JSON `error` the API sends. Some failures (a route that is not
    // registered on the running server, a proxy error) answer with HTML, so the
    // raw `res.json()` would throw and mask the real reason.
    const body = (await res.json().catch(() => null)) as { error?: unknown } | null
    if (body && typeof body.error === 'string') throw new Error(body.error)
    if (res.status === 404) {
      throw new Error('This feature is not available on the running API server yet. Restart it (npm run dev) and try again.')
    }
    const statusText = res.statusText || '';
    if (statusText.toLowerCase().includes('gateway')) {
      throw new Error('The server is having trouble right now. Please try again in a moment or restart the API server (npm run dev).')
    }
    throw new Error(res.statusText || `Request failed (${res.status})`)
  }
  return res.json()
}

/* ------------------------------------------------------------------ */
/*  Search                                                             */
/* ------------------------------------------------------------------ */
export interface SearchFilters {
  /** Free-text search across public boarding-house information. */
  q?: string
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
  landlordId?: string
  ownerUserId?: string
}

export async function getHouses(filters?: SearchFilters, sort: SortKey = 'recommended'): Promise<HouseCard[]> {
  const params = new URLSearchParams()
  if (filters) {
    if (filters.q && filters.q.trim()) params.set('q', filters.q.trim())
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
export async function getNotifications(userId?: string) {
  const qs = userId ? `?userId=${encodeURIComponent(userId)}` : ''
  return fetchJSON<AppNotification[]>(`/notifications${qs}`)
}

export async function markNotificationsRead(userId?: string) {
  await fetchJSON('/notifications/read', { method: 'PUT', body: JSON.stringify({ userId }) })
}

export async function markNotificationRead(id: string, userId: string) {
  await fetchJSON(`/notifications/${id}/read`, { method: 'PUT', body: JSON.stringify({ userId }) })
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

export interface RegisterInput {
  name: string
  email: string
  password: string
  phone?: string
  role?: 'boarder'
}

export async function registerAPI(input: RegisterInput) {
  return fetchJSON<any>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...input, role: input.role ?? 'boarder' }),
  })
}

/* ------------------------------------------------------------------ */
/*  Landlord sign-up                                                   */
/* ------------------------------------------------------------------ */
export interface LandlordDoc {
  docType: 'valid_id' | 'business_permit' | 'sec_registration' | 'other' | 'legal_documents'
  docName: string
  docUrl: string
}

export interface LandlordRegisterInput {
  email: string
  password: string
  fullName: string
  mobileNumber: string
  locationPref: string
  locationLat?: number
  locationLng?: number
  documents: LandlordDoc[]
}

export async function registerLandlordAPI(input: LandlordRegisterInput) {
  return fetchJSON<any>('/auth/landlord-register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/* ------------------------------------------------------------------ */
/*  Boarder — shared DTOs                                              */
/* ------------------------------------------------------------------ */
export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  date: string
  read: boolean
}

export interface PublicRoom {
  id: string
  roomNo: string
  type: 'bedspace' | 'single' | 'double' | 'studio'
  capacity: number
  occupied: number
  available: number
  monthlyRent: number
  gender: string
  aircon: boolean
  status: 'available' | 'full'
}

export interface Accommodation {
  rentalId: string
  houseId: string
  houseName: string
  address: string
  municipality: string
  barangay: string
  roomId: string
  roomNo: string
  roomType: string
  roomGender: string
  roomCapacity: number
  monthlyRent: number
  deposit: number
  advance: number
  moveInDate: string
  contractEnd: string
  rentalStatus: string
  notes: string
  curfew: string
  visitorPolicy: string
  description: string
  lat: number
  lng: number
  amenities: string[]
  owner: string
  ownerPhone: string
  nextPayment: {
    month: string
    label: string
    amount: number
    dueDate: string
    status: PaymentStatus
  } | null
}

export interface BoarderPayment {
  id: string
  month: string
  label: string
  amount: number
  dueDate: string
  paidDate: string | null
  status: PaymentStatus
  method: string | null
  reference: string | null
}

export interface BoarderReview {
  id: string
  houseId: string
  houseName: string
  houseImage: string
  author: string
  avatarColor: string
  /** Uploaded profile photo (data URL) — empty when the boarder has none. */
  avatarUrl?: string
  rating: number
  categories: {
    cleanliness: number
    safety: number
    comfort: number
    internet: number
    owner: number
    location: number
    value: number
  }
  comment: string
  date: string
  reply: string | null
}

export interface FavoriteItem {
  favoriteAt: string
  house: HouseCard
}

export type ReservationStatus = 'pending' | 'approved' | 'declined' | 'cancelled'

export interface Reservation {
  id: string
  houseId: string
  houseName: string
  houseImage: string
  municipality: string
  barangay: string
  roomId: string | null
  roomNo: string | null
  roomType: string | null
  monthlyRent: number
  moveInDate: string
  durationMonths: number | null
  message: string | null
  status: ReservationStatus
  ownerResponse: string | null
  createdAt: string
  decidedAt: string | null
  boarderName: string
  boarderPhone: string
  accommodationAttached?: boolean
}

export interface Conversation {
  id: string
  houseId: string
  houseName: string
  houseImage: string
  boarderId: string
  ownerUserId: string
  boarderName: string
  ownerName: string
  title: string
  viewerIsBoarder: boolean
  lastMessage: string
  lastMessageAt: string | null
  unreadCount: number
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  mine: boolean
  body: string
  isRead: boolean
  createdAt: string
}

export interface ConversationThread {
  conversation: Conversation
  messages: ChatMessage[]
}

export interface BoarderProfile {
  id: string
  name: string
  email: string
  phone: string
  avatarColor: string
  avatarUrl: string
  role: string
  memberSince: string
  age: number | null
  gender: string
  school: string
  course: string
  guardianName: string
  guardianPhone: string
  address: string
}

/* ------------------------------------------------------------------ */
/*  Boarder — accommodation, payments, reviews                         */
/* ------------------------------------------------------------------ */
export async function getAccommodation(userId: string): Promise<Accommodation | null> {
  return fetchJSON<Accommodation | null>(`/boarder/accommodation?userId=${encodeURIComponent(userId)}`)
}

export async function getBoarderPayments(userId: string): Promise<BoarderPayment[]> {
  return fetchJSON<BoarderPayment[]>(`/boarder/payments?userId=${encodeURIComponent(userId)}`)
}

export async function getBoarderReviews(userId: string): Promise<BoarderReview[]> {
  return fetchJSON<BoarderReview[]>(`/boarder/reviews?userId=${encodeURIComponent(userId)}`)
}

export async function saveReview(input: {
  userId: string
  houseId: string
  rating: number
  comment: string
  categories?: Record<string, number>
}): Promise<{ ok: boolean; updated: boolean }> {
  return fetchJSON<{ ok: boolean; updated: boolean }>('/boarder/reviews', { method: 'POST', body: JSON.stringify(input) })
}

export async function getBoarderProfile(userId: string): Promise<BoarderProfile> {
  return fetchJSON<BoarderProfile>(`/boarder/profile?userId=${encodeURIComponent(userId)}`)
}

export async function updateBoarderProfile(patch: Partial<BoarderProfile> & { userId: string }): Promise<{ ok: boolean }> {
  return fetchJSON<{ ok: boolean }>('/boarder/profile', { method: 'PUT', body: JSON.stringify(patch) })
}

/* ------------------------------------------------------------------ */
/*  Boarder — favorites                                                */
/* ------------------------------------------------------------------ */
export async function getFavorites(userId: string): Promise<FavoriteItem[]> {
  return fetchJSON<FavoriteItem[]>(`/favorites?userId=${encodeURIComponent(userId)}`)
}

export async function addFavorite(userId: string, houseId: string): Promise<{ ok: boolean }> {
  return fetchJSON<{ ok: boolean }>('/favorites', { method: 'POST', body: JSON.stringify({ userId, houseId }) })
}

export async function removeFavorite(userId: string, houseId: string): Promise<{ ok: boolean }> {
  return fetchJSON<{ ok: boolean }>(`/favorites/${houseId}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
}

/* ------------------------------------------------------------------ */
/*  Boarder — public rooms                                             */
/* ------------------------------------------------------------------ */
export async function getPublicRooms(houseId: string): Promise<PublicRoom[]> {
  return fetchJSON<PublicRoom[]>(`/houses/${houseId}/rooms`)
}

/* ------------------------------------------------------------------ */
/*  Boarder — reservations                                             */
/* ------------------------------------------------------------------ */
export async function getReservations(userId: string): Promise<Reservation[]> {
  return fetchJSON<Reservation[]>(`/reservations?userId=${encodeURIComponent(userId)}`)
}

export async function getOwnerReservations(ownerId: string): Promise<Reservation[]> {
  return fetchJSON<Reservation[]>(`/reservations?ownerId=${encodeURIComponent(ownerId)}`)
}

export async function createReservation(input: {
  userId: string
  houseId: string
  roomId?: string | null
  moveInDate: string
  durationMonths?: number | null
  message?: string
}): Promise<Reservation> {
  return fetchJSON<Reservation>('/reservations', { method: 'POST', body: JSON.stringify(input) })
}

export async function cancelReservation(id: string, userId: string): Promise<Reservation> {
  return fetchJSON<Reservation>(`/reservations/${id}/cancel`, { method: 'PUT', body: JSON.stringify({ userId }) })
}

export async function respondToReservation(
  id: string,
  ownerId: string,
  status: 'approved' | 'declined',
  response?: string,
): Promise<Reservation> {
  return fetchJSON<Reservation>(`/reservations/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ownerId, status, response }),
  })
}

/* ------------------------------------------------------------------ */
/*  Boarder — messages                                                 */
/* ------------------------------------------------------------------ */
export async function getConversations(userId: string): Promise<Conversation[]> {
  return fetchJSON<Conversation[]>(`/conversations?userId=${encodeURIComponent(userId)}`)
}

export async function startConversation(input: { userId: string; houseId: string; body?: string }): Promise<Conversation> {
  return fetchJSON<Conversation>('/conversations', { method: 'POST', body: JSON.stringify(input) })
}

export async function getConversationThread(id: string, userId: string): Promise<ConversationThread> {
  return fetchJSON<ConversationThread>(`/conversations/${id}/messages?userId=${encodeURIComponent(userId)}`)
}

export async function sendMessage(id: string, userId: string, body: string): Promise<ChatMessage> {
  return fetchJSON<ChatMessage>(`/conversations/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ userId, body }),
  })
}

export async function markConversationRead(id: string, userId: string): Promise<{ ok: boolean }> {
  return fetchJSON<{ ok: boolean }>(`/conversations/${id}/read`, { method: 'PUT', body: JSON.stringify({ userId }) })
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
