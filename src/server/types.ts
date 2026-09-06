/* ------------------------------------------------------------------ */
/*  BoardEase — domain types (shared between the mock server & UI)     */
/* ------------------------------------------------------------------ */

export type Gender = 'male' | 'female' | 'mixed'
export type RoomType = 'bedspace' | 'single' | 'double' | 'studio'
export type HouseStatus = 'available' | 'almost-full' | 'occupied' | 'full'
export type PaymentStatus = 'paid' | 'late' | 'pending' | 'overdue'
export type BoarderStatus = 'active' | 'notice' | 'expiring'

export interface BoardingHouse {
  id: string
  name: string
  tagline: string
  municipality: string
  barangay: string
  address: string
  schoolNearby: string[]
  images: string[]
  description: string
  rules: string[]
  visitorPolicy: string
  curfew: string
  monthlyRent: number
  roomTypes: RoomType[]
  gender: Gender
  totalRooms: number
  occupiedRooms: number
  wifi: boolean
  aircon: boolean
  kitchen: boolean
  laundry: boolean
  parking: boolean
  petFriendly: boolean
  rating: number
  reviewsCount: number
  owner: string
  ownerInitials: string
  verified: boolean
  topRated: boolean
  lat: number
  lng: number
  distanceFromSchool: string
  createdAt: string
}

export interface Room {
  id: string
  houseId: string
  roomNo: string
  type: RoomType
  capacity: number
  occupied: number
  monthlyRent: number
  gender: Gender
  aircon: boolean
  tenantIds: string[]
}

export interface Boarder {
  id: string
  houseId: string
  roomId: string
  name: string
  avatarColor: string
  age: number
  gender: 'male' | 'female'
  school: string
  course: string
  phone: string
  guardian: string
  address: string
  moveInDate: string
  contractEnd: string
  monthlyRent: number
  deposit: number
  advance: number
  status: BoarderStatus
  notes?: string
}

export interface Payment {
  id: string
  boarderId: string
  roomId: string
  houseId: string
  month: string
  label: string
  amount: number
  dueDate: string
  paidDate: string | null
  status: PaymentStatus
  method: string | null
  reference: string | null
}

export interface ReviewRating {
  cleanliness: number
  safety: number
  comfort: number
  internet: number
  owner: number
  location: number
  value: number
}

export interface Review {
  id: string
  houseId: string
  author: string
  avatarColor: string
  rating: number
  categories: ReviewRating
  comment: string
  date: string
  reply?: string
}

export interface Notification {
  id: string
  type: 'rent-due' | 'late' | 'contract' | 'vacant' | 'occupancy' | 'review' | 'subscription'
  title: string
  message: string
  date: string
  read: boolean
}

/* ----------------------------- AI -------------------------------- */

export type AIAnswerType = 'text' | 'table' | 'cards' | 'chart' | 'mixed'

export interface AICard {
  label: string
  value: string
  hint?: string
  tone?: 'green' | 'blue' | 'orange' | 'red' | 'navy'
}

export interface AIAnswer {
  summary: string
  type: AIAnswerType
  columns?: string[]
  rows?: (string | number)[][]
  cards?: AICard[]
  chart?: { kind: 'bar' | 'line' | 'area' | 'pie'; title: string; data: { name: string; value: number }[] }
  suggested?: string[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  answer?: AIAnswer
  createdAt: string
}

/* --------------------------- Analytics --------------------------- */

export interface AnalyticsData {
  revenueByMonth: { name: string; income: number; expected: number; late: number }[]
  occupancyByMonth: { name: string; occupancy: number }[]
  revenueForecast: { name: string; value: number; forecast: boolean }[]
  genderDistribution: { name: string; value: number }[]
  schoolDistribution: { name: string; value: number }[]
  roomOccupancy: { name: string; occupied: number; capacity: number }[]
  boarderGrowth: { name: string; boarders: number }[]
  lateTrend: { name: string; late: number; overdue: number }[]
  topRooms: { name: string; revenue: number }[]
}

export interface DashboardOverview {
  totalRooms: number
  occupiedRooms: number
  vacantRooms: number
  occupancyRate: number
  monthlyIncome: number
  expectedIncome: number
  lateCount: number
  paidThisMonth: number
  pendingAmount: number
  expiringContracts: number
  newBoardersThisMonth: number
  boarderCount: number
  genderSplit: { male: number; female: number }
  revenueTrend: { name: string; income: number; expected: number }[]
  occupancyTrend: { name: string; occupancy: number }[]
  roomStatus: { roomNo: string; type: RoomType; occupied: number; capacity: number; monthlyRent: number; tenantNames: string[]; aircon: boolean }[]
}

export interface Subscription {
  plan: 'Starter' | 'Standard' | 'Premium'
  price: number
  cycle: 'month' | 'year'
  status: 'active' | 'expiring'
  renewsOn: string
  boarderLimit: number | null
  features: string[]
}
