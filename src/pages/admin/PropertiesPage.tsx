import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Building2,
  LayoutGrid,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
} from 'lucide-react'
import api from '../../lib/api'
import {
  Button,
  EmptyState,
  Input,
  Modal,
  Skeleton,
  Textarea,
  formatINR,
} from '../../components/ui'
import PropertySetupWizard from '../../components/PropertySetupWizard'
import { useAuth } from '../../lib/auth'

export default function PropertiesPage() {
  const { isAdmin } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'live' | 'inactive' | 'occupied' | 'vacant'>('all')
  const [form, setForm] = useState({
    name: '',
    address: '',
    contactPhone: '',
    contactEmail: '',
    description: '',
    facilities: '',
    defaultRentAmount: '9000',
    defaultDepositAmount: '18000',
  })

  const filterCounts = useMemo(() => {
    const live = items.filter((p) => p.isActive).length
    const inactive = items.filter((p) => !p.isActive).length
    const occupied = items.filter((p) => (p.stats?.occupied || 0) > 0).length
    const vacant = items.filter(
      (p) => p.isActive && (p.stats?.occupied || 0) === 0 && (p.stats?.beds || 0) > 0
    ).length
    return {
      all: items.length,
      live,
      inactive,
      occupied,
      vacant,
    }
  }, [items])

  const filteredItems = useMemo(() => {
    switch (filter) {
      case 'live':
        return items.filter((p) => p.isActive)
      case 'inactive':
        return items.filter((p) => !p.isActive)
      case 'occupied':
        return items.filter((p) => (p.stats?.occupied || 0) > 0)
      case 'vacant':
        return items.filter(
          (p) => p.isActive && (p.stats?.occupied || 0) === 0 && (p.stats?.beds || 0) > 0
        )
      default:
        return items
    }
  }, [items, filter])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/properties')
      setItems(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message))
  }, [])

  useEffect(() => {
    function close() {
      setMenuId(null)
    }
    if (menuId) {
      window.addEventListener('click', close)
      return () => window.removeEventListener('click', close)
    }
  }, [menuId])

  function openEdit(p: any) {
    setMenuId(null)
    setEditing(p)
    setForm({
      name: p.name || '',
      address: p.address || '',
      contactPhone: p.contactPhone || '',
      contactEmail: p.contactEmail || '',
      description: p.description || '',
      facilities: (p.facilities || []).join(', '),
      defaultRentAmount: String(p.defaultRentAmount || 0),
      defaultDepositAmount: String(p.defaultDepositAmount || 0),
    })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    const payload = {
      ...form,
      facilities: form.facilities.split(',').map((s) => s.trim()).filter(Boolean),
      defaultRentAmount: Number(form.defaultRentAmount),
      defaultDepositAmount: Number(form.defaultDepositAmount),
    }
    try {
      await api.patch(`/properties/${editing._id}`, payload)
      toast.success('Property updated')
      setEditing(null)
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function toggleActive(p: any) {
    setMenuId(null)
    try {
      await api.patch(`/properties/${p._id}`, { isActive: !p.isActive })
      toast.success(p.isActive ? 'Property deactivated' : 'Property activated')
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  function initials(name: string) {
    return name
      .replace(/^PG\s*/i, '')
      .split(/[\s—–-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('')
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Heading only on one line */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-primary ring-1 ring-primary/10">
            <Building2 size={16} />
          </div>
          <h1 className="font-display text-[28px] leading-none tracking-tight text-text-primary">
            Properties
          </h1>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setWizardOpen(true)}
            className="shrink-0 shadow-[0_4px_12px_rgba(194,65,12,0.18)]"
          >
            <Plus size={16} />
            Add property
          </Button>
        )}
      </div>

      {/* Metric-style filter cards */}
      {!loading && items.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              { key: 'all', label: 'Properties', value: filterCounts.all },
              { key: 'live', label: 'Live', value: filterCounts.live },
              {
                key: 'occupied',
                label: 'Occupied',
                value: filterCounts.occupied,
                hint:
                  items.reduce((n, p) => n + (p.stats?.beds || 0), 0) > 0
                    ? `${Math.round(
                        (items.reduce((n, p) => n + (p.stats?.occupied || 0), 0) /
                          items.reduce((n, p) => n + (p.stats?.beds || 0), 0)) *
                          100
                      )}%`
                    : '0%',
              },
              { key: 'vacant', label: 'Vacant', value: filterCounts.vacant },
            ] as const
          ).map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-xl border px-4 py-3.5 text-left transition ${
                  active
                    ? 'border-primary bg-orange-50 shadow-[0_4px_12px_rgba(194,65,12,0.12)] ring-1 ring-primary/20'
                    : 'border-border bg-[#FFFCFA] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_20px_rgba(28,25,23,0.06)]'
                }`}
              >
                <div
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    active ? 'text-primary' : 'text-neutral'
                  }`}
                >
                  {f.label}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums text-text-primary">
                    {f.value}
                  </span>
                  {'hint' in f && f.hint && (
                    <span className="text-sm text-text-secondary">{f.hint}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[168px] rounded-xl" />
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState
          title="No properties yet"
          description="Create your first PG with floors, rooms, and beds in one setup."
          action={
            isAdmin ? (
              <Button onClick={() => setWizardOpen(true)}>
                <Plus size={16} />
                Add property
              </Button>
            ) : undefined
          }
        />
      ) : (
        filteredItems.length === 0 ? (
        <EmptyState
          title="No properties match this filter"
          description="Try another filter to see more properties."
          action={
            <Button variant="secondary" onClick={() => setFilter('all')}>
              Show all
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((p) => {
            const occ = p.stats?.occupancyPct || 0
            return (
              <article
                key={p._id}
                className="group relative flex flex-col rounded-xl border border-border bg-[#FFFCFA] p-4 transition duration-150 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_10px_28px_rgba(28,25,23,0.07)]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 text-sm font-semibold text-primary ring-1 ring-primary/10">
                    {initials(p.name) || 'PG'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-base font-semibold leading-snug text-text-primary">
                        {p.name}
                      </h3>
                      <span
                        className={`mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                          p.isActive
                            ? 'bg-emerald-50 text-success'
                            : 'bg-stone-100 text-neutral'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            p.isActive ? 'bg-success' : 'bg-neutral'
                          }`}
                        />
                        {p.isActive ? 'Live' : 'Off'}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-sm text-text-secondary">
                      <MapPin size={13} className="shrink-0 opacity-70" />
                      <span className="truncate">{p.address}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 grid grid-cols-3 gap-2 rounded-lg border border-border/80 bg-background/80 px-3 py-2.5 text-center">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral">
                      Floors
                    </div>
                    <div className="mt-0.5 text-lg font-semibold text-text-primary">
                      {p.stats?.floors || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral">
                      Rooms
                    </div>
                    <div className="mt-0.5 text-lg font-semibold text-text-primary">
                      {p.stats?.rooms || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral">
                      Beds
                    </div>
                    <div className="mt-0.5 text-lg font-semibold text-text-primary">
                      {p.stats?.occupied || 0}/{p.stats?.beds || 0}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Occupancy</span>
                    <span className="font-semibold tabular-nums text-text-primary">{occ}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-stone-200/80">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.min(100, occ)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-sm text-text-secondary">
                    Month revenue{' '}
                    <span className="font-semibold text-text-primary">
                      {formatINR(p.stats?.monthlyRevenue)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-3">
                  <Link to={`/admin/rooms?propertyId=${p._id}`} className="min-w-0 flex-1">
                    <Button size="sm" className="w-full">
                      <LayoutGrid size={15} />
                      Manage layout
                    </Button>
                  </Link>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        title="Edit details"
                        onClick={() => openEdit(p)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition hover:bg-surface-raised hover:text-text-primary"
                      >
                        <Pencil size={14} />
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          title="More"
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuId(menuId === p._id ? null : p._id)
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition hover:bg-surface-raised hover:text-text-primary"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {menuId === p._id && (
                          <div
                            className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-background py-1 shadow-[0_12px_28px_rgba(28,25,23,0.12)]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                              onClick={() => toggleActive(p)}
                            >
                              <Power size={13} />
                              {p.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )
      )}

      <Modal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="New property setup"
        extraWide
      >
        <PropertySetupWizard
          onClose={() => setWizardOpen(false)}
          onCreated={load}
        />
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit property details"
        wide
      >
        <p className="mb-4 text-sm text-text-secondary">
          Layout changes (floors, rooms, beds) stay on the room board. Bed numbers remain fixed.
        </p>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Contact phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
          <Input label="Address" className="md:col-span-2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
          <Input label="Contact email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          <Input label="Facilities (comma separated)" value={form.facilities} onChange={(e) => setForm({ ...form, facilities: e.target.value })} />
          <Input label="Default rent" type="number" value={form.defaultRentAmount} onChange={(e) => setForm({ ...form, defaultRentAmount: e.target.value })} />
          <Input label="Default deposit" type="number" value={form.defaultDepositAmount} onChange={(e) => setForm({ ...form, defaultDepositAmount: e.target.value })} />
          <div className="md:col-span-2">
            <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
