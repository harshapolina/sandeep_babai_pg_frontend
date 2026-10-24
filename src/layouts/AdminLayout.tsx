import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Building2,
  ClipboardList,
  CreditCard,
  FileBarChart,
  Home,
  LogOut,
  Megaphone,
  Menu,
  Search,
  Settings,
  Ticket,
  Users,
  UserCog,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import api from '../lib/api'
import { Button, cn } from '../components/ui'
import ChatBotWidget from '../components/ChatBotWidget'

const nav = [
  { to: '/admin', label: 'Dashboard', icon: Home, end: true },
  { to: '/admin/properties', label: 'Properties', icon: Building2 },
  { to: '/admin/rooms', label: 'Rooms & Beds', icon: ClipboardList },
  { to: '/admin/registrations', label: 'Registrations', icon: Users },
  { to: '/admin/tenants', label: 'Tenants', icon: Users },
  { to: '/admin/payments', label: 'Rent & Payments', icon: CreditCard },
  { to: '/admin/tickets', label: 'Maintenance', icon: Ticket },
  { to: '/admin/staff', label: 'Staff', icon: UserCog },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/admin/reports', label: 'Reports', icon: FileBarChart },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const lockPageScroll = location.pathname.startsWith('/admin/settings')

  useEffect(() => {
    api
      .get('/notifications')
      .then((r) => setUnread(r.data.unreadCount || 0))
      .catch(() => {})
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Fixed sidebar — never scrolls with page */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-[#FFFCFA] transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <div>
            <div className="font-display text-xl leading-none text-primary">Has Tracker</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-neutral">
              PG Management
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-raised lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                  isActive
                    ? 'bg-orange-50 text-primary before:absolute before:left-0 before:top-1/2 before:h-6 before:w-[3px] before:-translate-y-1/2 before:rounded-r before:bg-primary'
                    : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                )
              }
            >
              <item.icon size={18} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <div className="rounded-lg bg-surface px-3 py-2.5">
            <div className="truncate text-sm font-semibold text-text-primary">
              {user?.fullName}
            </div>
            <div className="truncate text-xs capitalize text-text-secondary">
              {user?.role?.replaceAll('_', ' ')}
            </div>
          </div>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-stone-900/35 backdrop-blur-[1px] lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      )}

      {/* Main column — sidebar + header fixed; content scrolls (except locked pages) */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:ml-64">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-text-secondary hover:bg-surface-raised lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="relative hidden max-w-md flex-1 md:block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral"
              size={16}
            />
            <input
              placeholder="Search tenants, rooms, tickets…"
              className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-[3px] focus:ring-primary/12"
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              className="relative rounded-lg p-2 text-text-secondary transition hover:bg-surface-raised hover:text-text-primary"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-background" />
              )}
            </button>
            <div className="hidden border-l border-border pl-3 text-right sm:block">
              <div className="text-sm font-semibold text-text-primary">{user?.fullName}</div>
              <div className="text-xs capitalize text-text-secondary">
                {user?.role?.replaceAll('_', ' ')}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>

        <main
          className={cn(
            'min-h-0 flex-1 p-4 sm:p-6',
            lockPageScroll ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
          )}
        >
          <Outlet />
        </main>
      </div>

      <ChatBotWidget variant="admin" />
    </div>
  )
}
