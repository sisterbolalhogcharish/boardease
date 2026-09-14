import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useSubscription } from '../../lib/hooks'
import { type PlanFeatures, type PlanName, getFeatures, PLAN_INFO, PLAN_FEATURES } from '../../lib/planFeatures'
import { cn } from '../../lib/utils'
import { Lock, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/* ------------------------------------------------------------------ */
/*  Context & hook                                                     */
/* ------------------------------------------------------------------ */

interface PlanState {
  /** Raw plan name from the API (e.g. 'Basic', 'Standard', 'Premium') */
  planName: string | null
  /** Normalized lowercase plan key */
  planKey: PlanName
  /** Feature flags for the current plan */
  features: PlanFeatures
  /** Whether the subscription query is still loading */
  loading: boolean
}

const PlanContext = createContext<PlanState>({
  planName: null,
  planKey: 'none',
  features: PLAN_FEATURES.none,
  loading: true,
})

export function PlanProvider({ children }: { children: ReactNode }) {
  const { data: subscription, isLoading } = useSubscription()

  const value = useMemo<PlanState>(() => {
    const planName = subscription?.plan ?? null
    const planKey: PlanName = (planName?.toLowerCase() ?? 'none') as PlanName
    const features = getFeatures(planKey)
    return { planName, planKey, features, loading: isLoading }
  }, [subscription, isLoading])

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

/** Access the current plan's feature flags. */
export function usePlanFeatures(): PlanState {
  return useContext(PlanContext)
}

/* ------------------------------------------------------------------ */
/*  PlanGate — conditionally render children based on feature          */
/* ------------------------------------------------------------------ */

/**
 * Renders `children` only if the landlord's plan includes `feature`.
 * Otherwise renders an upgrade CTA (or nothing if `fallback` is null).
 */
export function PlanGate({
  feature,
  children,
  fallback,
}: {
  feature: keyof PlanFeatures
  children: ReactNode
  fallback?: ReactNode | null
}) {
  const { features, loading } = usePlanFeatures()

  if (loading) return null
  if (features[feature]) return <>{children}</>

  if (fallback === null) return null

  // Default upgrade prompt
  return fallback !== undefined ? (
    <>{fallback}</>
  ) : (
    <UpgradePrompt feature={feature} />
  )
}

/* ------------------------------------------------------------------ */
/*  UpgradePrompt — shown when a feature is locked                     */
/* ------------------------------------------------------------------ */

function featureLabel(key: keyof PlanFeatures): string {
  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    dashboardCharts: 'Dashboard Charts',
    rooms: 'Room Management',
    boarders: 'Boarder Management',
    payments: 'Payment Tracking',
    paymentAnalytics: 'Payment Analytics',
    reservations: 'Reservations',
    messages: 'Messages',
    analytics: 'Analytics',
    analyticsAdvanced: 'Advanced Analytics',
    reports: 'Reports',
    reportsAdvanced: 'Advanced Reports',
    reviews: 'Reviews',
    aiAssistant: 'AI Assistant',
    smartNotifications: 'Smart Notifications',
    dataExport: 'Data Export',
    dataBackup: 'Data Backup',
    prioritySupport: 'Priority Support',
    managementControls: 'Management Controls',
  }
  return labels[key] ?? key
}

/** Find the cheapest plan that includes this feature. */
function requiredPlanFor(feature: keyof PlanFeatures): PlanName {
  const tiers: PlanName[] = ['basic', 'standard', 'premium']
  for (const tier of tiers) {
    if (PLAN_FEATURES[tier][feature]) return tier
  }
  return 'premium'
}

export function UpgradePrompt({
  feature,
  compact,
}: {
  feature: keyof PlanFeatures
  compact?: boolean
}) {
  const needed = requiredPlanFor(feature)
  const info = PLAN_INFO[needed]

  if (compact) {
    return (
      <Link
        to="/dashboard/subscription"
        className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-100"
      >
        <Lock size={12} />
        Upgrade to {info.label} to unlock
      </Link>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-slate-200 bg-white/60 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Lock size={20} />
      </div>
      <p className="font-semibold text-navy-800">{featureLabel(feature)} is not available on your current plan</p>
      <p className="mt-1 max-w-sm text-sm text-ink">
        Upgrade to <span className="font-semibold">{info.label}</span> to unlock this feature and more.
      </p>
      <Link
        to="/dashboard/subscription"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgb(30_115_232/0.3)] transition hover:-translate-y-0.5 hover:bg-brand-600"
      >
        View Plans <ArrowRight size={15} />
      </Link>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  PlanBadge — small badge showing current plan                       */
/* ------------------------------------------------------------------ */

export function PlanBadge({ className }: { className?: string }) {
  const { planKey, loading } = usePlanFeatures()
  if (loading) return null
  const info = PLAN_INFO[planKey]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold', info.bgClass, className)}>
      {info.label}
    </span>
  )
}
