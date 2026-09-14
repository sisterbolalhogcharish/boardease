import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as api from './api'
import { useAuth } from './auth'

/* ------------------------------------------------------------------ */
/*  The signed-in landlord's own boarding house                        */
/* ------------------------------------------------------------------ */

/**
 * One boarding house per landlord.
 *
 * This provider fetches it once for the whole landlord console and exposes the
 * id that owner-scoped queries should use. Without it, every dashboard screen
 * quietly read the seeded Sunset Boarding House, so a brand-new landlord saw
 * somebody else's name, house and numbers.
 *
 * Data-fetching lives here rather than in `hooks.ts` on purpose: `hooks.ts`
 * imports this hook to scope its queries, and a component file importing
 * `hooks.ts` back would be a cycle.
 */
export interface LandlordHouseState {
  /** Signed-in landlord's user id — the scope owner-facing queries use. */
  userId: number | undefined
  /** Their boarding house, or null until they create one. */
  house: api.LandlordHouse | null
  landlord: api.LandlordHouseResponse['landlord']
  /** Location captured at sign-up, used to prefill the create form. */
  suggested: api.LandlordHouseResponse['suggested']
  /** True while the first fetch is in flight — gates owner-scoped queries so
   *  they never fire unscoped and briefly show another house's data. */
  loading: boolean
  refetch: () => void
}

const LandlordHouseContext = createContext<LandlordHouseState>({
  userId: undefined,
  house: null,
  landlord: null,
  suggested: null,
  loading: false,
  refetch: () => {},
})

export function useLandlordHouse(): LandlordHouseState {
  return useContext(LandlordHouseContext)
}

export function LandlordHouseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.role === 'landlord' ? user.id : undefined

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['landlord-house', userId],
    queryFn: () => api.getLandlordHouse(userId!),
    enabled: !!userId,
  })

  const value = useMemo<LandlordHouseState>(
    () => ({
      userId,
      house: data?.house ?? null,
      landlord: data?.landlord ?? null,
      suggested: data?.suggested ?? null,
      loading: !!userId && isLoading,
      refetch: () => {
        void refetch()
      },
    }),
    [userId, data, isLoading, refetch],
  )

  return <LandlordHouseContext.Provider value={value}>{children}</LandlordHouseContext.Provider>
}
