import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, type UserRole } from '../lib/auth'
import { Skeleton } from './ui'

export function ProtectedRoute({
  roles,
}: {
  roles?: UserRole[]
}) {
  const { user, loading, isStaff, isTenant } = useAuth()

  if (loading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.role)) {
    if (isTenant) return <Navigate to="/tenant" replace />
    if (isStaff) return <Navigate to="/admin" replace />
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
