import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import api from './api'

export type UserRole =
  | 'org_admin'
  | 'property_manager'
  | 'maintenance_staff'
  | 'cleaning_staff'
  | 'accountant'
  | 'readonly_staff'
  | 'tenant'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  phone?: string
  role: UserRole
  organization: string
  notificationPreferences?: Record<string, boolean>
}

interface AuthState {
  user: AuthUser | null
  tenant: any | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  loginTenant: (email: string) => Promise<AuthUser>
  logout: () => void
  refresh: () => Promise<void>
  isStaff: boolean
  isAdmin: boolean
  isTenant: boolean
}

const AuthContext = createContext<AuthState | null>(null)

const STAFF_ROLES: UserRole[] = [
  'org_admin',
  'property_manager',
  'maintenance_staff',
  'cleaning_staff',
  'accountant',
  'readonly_staff',
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [tenant, setTenant] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('pg_token')
    if (!token) {
      setUser(null)
      setTenant(null)
      setLoading(false)
      return
    }
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
      setTenant(data.tenant)
      localStorage.setItem('pg_user', JSON.stringify(data.user))
    } catch {
      localStorage.removeItem('pg_token')
      localStorage.removeItem('pg_user')
      setUser(null)
      setTenant(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('pg_token', data.token)
    localStorage.setItem('pg_user', JSON.stringify(data.user))
    setUser(data.user)
    setTenant(data.tenant)
    return data.user as AuthUser
  }, [])

  const loginTenant = useCallback(async (email: string) => {
    const { data } = await api.post('/auth/tenant-login', { email })
    localStorage.setItem('pg_token', data.token)
    localStorage.setItem('pg_user', JSON.stringify(data.user))
    setUser(data.user)
    setTenant(data.tenant)
    return data.user as AuthUser
  }, [])

  const logout = useCallback(() => {
    const wasTenant = user?.role === 'tenant'
    localStorage.removeItem('pg_token')
    localStorage.removeItem('pg_user')
    setUser(null)
    setTenant(null)
    window.location.href = wasTenant ? '/tenant/login' : '/login'
  }, [user?.role])

  const value = useMemo(
    () => ({
      user,
      tenant,
      loading,
      login,
      loginTenant,
      logout,
      refresh,
      isStaff: !!user && STAFF_ROLES.includes(user.role),
      isAdmin: user?.role === 'org_admin',
      isTenant: user?.role === 'tenant',
    }),
    [user, tenant, loading, login, loginTenant, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
