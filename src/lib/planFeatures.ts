/**
 * BoardEase — Plan Feature Flags
 *
 * Each plan tier unlocks a different subset of the landlord dashboard.
 * The PlanGate component and usePlanFeatures hook consume this config
 * to conditionally render UI elements.
 */

export type PlanName = 'none' | 'basic' | 'standard' | 'premium'

export interface PlanFeatures {
  /** Maximum number of boards (rooms) the landlord can manage */
  boarderLimit: number
  /** Monthly price in Philippine Pesos */
  price: number
  /** Billing cycle */
  cycle: 'month' | 'year'

  // ── Dashboard ──
  /** Show overview dashboard with stats cards */
  dashboard: boolean
  /** Show occupancy & revenue charts on overview */
  dashboardCharts: boolean

  // ── Rooms ──
  /** Allow managing rooms (add/edit/delete) */
  rooms: boolean

  // ── Boarders ──
  /** Allow managing boarders */
  boarders: boolean

  // ── Payments ──
  /** Allow viewing & marking payments */
  payments: boolean
  /** Show payment analytics breakdown */
  paymentAnalytics: boolean

  // ── Reservations ──
  /** Allow managing reservations */
  reservations: boolean

  // ── Messages ──
  /** Allow messaging boarders */
  messages: boolean

  // ── Analytics ──
  /** Show analytics page */
  analytics: boolean
  /** Show advanced analytics (forecast, trends, gender distribution) */
  analyticsAdvanced: boolean

  // ── Reports ──
  /** Show reports page */
  reports: boolean
  /** Show detailed reports (Excel export, trend analysis) */
  reportsAdvanced: boolean

  // ── Reviews ──
  /** Allow viewing & replying to reviews */
  reviews: boolean

  // ── AI Assistant ──
  /** Allow AI assistant access */
  aiAssistant: boolean

  // ── Smart Notifications ──
  /** Enable smart notification categories */
  smartNotifications: boolean

  // ── Data & Backup ──
  /** Allow data export */
  dataExport: boolean
  /** Allow data backup */
  dataBackup: boolean

  // ── Priority ──
  /** Priority support badge */
  prioritySupport: boolean

  // ── Management Controls ──
  /** Enhanced management controls */
  managementControls: boolean
}

export const PLAN_FEATURES: Record<PlanName, PlanFeatures> = {
  none: {
    boarderLimit: 0,
    price: 0,
    cycle: 'month',
    dashboard: false,
    dashboardCharts: false,
    rooms: false,
    boarders: false,
    payments: false,
    paymentAnalytics: false,
    reservations: false,
    messages: false,
    analytics: false,
    analyticsAdvanced: false,
    reports: false,
    reportsAdvanced: false,
    reviews: false,
    aiAssistant: false,
    smartNotifications: false,
    dataExport: false,
    dataBackup: false,
    prioritySupport: false,
    managementControls: false,
  },

  basic: {
    boarderLimit: 5,
    price: 199,
    cycle: 'month',
    // ── Core: YES ──
    dashboard: true,
    dashboardCharts: false,
    rooms: true,
    boarders: true,
    payments: true,
    paymentAnalytics: false,
    reservations: false,
    messages: true,
    analytics: false,
    analyticsAdvanced: false,
    reports: true,
    reportsAdvanced: false,
    reviews: false,
    aiAssistant: false,
    smartNotifications: false,
    dataExport: false,
    dataBackup: true,
    prioritySupport: false,
    managementControls: false,
  },

  standard: {
    boarderLimit: 15,
    price: 499,
    cycle: 'month',
    // ── Core: YES ──
    dashboard: true,
    dashboardCharts: true,
    rooms: true,
    boarders: true,
    payments: true,
    paymentAnalytics: true,
    reservations: true,
    messages: true,
    analytics: true,
    analyticsAdvanced: false,
    reports: true,
    reportsAdvanced: true,
    reviews: true,
    aiAssistant: true,
    smartNotifications: true,
    dataExport: true,
    dataBackup: true,
    prioritySupport: false,
    managementControls: false,
  },

  premium: {
    boarderLimit: 30,
    price: 899,
    cycle: 'month',
    // ── Everything: YES ──
    dashboard: true,
    dashboardCharts: true,
    rooms: true,
    boarders: true,
    payments: true,
    paymentAnalytics: true,
    reservations: true,
    messages: true,
    analytics: true,
    analyticsAdvanced: true,
    reports: true,
    reportsAdvanced: true,
    reviews: true,
    aiAssistant: true,
    smartNotifications: true,
    dataExport: true,
    dataBackup: true,
    prioritySupport: true,
    managementControls: true,
  },
}

/** Get the feature set for a plan name (case-insensitive, defaults to 'none'). */
export function getFeatures(plan: string | null | undefined): PlanFeatures {
  const key = (plan ?? 'none').toLowerCase() as PlanName
  return PLAN_FEATURES[key] ?? PLAN_FEATURES.none
}

/** Plan tier order for comparisons (higher index = more features). */
const PLAN_ORDER: PlanName[] = ['none', 'basic', 'standard', 'premium']

/** Check if `planA` has at least as many features as `planB`. */
export function planAtLeast(planA: string | null | undefined, planB: PlanName): boolean {
  const a = PLAN_ORDER.indexOf(((planA ?? 'none').toLowerCase()) as PlanName)
  const b = PLAN_ORDER.indexOf(planB)
  return a >= b
}

/** Human-readable plan display info. */
export const PLAN_INFO: Record<PlanName, { label: string; color: string; bgClass: string }> = {
  none: { label: 'No Plan', color: '#94A3B8', bgClass: 'bg-slate-100 text-slate-600' },
  basic: { label: 'Basic', color: '#1E73E8', bgClass: 'bg-brand-50 text-brand-600' },
  standard: { label: 'Standard', color: '#0B2D63', bgClass: 'bg-navy-50 text-navy-800' },
  premium: { label: 'Premium', color: '#33C7A5', bgClass: 'bg-mint-50 text-mint-600' },
}
