import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  CreditCard,
  DoorOpen,
  Home,
  LogOut,
  Megaphone,
  Ticket,
  User,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { cn } from '../components/ui'

const nav = [
  { to: '/tenant', label: 'Home', icon: Home, end: true },
  { to: '/tenant/room', label: 'My Room', icon: DoorOpen },
  { to: '/tenant/payments', label: 'Payments', icon: CreditCard },
  { to: '/tenant/tickets', label: 'Tickets', icon: Ticket },
  { to: '/tenant/announcements', label: 'Notices', icon: Megaphone },
  { to: '/tenant/profile', label: 'Profile', icon: User },
]

export default function TenantLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-lg text-primary">Has Tracker</div>
            <div className="text-xs text-text-secondary">Hi, {user?.fullName?.split(' ')[0]}</div>
          </div>
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-text-secondary" />
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="rounded-lg p-2 text-text-secondary hover:bg-surface-raised"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="p-4">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-6">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 px-1 py-2 text-[10px] font-semibold',
                  isActive ? 'text-primary' : 'text-text-secondary'
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
