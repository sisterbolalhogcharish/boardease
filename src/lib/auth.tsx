import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { loginAPI, registerAPI } from './api'

export type UserRole = 'landlord' | 'boarder'

export interface AuthUser {
  id: number
  email: string
  name: string
  role: UserRole
  avatarColor: string
  /** Optional uploaded profile photo (data URL). Empty when not set. */
  avatarUrl?: string
  phone?: string
}

interface AuthResult {
  ok: boolean
  error?: string
  role?: UserRole
}

interface AuthState {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<AuthResult>
  /** Self-registration — creates a boarder account and signs it in. */
  register: (input: { name: string; email: string; password: string; phone?: string }) => Promise<AuthResult>
  logout: () => void
  /** Keep the signed-in profile in sync after an account-settings update. */
  updateUser: (patch: Partial<Record<keyof AuthUser | 'property', AuthUser[keyof AuthUser] | string | undefined>>) => void
  isLandlord: boolean
  isBoarder: boolean
}

const AuthContext = createContext<AuthState | null>(null)

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */
const STORAGE_KEY = 'boardease_auth'

function loadUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser)

  const login = useCallback(async (email: string, password: string) => {
    try {
      const found = await loginAPI(email, password)
      const authUser: AuthUser = {
        id: found.id,
        email: found.email,
        name: found.name,
        role: found.role,
        avatarColor: found.avatar_color || '#1E73E8',
        avatarUrl: found.avatar_url || undefined,
        phone: found.phone || undefined,
      }
      setUser(authUser)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
      return { ok: true, role: authUser.role }
    } catch (err: any) {
      return { ok: false, error: err.message || 'Something went wrong. Please try again.' }
    }
  }, [])

  const register = useCallback(
    async (input: { name: string; email: string; password: string; phone?: string }) => {
      try {
        const found = await registerAPI(input)
        const authUser: AuthUser = {
          id: found.id,
          email: found.email,
          name: found.name,
          role: found.role,
          avatarColor: found.avatar_color || '#1E73E8',
          avatarUrl: found.avatar_url || undefined,
          phone: found.phone || undefined,
        }
        setUser(authUser)
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
        return { ok: true, role: authUser.role }
      } catch (err: any) {
        return { ok: false, error: err.message || 'Something went wrong. Please try again.' }
      }
    },
    [],
  )

  const logout = useCallback(() => {
    setUser(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const updateUser = useCallback((patch: Record<string, unknown>) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch } as AuthUser
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      login,
      register,
      logout,
      updateUser,
      isLandlord: user?.role === 'landlord',
      isBoarder: user?.role === 'boarder',
    }),
    [user, login, register, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
