import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './lib/auth'
import { ProtectedRoute } from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import TenantLayout from './layouts/TenantLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/admin/DashboardPage'
import PropertiesPage from './pages/admin/PropertiesPage'
import RoomsPage from './pages/admin/RoomsPage'
import RegistrationsPage from './pages/admin/RegistrationsPage'
import RegistrationEditPage from './pages/admin/RegistrationEditPage'
import TenantsPage from './pages/admin/TenantsPage'
import PaymentsPage from './pages/admin/PaymentsPage'
import TicketsPage from './pages/admin/TicketsPage'
import StaffPage from './pages/admin/StaffPage'
import AnnouncementsPage from './pages/admin/AnnouncementsPage'
import ReportsPage from './pages/admin/ReportsPage'
import SettingsPage from './pages/admin/SettingsPage'
import TenantHomePage from './pages/tenant/TenantHomePage'
import TenantRoomPage from './pages/tenant/TenantRoomPage'
import TenantPaymentsPage from './pages/tenant/TenantPaymentsPage'
import {
  TenantTicketDetailPage,
  TenantTicketNewPage,
  TenantTicketsListPage,
} from './pages/tenant/TenantTicketsPage'
import TenantAnnouncementsPage from './pages/tenant/TenantAnnouncementsPage'
import TenantProfilePage from './pages/tenant/TenantProfilePage'
import { Skeleton } from './components/ui'

const STAFF_ROLES = [
  'org_admin',
  'property_manager',
  'maintenance_staff',
  'cleaning_staff',
  'accountant',
  'readonly_staff',
] as const

function HomeRedirect() {
  const { user, loading, isTenant, isStaff } = useAuth()
  if (loading) return <Skeleton className="m-8 h-40" />
  if (!user) return <Navigate to="/login" replace />
  if (isTenant) return <Navigate to="/tenant" replace />
  if (isStaff) return <Navigate to="/admin" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#F5F5F4',
            color: '#1C1917',
            border: '1px solid #D6D3D1',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register/:token" element={<RegisterPage />} />

        <Route element={<ProtectedRoute roles={[...STAFF_ROLES]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="properties" element={<PropertiesPage />} />
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="registrations" element={<RegistrationsPage />} />
            <Route path="registrations/edit" element={<RegistrationEditPage />} />
            <Route path="tenants" element={<TenantsPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['tenant']} />}>
          <Route path="/tenant" element={<TenantLayout />}>
            <Route index element={<TenantHomePage />} />
            <Route path="room" element={<TenantRoomPage />} />
            <Route path="payments" element={<TenantPaymentsPage />} />
            <Route path="tickets" element={<TenantTicketsListPage />} />
            <Route path="tickets/new" element={<TenantTicketNewPage />} />
            <Route path="tickets/:id" element={<TenantTicketDetailPage />} />
            <Route path="announcements" element={<TenantAnnouncementsPage />} />
            <Route path="profile" element={<TenantProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
