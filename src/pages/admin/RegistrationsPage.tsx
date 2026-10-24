import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  BedDouble,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Pencil,
  Phone,
  Users,
} from 'lucide-react'
import api from '../../lib/api'
import {
  Badge,
  Button,
  EmptyState,
  Modal,
  Skeleton,
} from '../../components/ui'
import { useAuth } from '../../lib/auth'

type RoomCard = {
  _id: string
  roomNumber: string
  floorName?: string
  beds: any[]
}

export default function RegistrationsPage() {
  const { isAdmin } = useAuth()
  const [form, setForm] = useState<any>(null)
  const [url, setUrl] = useState('')
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [assignOpen, setAssignOpen] = useState(false)
  const [roomsLoading, setRoomsLoading] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [rooms, setRooms] = useState<RoomCard[]>([])
  const [floorFilter, setFloorFilter] = useState('all')
  const [bedId, setBedId] = useState('')
  const [assigning, setAssigning] = useState(false)

  const stats = useMemo(() => {
    const need = submissions.filter(
      (s) => s.needsBed || (!s.assignment && (s.tenant || s.status === 'pending'))
    ).length
    const assigned = submissions.filter((s) => s.assignment).length
    return { total: submissions.length, need, assigned }
  }, [submissions])

  const floors = useMemo(
    () => Array.from(new Set(rooms.map((r) => r.floorName || 'Other'))),
    [rooms]
  )

  const visibleRooms = useMemo(() => {
    if (floorFilter === 'all') return rooms
    return rooms.filter((r) => (r.floorName || 'Other') === floorFilter)
  }, [rooms, floorFilter])

  const selectedBed = useMemo(() => {
    for (const r of rooms) {
      const b = r.beds.find((x) => x._id === bedId)
      if (b) return { ...b, roomNumber: r.roomNumber }
    }
    return null
  }, [rooms, bedId])

  async function load() {
    setLoading(true)
    try {
      const [f, s] = await Promise.all([
        api.get('/registrations/form'),
        api.get('/registrations/submissions', { params: { limit: 40 } }),
      ])
      setForm(f.data.data)
      setUrl(`${window.location.origin}/register/${f.data.data.token}`)
      setSubmissions(s.data.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message))
  }, [])

  async function copyLink() {
    await navigator.clipboard.writeText(url)
    toast.success('Link copied')
  }

  async function openAssign(s: any) {
    setSelected(s)
    setBedId('')
    setFloorFilter('all')
    setAssignOpen(true)
    setRoomsLoading(true)
    try {
      const propertyId = s.property?._id || s.property
      const { data } = await api.get('/rooms', { params: { propertyId } })
      setRooms(
        (data.data || [])
          .map((r: any) => ({
            _id: r._id,
            roomNumber: r.roomNumber,
            floorName: r.floor?.name,
            beds: (r.beds || []).filter((b: any) => b.status === 'available'),
          }))
          .filter((r: RoomCard) => r.beds.length > 0)
      )
    } catch (err: any) {
      toast.error(err.message)
      setRooms([])
    } finally {
      setRoomsLoading(false)
    }
  }

  async function assignBed() {
    if (!selected || !bedId) return
    setAssigning(true)
    try {
      await api.post(`/registrations/submissions/${selected._id}/assign-bed`, {
        bedId,
        moveInDate: new Date().toISOString(),
      })
      toast.success(
        `Assigned Room ${selectedBed?.roomNumber} · Bed ${
          selectedBed?.label || selectedBed?.bedNumber
        }`
      )
      setAssignOpen(false)
      setSelected(null)
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-3">
        <Skeleton className="h-9 w-52" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] leading-none tracking-tight text-text-primary">
            Registrations
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Share the form · assign room & bed when someone joins
          </p>
        </div>
        {isAdmin && (
          <Link to="/admin/registrations/edit">
            <Button size="sm" variant="secondary">
              <Pencil size={14} />
              Edit form
            </Button>
          </Link>
        )}
      </div>

      {/* Compact stats + link row */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Applications" value={stats.total} />
        <Stat label="Need a bed" value={stats.need} />
        <Stat label="Assigned" value={stats.assigned} />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5">
        <Link2 size={15} className="shrink-0 text-neutral" />
        <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-text-secondary">
          {url}
        </code>
        <Badge tone={form?.isActive ? 'success' : 'neutral'}>
          {form?.isActive ? 'Live' : 'Off'}
        </Badge>
        <Button size="sm" variant="secondary" onClick={copyLink}>
          <Copy size={13} />
          Copy
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink size={13} />
          Open
        </Button>
      </div>

      {/* Applications — denser table-like list */}
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Users size={15} className="text-neutral" />
            Applications
          </div>
          <span className="text-xs text-neutral">{stats.total} total</span>
        </div>

        {!submissions.length ? (
          <div className="p-6">
            <EmptyState
              title="No applications yet"
              description="Copy the public link and share it. New tenants appear here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {submissions.map((s) => {
              const needs =
                s.needsBed ||
                (!s.assignment && (s.tenant || s.status === 'pending'))
              return (
                <li
                  key={s._id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-stone-50/80"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-text-primary">
                    {(s.fullName || '?')
                      .split(' ')
                      .map((p: string) => p[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-text-primary">
                      {s.fullName}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
                      <span>{s.property?.name || '—'}</span>
                      {s.phone && (
                        <>
                          <span className="text-border">·</span>
                          <a
                            href={`tel:${s.phone}`}
                            className="inline-flex items-center gap-1 hover:text-text-primary"
                          >
                            <Phone size={10} />
                            {s.phone}
                          </a>
                        </>
                      )}
                      {s.assignment && (
                        <>
                          <span className="text-border">·</span>
                          <span>
                            R{s.assignment.roomNumber} · B{s.assignment.bedNumber}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge tone={needs ? 'warning' : 'success'}>
                    {needs ? 'Needs bed' : 'Assigned'}
                  </Badge>
                  {needs && isAdmin && (
                    <Button size="sm" onClick={() => openAssign(s)}>
                      <BedDouble size={13} />
                      Assign
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign room & bed"
        wide
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <div className="text-sm font-semibold text-text-primary">
              {selected?.fullName}
            </div>
            <div className="text-xs text-text-secondary">{selected?.property?.name}</div>
          </div>
          {selectedBed ? (
            <div className="rounded-md border border-border bg-stone-50 px-2.5 py-1 text-xs font-semibold text-text-primary">
              Selected · Room {selectedBed.roomNumber} ·{' '}
              {selectedBed.label || `Bed ${selectedBed.bedNumber}`}
            </div>
          ) : (
            <div className="text-xs text-neutral">Tap a free bed below</div>
          )}
        </div>

        {floors.length > 1 && (
          <div className="mb-3 flex gap-1 overflow-x-auto">
            <FloorTab
              active={floorFilter === 'all'}
              onClick={() => setFloorFilter('all')}
              label="All"
            />
            {floors.map((f) => (
              <FloorTab
                key={f}
                active={floorFilter === f}
                onClick={() => setFloorFilter(f)}
                label={f}
              />
            ))}
          </div>
        )}

        {roomsLoading ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : !visibleRooms.length ? (
          <EmptyState
            title="No free beds"
            description="Every bed in this property is taken."
          />
        ) : (
          <div className="grid max-h-[48vh] gap-2 overflow-y-auto sm:grid-cols-2">
            {visibleRooms.map((room) => (
              <div
                key={room._id}
                className="rounded-xl border border-border bg-[#FFFCFA] p-3"
              >
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-text-primary">
                    Room {room.roomNumber}
                  </span>
                  {room.floorName && (
                    <span className="text-[11px] text-neutral">{room.floorName}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {room.beds.map((bed) => {
                    const active = bedId === bed._id
                    return (
                      <button
                        key={bed._id}
                        type="button"
                        onClick={() => setBedId(bed._id)}
                        className={`inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition ${
                          active
                            ? 'bg-text-primary text-white'
                            : 'border border-border bg-white text-text-secondary hover:border-text-primary/40 hover:text-text-primary'
                        }`}
                      >
                        {active && <Check size={11} />}
                        {bed.label || `Bed ${bed.bedNumber}`}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="secondary" onClick={() => setAssignOpen(false)}>
            Cancel
          </Button>
          <Button onClick={assignBed} disabled={!bedId || assigning}>
            {assigning ? 'Assigning…' : 'Confirm assign'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral">
        {label}
      </div>
      <div className="mt-0.5 text-2xl font-semibold tabular-nums text-text-primary">
        {value}
      </div>
    </div>
  )
}

function FloorTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
        active
          ? 'bg-text-primary text-white'
          : 'text-text-secondary hover:bg-stone-100 hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  )
}
