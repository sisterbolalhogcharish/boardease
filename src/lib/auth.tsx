import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { loginAPI } from './api'

export type UserRole = 'landlord' | 'boarder'

export interface AuthUser {
  id: number
  email: string
  name: string
  role: UserRole
  avatarColor: string
  phone?: string
}

interface AuthState {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
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
        phone: found.phone || undefined,
      }
      setUser(authUser)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message || 'Invalid email or password' }
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      login,
      logout,
      isLandlord: user?.role === 'landlord',
      isBoarder: user?.role === 'boarder',
    }),
    [user, login, logout],
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
