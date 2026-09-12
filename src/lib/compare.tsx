import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './auth'

/**
 * Boarder "Compare" selection.
 *
 * Comparison is a lightweight, transient discovery tool — it is NOT part of
 * the domain model (no house/room/user records are duplicated). The selection
 * is persisted per boarder account so refreshing the page keeps the tray, and
 * switching accounts never inherits another boarder's selection.
 */
export const MAX_COMPARE = 4

const storageKey = (userId?: number) => `boardease_compare_${userId ?? 'guest'}`

function load(userId?: number): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_COMPARE)
  } catch {
    return []
  }
}

function persist(userId: number | undefined, ids: string[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(ids))
  } catch {
    /* storage unavailable — comparison simply won't persist */
  }
}

export interface CompareState {
  ids: string[]
  count: number
  has: (houseId: string) => boolean
  /** Returns `limitReached` when the tray is already full. */
  toggle: (houseId: string) => { added: boolean; limitReached: boolean }
  remove: (houseId: string) => void
  clear: () => void
}

const CompareContext = createContext<CompareState | null>(null)

export function CompareProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [ids, setIds] = useState<string[]>(() => load(user?.id))

  // Re-hydrate whenever the signed-in account changes (login / logout / switch).
  useEffect(() => {
    setIds(load(user?.id))
  }, [user?.id])

  const commit = useCallback(
    (next: string[]) => {
      setIds(next)
      persist(user?.id, next)
    },
    [user?.id],
  )

  const toggle = useCallback(
    (houseId: string) => {
      if (ids.includes(houseId)) {
        commit(ids.filter((id) => id !== houseId))
        return { added: false, limitReached: false }
      }
      if (ids.length >= MAX_COMPARE) return { added: false, limitReached: true }
      commit([...ids, houseId])
      return { added: true, limitReached: false }
    },
    [ids, commit],
  )

  const value = useMemo<CompareState>(
    () => ({
      ids,
      count: ids.length,
      has: (houseId: string) => ids.includes(houseId),
      toggle,
      remove: (houseId: string) => commit(ids.filter((id) => id !== houseId)),
      clear: () => commit([]),
    }),
    [ids, toggle, commit],
  )

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
}

export function useCompare(): CompareState {
  const ctx = useContext(CompareContext)
  if (!ctx) throw new Error('useCompare must be used inside CompareProvider')
  return ctx
}
