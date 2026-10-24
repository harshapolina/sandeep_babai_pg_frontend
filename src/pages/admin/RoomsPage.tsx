import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  BedDouble,
  ChevronRight,
  Layers,
  Plus,
  Search,
  Trash2,
  UserRound,
  Wrench,
  X,
} from 'lucide-react'
import api from '../../lib/api'
import {
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  Skeleton,
  Textarea,
  formatINR,
} from '../../components/ui'
import { useAuth } from '../../lib/auth'

type BedFilter = 'all' | 'available' | 'occupied' | 'reserved' | 'maintenance'

const STATUS: Record<
  string,
  { label: string; bar: string; soft: string; text: string; ring: string }
> = {
  available: {
    label: 'Available',
    bar: 'bg-emerald-500',
    soft: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    text: 'text-emerald-700',
    ring: 'ring-emerald-500/30',
  },
  occupied: {
    label: 'Occupied',
    bar: 'bg-sky-500',
    soft: 'bg-sky-50 text-sky-800 border-sky-100',
    text: 'text-sky-700',
    ring: 'ring-sky-500/30',
  },
  reserved: {
    label: 'Reserved',
    bar: 'bg-amber-500',
    soft: 'bg-amber-50 text-amber-900 border-amber-100',
    text: 'text-amber-700',
    ring: 'ring-amber-500/30',
  },
  maintenance: {
    label: 'Maintenance',
    bar: 'bg-rose-400',
    soft: 'bg-rose-50 text-rose-800 border-rose-100',
    text: 'text-rose-700',
    ring: 'ring-rose-500/30',
  },
}

function bedName(bed: any) {
  return bed.currentTenant?.fullName || bed.label || `Bed ${bed.bedNumber}`
}

export default function RoomsPage() {
  const { isAdmin } = useAuth()
  const [params, setParams] = useSearchParams()
  const [properties, setProperties] = useState<any[]>([])
  const [floors, setFloors] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [propertyId, setPropertyId] = useState(params.get('propertyId') || '')
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [bedFilter, setBedFilter] = useState<BedFilter>('all')
  const [activeFloor, setActiveFloor] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [floorOpen, setFloorOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [occupiedOpen, setOccupiedOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [selectedBed, setSelectedBed] = useState<any>(null)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [tenants, setTenants] = useState<any[]>([])
  const [transferBedId, setTransferBedId] = useState('')
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const initialLoad = useRef(true)
  const [sharingPrices, setSharingPrices] = useState<Record<string, number>>({
    single: 15000,
    double: 12000,
    triple: 10000,
    quad: 8000,
    dorm: 6000,
    other: 9000,
  })
  const [form, setForm] = useState({
    floorId: '',
    roomNumber: '',
    capacity: '2',
    rentAmount: '12000',
    roomType: 'double',
    description: '',
    amenities: 'Fan, Wardrobe, Study Table',
  })
  const [floorForm, setFloorForm] = useState({ name: '', level: '0' })
  const [assignForm, setAssignForm] = useState({
    tenantId: '',
    moveInDate: '',
    rentAmount: '',
  })

  function rentForType(roomType: string, capacity?: string | number) {
    const type = String(roomType || '').toLowerCase()
    if (sharingPrices[type] != null) return sharingPrices[type]
    const cap = Number(capacity) || 0
    if (cap <= 1) return sharingPrices.single
    if (cap === 2) return sharingPrices.double
    if (cap === 3) return sharingPrices.triple
    if (cap === 4) return sharingPrices.quad
    if (cap >= 5) return sharingPrices.dorm
    return sharingPrices.other
  }

  const bedCounts = useMemo(() => {
    const allBeds = rooms.flatMap((r) => r.beds || [])
    return {
      all: allBeds.length,
      available: allBeds.filter((b: any) => b.status === 'available').length,
      occupied: allBeds.filter((b: any) => b.status === 'occupied').length,
      reserved: allBeds.filter((b: any) => b.status === 'reserved').length,
      maintenance: allBeds.filter((b: any) => b.status === 'maintenance').length,
    }
  }, [rooms])

  const visibleRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (activeFloor !== 'all' && r.floor?._id !== activeFloor) return false
      if (bedFilter === 'all') return true
      return (r.beds || []).some((b: any) => b.status === bedFilter)
    })
  }, [rooms, activeFloor, bedFilter])

  const roomsByFloor = useMemo(() => {
    const map: Record<string, any[]> = {}
    visibleRooms.forEach((r) => {
      const beds =
        bedFilter === 'all'
          ? r.beds || []
          : (r.beds || []).filter((b: any) => b.status === bedFilter)
      const key = r.floor?._id || 'unknown'
      if (!map[key]) map[key] = []
      map[key].push({ ...r, beds })
    })
    return map
  }, [visibleRooms, bedFilter])

  // Debounce search — avoid refetch on every keystroke
  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 320)
    return () => window.clearTimeout(t)
  }, [q])

  async function loadProperties() {
    const { data } = await api.get('/properties')
    setProperties(data.data || [])
    if (!propertyId && data.data?.[0]?._id) {
      setPropertyId(data.data[0]._id)
    }
  }

  const loadRooms = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!propertyId) return
      const silent = opts?.silent || !initialLoad.current
      if (silent) setRefreshing(true)
      else setLoading(true)
      try {
        const [{ data: roomData }, { data: floorData }] = await Promise.all([
          api.get('/rooms', { params: { propertyId, q: qDebounced || undefined } }),
          api.get(`/properties/${propertyId}/floors`),
        ])
        setRooms(roomData.data || [])
        setFloors(floorData.data || [])
        initialLoad.current = false
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [propertyId, qDebounced]
  )

  useEffect(() => {
    loadProperties().catch((e) => toast.error(e.message))
    api
      .get('/settings')
      .then((r) => {
        const sp = r.data.data?.settings?.sharingPrices
        if (sp) {
          setSharingPrices((prev) => ({ ...prev, ...sp }))
          setForm((f) => ({
            ...f,
            rentAmount: String(
              sp[f.roomType] ?? sp.double ?? f.rentAmount
            ),
          }))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!propertyId) return
    setParams({ propertyId }, { replace: true })
    initialLoad.current = true
    loadRooms({ silent: false }).catch((e) => toast.error(e.message))
  }, [propertyId])

  useEffect(() => {
    if (!propertyId || initialLoad.current) return
    loadRooms({ silent: true }).catch((e) => toast.error(e.message))
  }, [qDebounced])

  async function refreshQuiet() {
    await loadRooms({ silent: true })
    if (detail?._id) {
      const { data } = await api.get(`/rooms/${detail._id}`)
      setDetail(data.data)
    }
  }

  async function createFloor(e: FormEvent) {
    e.preventDefault()
    try {
      await api.post(`/properties/${propertyId}/floors`, {
        name: floorForm.name,
        level: Number(floorForm.level),
      })
      toast.success('Floor added')
      setFloorOpen(false)
      setFloorForm({ name: '', level: '0' })
      await refreshQuiet()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function createRoom(e: FormEvent) {
    e.preventDefault()
    const capacity = Math.max(1, Number(form.capacity) || 1)
    try {
      await api.post('/rooms', {
        propertyId,
        floorId: form.floorId,
        roomNumber: form.roomNumber,
        capacity,
        rentAmount: Number(form.rentAmount),
        roomType: form.roomType,
        description: form.description,
        amenities: form.amenities.split(',').map((s) => s.trim()).filter(Boolean),
      })
      toast.success(`Room created with Bed 1–${capacity}`)
      setCreateOpen(false)
      await refreshQuiet()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function addBed(roomId: string, opts?: { openSidebar?: boolean }) {
    if (!isAdmin) return
    const beforeCount =
      rooms.find((r) => r._id === roomId)?.beds?.length ||
      (detail?._id === roomId ? detail.beds?.length : 0) ||
      0
    try {
      const { data } = await api.post(`/rooms/${roomId}/beds`, {})
      toast.success(data.message || `Bed ${data.data.bedNumber} added`)
      await refreshQuiet()
      // 5th bed and beyond → manage from the right sidebar
      if (opts?.openSidebar || beforeCount >= 4) {
        await openRoomDetail(roomId)
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  function renumberBedsLocal(beds: any[], removeId: string) {
    return beds
      .filter((b) => b._id !== removeId)
      .sort(
        (a, b) =>
          (parseInt(String(a.bedNumber), 10) || 0) - (parseInt(String(b.bedNumber), 10) || 0)
      )
      .map((b, i) => {
        const num = String(i + 1)
        const label =
          !b.label || /^Bed\s+\d+$/i.test(String(b.label)) ? `Bed ${num}` : b.label
        return { ...b, bedNumber: num, label }
      })
  }

  function patchRoomBeds(roomId: string, nextBeds: any[]) {
    const stats = {
      total: nextBeds.length,
      occupied: nextBeds.filter((b) => b.status === 'occupied').length,
      available: nextBeds.filter((b) => b.status === 'available').length,
      reserved: nextBeds.filter((b) => b.status === 'reserved').length,
      maintenance: nextBeds.filter((b) => b.status === 'maintenance').length,
    }
    setRooms((prev) =>
      prev.map((r) =>
        r._id === roomId ? { ...r, beds: nextBeds, bedStats: stats, capacity: nextBeds.length } : r
      )
    )
    setDetail((d: any) =>
      d && d._id === roomId ? { ...d, beds: nextBeds, capacity: nextBeds.length } : d
    )
  }

  async function removeBed(bed: any, room: any) {
    if (!isAdmin) return
    if (bed.status === 'occupied') {
      toast.error('Transfer or check out the tenant first')
      return
    }
    if ((room.bedStats?.total || room.beds?.length || 0) <= 1) {
      toast.error('Each room must keep at least 1 bed')
      return
    }
    if (!window.confirm(`Remove Bed ${bed.bedNumber}? Remaining beds will renumber.`)) return

    const roomId = room._id
    const prevRooms = rooms
    const prevDetail = detail
    const sourceBeds =
      (detail?._id === roomId ? detail.beds : null) ||
      rooms.find((r) => r._id === roomId)?.beds ||
      room.beds ||
      []
    // Instant UI update — don't wait for the network
    patchRoomBeds(roomId, renumberBedsLocal(sourceBeds, bed._id))

    try {
      const { data } = await api.delete(`/rooms/beds/${bed._id}`)
      if (data.data?.beds) {
        patchRoomBeds(roomId, data.data.beds)
      }
      toast.success(data.message || 'Bed removed')
    } catch (err: any) {
      setRooms(prevRooms)
      setDetail(prevDetail)
      toast.error(err.message)
    }
  }

  async function openAssign(bed: any, room: any) {
    setSelectedBed(bed)
    setSelectedRoom(room)
    const { data } = await api.get('/tenants', {
      params: { propertyId, status: 'pending', limit: 50 },
    })
    const activeRes = await api.get('/tenants', { params: { limit: 50 } })
    setTenants([...(data.data || []), ...(activeRes.data.data || [])])
    setAssignForm({
      tenantId: '',
      moveInDate: new Date().toISOString().slice(0, 10),
      rentAmount: String(bed.rentAmount || room.rentAmount || ''),
    })
    setAssignOpen(true)
  }

  function onBedClick(bed: any, room: any) {
    if (!isAdmin) return
    setSelectedBed(bed)
    setSelectedRoom(room)
    if (bed.status === 'available') {
      openAssign(bed, room)
      return
    }
    if (bed.status === 'occupied') {
      setOccupiedOpen(true)
      return
    }
    if (bed.status === 'reserved' || bed.status === 'maintenance') {
      setBedStatus(bed._id, 'available')
    }
  }

  async function assignTenant(e: FormEvent) {
    e.preventDefault()
    try {
      await api.post(`/tenants/${assignForm.tenantId}/assign`, {
        bedId: selectedBed._id,
        moveInDate: assignForm.moveInDate,
        rentAmount: Number(assignForm.rentAmount),
      })
      toast.success('Tenant assigned')
      setAssignOpen(false)
      await refreshQuiet()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function checkoutOccupied() {
    const tenantId = selectedBed?.currentTenant?._id || selectedBed?.currentTenant
    if (!tenantId) {
      toast.error('No tenant found on this bed')
      return
    }
    if (!window.confirm(`Check out ${selectedBed?.currentTenant?.fullName || 'tenant'}?`)) return
    try {
      await api.post(`/tenants/${tenantId}/checkout`)
      toast.success('Tenant checked out — bed is available')
      setOccupiedOpen(false)
      await refreshQuiet()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  function openTransfer() {
    setTransferBedId('')
    setOccupiedOpen(false)
    setTransferOpen(true)
  }

  async function transferTenant(e: FormEvent) {
    e.preventDefault()
    const tenantId = selectedBed?.currentTenant?._id || selectedBed?.currentTenant
    if (!tenantId || !transferBedId) return
    try {
      await api.post(`/tenants/${tenantId}/transfer`, {
        bedId: transferBedId,
        moveInDate: new Date().toISOString(),
        rentAmount: selectedBed?.rentAmount || selectedRoom?.rentAmount,
      })
      toast.success('Tenant transferred')
      setTransferOpen(false)
      await refreshQuiet()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function setBedStatus(bedId: string, status: string) {
    try {
      await api.patch(`/rooms/beds/${bedId}/status`, { status })
      toast.success(`Marked ${status}`)
      await refreshQuiet()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const availableBedsForTransfer = useMemo(() => {
    return rooms.flatMap((r) =>
      (r.beds || [])
        .filter((b: any) => b.status === 'available' && b._id !== selectedBed?._id)
        .map((b: any) => ({ ...b, roomNumber: r.roomNumber }))
    )
  }, [rooms, selectedBed])

  async function openRoomDetail(id: string) {
    setDetailLoading(true)
    try {
      const { data } = await api.get(`/rooms/${id}`)
      setDetail(data.data)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const selectedProperty = properties.find((p) => p._id === propertyId)
  const occupancyPct =
    bedCounts.all > 0 ? Math.round((bedCounts.occupied / bedCounts.all) * 100) : 0

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral">
            Operations
          </p>
          <h1 className="font-display text-[30px] leading-none tracking-tight text-text-primary">
            Rooms & beds
          </h1>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {refreshing && (
            <span className="text-xs text-neutral animate-pulse">Updating…</span>
          )}
          <Select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="min-w-48 !py-2"
          >
            {properties.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Room #"
              className="h-10 w-28 rounded-lg border border-border bg-white/80 pl-8 pr-3 text-sm outline-none transition focus:border-primary"
            />
          </div>
          {isAdmin && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setFloorOpen(true)}>
                <Layers size={14} />
                Floor
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setForm((f) => ({
                    ...f,
                    floorId: floors[0]?._id || '',
                    rentAmount: String(
                      rentForType(f.roomType, f.capacity) ||
                        selectedProperty?.defaultRentAmount ||
                        12000
                    ),
                  }))
                  setCreateOpen(true)
                }}
              >
                <Plus size={14} />
                Room
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Compact occupancy strip — Linear/Stripe style */}
      {!loading && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-white via-[#FFFCFA] to-stone-50">
          <div className="flex flex-wrap items-center gap-4 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BedDouble size={18} />
              </div>
              <div>
                <div className="text-xs text-text-secondary">Occupancy</div>
                <div className="text-lg font-semibold tabular-nums leading-none text-text-primary">
                  {occupancyPct}%
                  <span className="ml-1.5 text-xs font-normal text-neutral">
                    {bedCounts.occupied}/{bedCounts.all} beds
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden h-8 w-px bg-border sm:block" />

            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'available', label: 'Free' },
                  { key: 'occupied', label: 'Taken' },
                  { key: 'reserved', label: 'Held' },
                  { key: 'maintenance', label: 'Maint.' },
                ] as const
              ).map((f) => {
                const active = bedFilter === f.key
                const count = bedCounts[f.key]
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setBedFilter(f.key)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
                      active
                        ? 'bg-text-primary text-white'
                        : 'bg-white/70 text-text-secondary ring-1 ring-border hover:text-text-primary'
                    }`}
                  >
                    {f.label}
                    <span
                      className={`tabular-nums ${
                        active ? 'text-white/70' : 'text-neutral'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex h-1.5 w-full overflow-hidden bg-stone-100">
            {bedCounts.all > 0 && (
              <>
                <div
                  className="bg-sky-500 transition-all"
                  style={{ width: `${(bedCounts.occupied / bedCounts.all) * 100}%` }}
                />
                <div
                  className="bg-amber-400 transition-all"
                  style={{ width: `${(bedCounts.reserved / bedCounts.all) * 100}%` }}
                />
                <div
                  className="bg-rose-400 transition-all"
                  style={{ width: `${(bedCounts.maintenance / bedCounts.all) * 100}%` }}
                />
                <div
                  className="bg-emerald-400 transition-all"
                  style={{ width: `${(bedCounts.available / bedCounts.all) * 100}%` }}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Floor tabs */}
      {!loading && floors.length > 0 && (
        <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveFloor('all')}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              activeFloor === 'all'
                ? 'bg-white text-text-primary shadow-sm ring-1 ring-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All floors
          </button>
          {floors.map((floor) => (
            <button
              key={floor._id}
              type="button"
              onClick={() => setActiveFloor(floor._id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                activeFloor === floor._id
                  ? 'bg-white text-text-primary shadow-sm ring-1 ring-border'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {floor.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[232px] rounded-2xl" />
          ))}
        </div>
      ) : !rooms.length ? (
        <EmptyState
          title="No rooms yet"
          description="Add a floor and room, or set up the full layout from Properties."
        />
      ) : visibleRooms.length === 0 ? (
        <EmptyState
          title="Nothing matches"
          description="Try another floor or status filter."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setBedFilter('all')
                setActiveFloor('all')
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-7">
          {(activeFloor === 'all' ? floors : floors.filter((f) => f._id === activeFloor)).map(
            (floor) => {
              const floorRooms = roomsByFloor[floor._id] || []
              if (!floorRooms.length) return null
              return (
                <section key={floor._id}>
                  <div className="mb-3 flex items-baseline gap-2">
                    <h2 className="text-[13px] font-semibold tracking-wide text-text-primary">
                      {floor.name}
                    </h2>
                    <span className="text-xs text-neutral">{floorRooms.length} rooms</span>
                    <div className="h-px flex-1 bg-border/80" />
                  </div>

                  {/* Fixed card size for ≤4 beds; 5th+ opens sidebar via “+N more” */}
                  <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {floorRooms.map((room) => {
                      const allBeds = room.beds || []
                      const occupied = allBeds.filter((b: any) => b.status === 'occupied').length
                      const total = room.bedStats?.total || allBeds.length
                      const free = allBeds.filter((b: any) => b.status === 'available').length
                      const overflow = allBeds.length > 4
                      // Fit exactly 4 rows: 4 beds, or 3 beds + “+N more”
                      const visibleBeds = overflow ? allBeds.slice(0, 3) : allBeds
                      const moreCount = overflow ? allBeds.length - 3 : 0

                      return (
                        <article
                          key={room._id}
                          className="group flex h-[232px] flex-col rounded-2xl border border-border bg-white transition hover:border-primary/35 hover:shadow-[0_8px_24px_-12px_rgba(28,25,23,0.18)]"
                        >
                          <button
                            type="button"
                            onClick={() => openRoomDetail(room._id)}
                            className="flex w-full shrink-0 items-start justify-between gap-2 px-3.5 pt-3.5 text-left"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[15px] font-semibold text-text-primary">
                                  Room {room.roomNumber}
                                </span>
                                <ChevronRight
                                  size={14}
                                  className="text-neutral opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                                />
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-text-secondary">
                                <span className="capitalize">{room.roomType}</span>
                                <span className="text-border">·</span>
                                <span className="tabular-nums">
                                  {occupied}/{total} filled
                                </span>
                                {free > 0 && (
                                  <>
                                    <span className="text-border">·</span>
                                    <span className="text-emerald-600">{free} free</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {isAdmin && (
                              <span
                                role="button"
                                tabIndex={0}
                                title={
                                  allBeds.length >= 4
                                    ? 'Add bed (opens panel)'
                                    : 'Add bed'
                                }
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // 5th+ bed → add and open right sidebar
                                  addBed(room._id, {
                                    openSidebar: allBeds.length >= 4,
                                  })
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.stopPropagation()
                                    addBed(room._id, {
                                      openSidebar: allBeds.length >= 4,
                                    })
                                  }
                                }}
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary transition hover:border-primary/40 hover:text-primary"
                              >
                                <Plus size={14} />
                              </span>
                            )}
                          </button>

                          <div className="mx-3.5 mt-2.5 h-1 shrink-0 overflow-hidden rounded-full bg-stone-100">
                            <div
                              className="h-full rounded-full bg-sky-500 transition-all"
                              style={{
                                width: total ? `${(occupied / total) * 100}%` : '0%',
                              }}
                            />
                          </div>

                          {/* Exactly 4 row slots — no clipping, no scrollbar */}
                          <div className="mt-2.5 grid grid-rows-4 gap-1 px-3.5 pb-3.5">
                            {visibleBeds.map((bed: any) => {
                              const st = STATUS[bed.status] || STATUS.available
                              return (
                                <div
                                  key={bed._id}
                                  className={`flex h-8 w-full items-center gap-2 rounded-lg border px-2 ${st.soft}`}
                                >
                                  <button
                                    type="button"
                                    title={st.label}
                                    onClick={() => onBedClick(bed, room)}
                                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.bar}`}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">
                                      {bedName(bed)}
                                    </span>
                                  </button>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      title="Delete bed"
                                      onClick={() => removeBed(bed, room)}
                                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-current/50 transition hover:bg-black/5 hover:text-current"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                            {moreCount > 0 && (
                              <button
                                type="button"
                                onClick={() => openRoomDetail(room._id)}
                                className="flex h-8 w-full items-center justify-between rounded-lg border border-dashed border-primary/25 bg-orange-50/70 px-2 text-[11px] font-semibold text-primary transition hover:border-primary/50 hover:bg-orange-50"
                              >
                                <span>+{moreCount} more beds</span>
                                <ChevronRight size={12} />
                              </button>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>
              )
            }
          )}
        </div>
      )}

      {/* Room detail — right sidebar */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-stone-900/30 backdrop-blur-[3px] transition"
            onClick={() => setDetail(null)}
          />
          <aside className="relative flex h-full w-full max-w-[420px] flex-col border-l border-border bg-[#FFFCFA] shadow-[-24px_0_48px_-24px_rgba(28,25,23,0.25)]">
            <div className="relative overflow-hidden border-b border-border bg-white px-5 pb-4 pt-5">
              <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/5" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral">
                    {detail?.floor?.name || 'Room details'}
                  </p>
                  <h3 className="mt-1 font-display text-[28px] leading-none tracking-tight text-text-primary">
                    {detail ? `Room ${detail.roomNumber}` : 'Loading…'}
                  </h3>
                  {detail && (
                    <p className="mt-1.5 text-sm capitalize text-text-secondary">
                      {detail.roomType} · {formatINR(detail.rentAmount)}/mo
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="rounded-xl border border-border bg-white p-2 text-neutral transition hover:border-primary/30 hover:text-text-primary"
                >
                  <X size={16} />
                </button>
              </div>

              {detail && (
                <div className="relative mt-4 grid grid-cols-3 gap-2">
                  {[
                    {
                      label: 'Beds',
                      value: detail.beds?.length || 0,
                      tone: 'text-text-primary',
                    },
                    {
                      label: 'Taken',
                      value: (detail.beds || []).filter((b: any) => b.status === 'occupied')
                        .length,
                      tone: 'text-sky-700',
                    },
                    {
                      label: 'Free',
                      value: (detail.beds || []).filter((b: any) => b.status === 'available')
                        .length,
                      tone: 'text-emerald-700',
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-border bg-[#FFFCFA] px-3 py-2.5"
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral">
                        {s.label}
                      </div>
                      <div className={`mt-0.5 text-xl font-semibold tabular-nums ${s.tone}`}>
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {detailLoading && !detail ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-32 rounded-xl" />
                </div>
              ) : detail ? (
                <div className="space-y-6">
                  {detail.description && (
                    <p className="text-sm leading-relaxed text-text-secondary">
                      {detail.description}
                    </p>
                  )}

                  {(detail.amenities || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(detail.amenities || []).map((a: string) => (
                        <span
                          key={a}
                          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-text-secondary ring-1 ring-border"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-text-primary">All beds</h4>
                      <span className="text-xs text-neutral">
                        Tap a bed to assign or manage
                      </span>
                    </div>
                    <div className="space-y-2">
                      {(detail.beds || []).map((bed: any) => {
                        const st = STATUS[bed.status] || STATUS.available
                        return (
                          <div
                            key={bed._id}
                            className="rounded-2xl border border-border bg-white p-3 shadow-[0_1px_0_rgba(28,25,23,0.04)] transition hover:border-primary/25"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${st.soft}`}
                              >
                                {bed.status === 'occupied' ? (
                                  <UserRound size={15} />
                                ) : bed.status === 'maintenance' ? (
                                  <Wrench size={15} />
                                ) : (
                                  <BedDouble size={15} />
                                )}
                              </div>
                              <button
                                type="button"
                                className="min-w-0 flex-1 text-left"
                                onClick={() => {
                                  setDetail(null)
                                  onBedClick(bed, detail)
                                }}
                              >
                                <div className="truncate text-sm font-semibold text-text-primary">
                                  {bedName(bed)}
                                </div>
                                <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                                  <span className={`h-1.5 w-1.5 rounded-full ${st.bar}`} />
                                  <span className={st.text}>{st.label}</span>
                                  <span className="text-border">·</span>
                                  <span className="text-neutral">Bed {bed.bedNumber}</span>
                                </div>
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  title="Delete bed"
                                  onClick={() => removeBed(bed, detail)}
                                  className="rounded-lg p-2 text-neutral transition hover:bg-rose-50 hover:text-rose-600"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            {bed.currentTenant?.phone && (
                              <div className="mt-2 border-t border-border/70 pt-2 pl-12 text-[11px] text-text-secondary">
                                {bed.currentTenant.phone}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-text-primary">
                      Occupancy history
                    </h4>
                    <div className="space-y-2">
                      {(detail.history || []).map((h: any) => (
                        <div
                          key={h._id}
                          className="rounded-2xl border border-border bg-white px-3.5 py-3 text-sm"
                        >
                          <div className="font-semibold text-text-primary">
                            {h.tenant?.fullName}
                          </div>
                          <div className="mt-0.5 text-xs text-text-secondary">
                            Bed {h.bed?.bedNumber} ·{' '}
                            {new Date(h.moveInDate).toLocaleDateString('en-IN')}
                            {h.moveOutDate
                              ? ` → ${new Date(h.moveOutDate).toLocaleDateString('en-IN')}`
                              : ' · active'}
                          </div>
                        </div>
                      ))}
                      {!detail.history?.length && (
                        <p className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-sm text-text-secondary">
                          No history yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {isAdmin && detail && (
              <div className="border-t border-border bg-white px-5 py-4">
                <Button className="w-full" onClick={() => addBed(detail._id)}>
                  <Plus size={16} />
                  Add another bed
                </Button>
              </div>
            )}
          </aside>
        </div>
      )}

      <Modal open={floorOpen} onClose={() => setFloorOpen(false)} title="Add floor">
        <form className="space-y-4" onSubmit={createFloor}>
          <Input
            label="Name"
            value={floorForm.name}
            onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
            required
          />
          <Input
            label="Level (0 = ground)"
            type="number"
            value={floorForm.level}
            onChange={(e) => setFloorForm({ ...floorForm, level: e.target.value })}
            required
          />
          <Button type="submit" className="w-full">
            Create floor
          </Button>
        </form>
      </Modal>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add room" wide>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={createRoom}>
          <Select
            label="Floor"
            value={form.floorId}
            onChange={(e) => setForm({ ...form, floorId: e.target.value })}
            required
          >
            <option value="">Select floor</option>
            {floors.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name}
              </option>
            ))}
          </Select>
          <Input
            label="Room number"
            value={form.roomNumber}
            onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
            required
          />
          <Select
            label="Type"
            value={form.roomType}
            onChange={(e) => {
              const roomType = e.target.value
              const capacity =
                roomType === 'single'
                  ? '1'
                  : roomType === 'double'
                    ? '2'
                    : roomType === 'triple'
                      ? '3'
                      : roomType === 'quad'
                        ? '4'
                        : form.capacity
              setForm({
                ...form,
                roomType,
                capacity,
                rentAmount: String(rentForType(roomType, capacity)),
              })
            }}
          >
            <option value="single">1 sharing (single)</option>
            <option value="double">2 sharing</option>
            <option value="triple">3 sharing</option>
            <option value="quad">4 sharing</option>
            <option value="dorm">5+ / dorm</option>
          </Select>
          <Input
            label="Beds (min 1)"
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) => {
              const capacity = e.target.value
              setForm({
                ...form,
                capacity,
                rentAmount: String(rentForType(form.roomType, capacity)),
              })
            }}
            required
          />
          <Input
            label="Rent / bed (from Settings → Bed pricing)"
            type="number"
            value={form.rentAmount}
            onChange={(e) => setForm({ ...form, rentAmount: e.target.value })}
            required
          />
          <Input
            label="Amenities"
            value={form.amenities}
            onChange={(e) => setForm({ ...form, amenities: e.target.value })}
          />
          <div className="md:col-span-2">
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" className="w-full">
              Create room & beds
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={occupiedOpen} onClose={() => setOccupiedOpen(false)} title="Occupied bed">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-stone-50 px-3 py-3 text-sm">
            <div className="font-semibold text-text-primary">
              Room {selectedRoom?.roomNumber} · Bed {selectedBed?.bedNumber}
            </div>
            <div className="mt-1 text-text-secondary">
              Tenant: {selectedBed?.currentTenant?.fullName || 'Unknown'}
            </div>
            {selectedBed?.currentTenant?.phone && (
              <div className="text-text-secondary">{selectedBed.currentTenant.phone}</div>
            )}
          </div>
          <p className="text-sm text-text-secondary">
            Transfer the tenant or check them out to free this bed.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="flex-1" onClick={openTransfer}>
              Transfer
            </Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={checkoutOccupied}>
              Check out
            </Button>
          </div>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setOccupiedOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer tenant">
        <form className="space-y-4" onSubmit={transferTenant}>
          <p className="text-sm text-text-secondary">
            Move {selectedBed?.currentTenant?.fullName} from Room {selectedRoom?.roomNumber} · Bed{' '}
            {selectedBed?.bedNumber}
          </p>
          <div>
            <div className="mb-1.5 text-sm font-semibold text-text-primary">New available bed</div>
            {availableBedsForTransfer.length ? (
              <div className="max-h-52 overflow-y-auto rounded-lg border border-border bg-white">
                {availableBedsForTransfer.map((b, i) => {
                  const active = transferBedId === b._id
                  return (
                    <button
                      key={b._id}
                      type="button"
                      onClick={() => setTransferBedId(b._id)}
                      className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition ${
                        i > 0 ? 'border-t border-border' : ''
                      } ${
                        active
                          ? 'bg-stone-900 font-semibold text-white'
                          : 'text-text-primary hover:bg-stone-50'
                      }`}
                    >
                      Room {b.roomNumber} · Bed {b.bedNumber}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-error">No available beds to transfer into.</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={!transferBedId}>
            Transfer
          </Button>
        </form>
      </Modal>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign tenant">
        <form className="space-y-4" onSubmit={assignTenant}>
          <p className="text-sm text-text-secondary">
            Room {selectedRoom?.roomNumber} · Bed {selectedBed?.bedNumber}
          </p>
          <Select
            label="Tenant"
            value={assignForm.tenantId}
            onChange={(e) => setAssignForm({ ...assignForm, tenantId: e.target.value })}
            required
          >
            <option value="">Select tenant</option>
            {tenants.map((t) => (
              <option key={t._id} value={t._id}>
                {t.fullName} ({t.status})
              </option>
            ))}
          </Select>
          <Input
            label="Move-in date"
            type="date"
            value={assignForm.moveInDate}
            onChange={(e) => setAssignForm({ ...assignForm, moveInDate: e.target.value })}
            required
          />
          <Input
            label="Agreed rent"
            type="number"
            value={assignForm.rentAmount}
            onChange={(e) => setAssignForm({ ...assignForm, rentAmount: e.target.value })}
            required
          />
          <Button type="submit" className="w-full">
            Assign bed
          </Button>
        </form>
      </Modal>
    </div>
  )
}
