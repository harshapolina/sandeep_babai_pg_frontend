import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { Button, Card, Input, Select, Textarea, formatINR } from './ui'

type RoomDraft = {
  key: string
  roomNumber: string
  bedCount: number
  rentAmount: string
  roomType: string
  amenities: string
}

type FloorDraft = {
  key: string
  name: string
  level: number
  rooms: RoomDraft[]
}

type Props = {
  onClose: () => void
  onCreated: () => void
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function defaultRoom(n: number, rent: string): RoomDraft {
  return {
    key: uid(),
    roomNumber: String(n).padStart(2, '0'),
    bedCount: 1,
    rentAmount: rent,
    roomType: 'single',
    amenities: 'Fan, Wardrobe',
  }
}

function defaultFloor(level: number, rent: string): FloorDraft {
  return {
    key: uid(),
    name: level === 0 ? 'Ground Floor' : `Floor ${level}`,
    level,
    rooms: [defaultRoom(level * 100 + 1, rent)],
  }
}

const STEPS = ['Property details', 'Floors & rooms', 'Review & create']

export default function PropertySetupWizard({ onClose, onCreated }: Props) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    address: '',
    contactPhone: '',
    contactEmail: '',
    description: '',
    facilities: 'WiFi, CCTV, Power Backup',
    defaultRentAmount: '9000',
    defaultDepositAmount: '18000',
    houseRules: 'Quiet hours 10 PM – 6 AM. Keep common areas clean.',
  })
  const [floors, setFloors] = useState<FloorDraft[]>([
    defaultFloor(0, '9000'),
  ])

  const summary = useMemo(() => {
    const rooms = floors.reduce((n, f) => n + f.rooms.length, 0)
    const beds = floors.reduce(
      (n, f) => n + f.rooms.reduce((bn, r) => bn + Number(r.bedCount || 0), 0),
      0
    )
    return { floors: floors.length, rooms, beds }
  }, [floors])

  function syncRentDefaults(rent: string) {
    setForm((f) => ({ ...f, defaultRentAmount: rent }))
    setFloors((prev) =>
      prev.map((floor) => ({
        ...floor,
        rooms: floor.rooms.map((r) => ({
          ...r,
          rentAmount: r.rentAmount || rent,
        })),
      }))
    )
  }

  function validateStep1() {
    if (!form.name.trim() || !form.address.trim()) {
      toast.error('Property name and address are required')
      return false
    }
    return true
  }

  function validateStep2() {
    if (!floors.length) {
      toast.error('Add at least one floor')
      return false
    }
    for (const floor of floors) {
      if (!floor.name.trim()) {
        toast.error('Every floor needs a name')
        return false
      }
      if (!floor.rooms.length) {
        toast.error(`${floor.name} needs at least one room`)
        return false
      }
      for (const room of floor.rooms) {
        if (!room.roomNumber.trim()) {
          toast.error(`Enter room number on ${floor.name}`)
          return false
        }
        if (!Number.isInteger(room.bedCount) || room.bedCount < 1) {
          toast.error(`Room ${room.roomNumber} must have at least 1 bed`)
          return false
        }
      }
      const numbers = floor.rooms.map((r) => r.roomNumber.trim())
      if (new Set(numbers).size !== numbers.length) {
        toast.error(`Duplicate room numbers on ${floor.name}`)
        return false
      }
    }
    return true
  }

  function roomTypeForBeds(n: number) {
    if (n === 1) return 'single'
    if (n === 2) return 'double'
    if (n === 3) return 'triple'
    if (n === 4) return 'quad'
    return 'other'
  }

  async function createAll() {
    if (!validateStep1() || !validateStep2()) return
    setSaving(true)
    try {
      const { data } = await api.post('/properties/setup', {
        name: form.name.trim(),
        address: form.address.trim(),
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        description: form.description,
        facilities: form.facilities.split(',').map((s) => s.trim()).filter(Boolean),
        defaultRentAmount: Number(form.defaultRentAmount),
        defaultDepositAmount: Number(form.defaultDepositAmount),
        houseRules: form.houseRules,
        structure: floors.map((f) => ({
          name: f.name.trim(),
          level: f.level,
          rooms: f.rooms.map((r) => ({
            roomNumber: r.roomNumber.trim(),
            bedCount: r.bedCount,
            rentAmount: Number(r.rentAmount || form.defaultRentAmount),
            roomType: r.roomType || roomTypeForBeds(r.bedCount),
            amenities: r.amenities.split(',').map((s) => s.trim()).filter(Boolean),
          })),
        })),
      })
      toast.success(
        `Created ${data.data.summary.floors} floors · ${data.data.summary.rooms} rooms · ${data.data.summary.beds} beds`
      )
      onCreated()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              i === step
                ? 'bg-primary text-white'
                : i < step
                  ? 'bg-orange-50 text-primary'
                  : 'bg-surface-raised text-neutral'
            }`}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Property name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. PG A — Banjara Hills"
            required
          />
          <Input
            label="Contact phone"
            value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
          />
          <Input
            label="Full address"
            className="md:col-span-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            required
          />
          <Input
            label="Contact email"
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
          />
          <Input
            label="Facilities (comma separated)"
            value={form.facilities}
            onChange={(e) => setForm({ ...form, facilities: e.target.value })}
          />
          <Input
            label="Default rent / bed (₹)"
            type="number"
            min={0}
            value={form.defaultRentAmount}
            onChange={(e) => syncRentDefaults(e.target.value)}
          />
          <Input
            label="Default security deposit (₹)"
            type="number"
            min={0}
            value={form.defaultDepositAmount}
            onChange={(e) => setForm({ ...form, defaultDepositAmount: e.target.value })}
          />
          <div className="md:col-span-2">
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Textarea
              label="House rules"
              value={form.houseRules}
              onChange={(e) => setForm({ ...form, houseRules: e.target.value })}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Customize every floor and room. Each room needs <strong>at least 1 bed</strong>.
            Bed numbers are fixed as Bed 1, Bed 2… Only an admin can add more beds later
            without changing existing numbers.
          </p>

          {floors.map((floor, fi) => (
            <Card key={floor.key} className="!bg-background">
              <div className="flex flex-wrap items-end gap-3">
                <Input
                  label="Floor name"
                  value={floor.name}
                  onChange={(e) => {
                    const next = [...floors]
                    next[fi] = { ...floor, name: e.target.value }
                    setFloors(next)
                  }}
                  className="min-w-48 flex-1"
                />
                <Input
                  label="Level (0 = ground)"
                  type="number"
                  value={String(floor.level)}
                  onChange={(e) => {
                    const next = [...floors]
                    next[fi] = { ...floor, level: Number(e.target.value) }
                    setFloors(next)
                  }}
                  className="w-36"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const next = [...floors]
                    const n = floor.rooms.length + 1
                    next[fi] = {
                      ...floor,
                      rooms: [
                        ...floor.rooms,
                        defaultRoom(floor.level * 100 + n, form.defaultRentAmount),
                      ],
                    }
                    setFloors(next)
                  }}
                >
                  Add room
                </Button>
                {floors.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setFloors(floors.filter((_, i) => i !== fi))}
                  >
                    Remove floor
                  </Button>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {floor.rooms.map((room, ri) => (
                  <div
                    key={room.key}
                    className="grid gap-3 rounded-lg border border-border bg-surface p-3 md:grid-cols-6"
                  >
                    <Input
                      label="Room no."
                      value={room.roomNumber}
                      onChange={(e) => {
                        const next = [...floors]
                        const rooms = [...floor.rooms]
                        rooms[ri] = { ...room, roomNumber: e.target.value }
                        next[fi] = { ...floor, rooms }
                        setFloors(next)
                      }}
                    />
                    <Input
                      label="Beds (min 1)"
                      type="number"
                      min={1}
                      value={String(room.bedCount)}
                      onChange={(e) => {
                        const bedCount = Math.max(1, Number(e.target.value) || 1)
                        const next = [...floors]
                        const rooms = [...floor.rooms]
                        rooms[ri] = {
                          ...room,
                          bedCount,
                          roomType: roomTypeForBeds(bedCount),
                        }
                        next[fi] = { ...floor, rooms }
                        setFloors(next)
                      }}
                    />
                    <Select
                      label="Type"
                      value={room.roomType}
                      onChange={(e) => {
                        const next = [...floors]
                        const rooms = [...floor.rooms]
                        rooms[ri] = { ...room, roomType: e.target.value }
                        next[fi] = { ...floor, rooms }
                        setFloors(next)
                      }}
                    >
                      <option value="single">Single</option>
                      <option value="double">Double</option>
                      <option value="triple">Triple</option>
                      <option value="quad">Quad</option>
                      <option value="dorm">Dorm</option>
                      <option value="other">Other</option>
                    </Select>
                    <Input
                      label="Rent / bed (₹)"
                      type="number"
                      value={room.rentAmount}
                      onChange={(e) => {
                        const next = [...floors]
                        const rooms = [...floor.rooms]
                        rooms[ri] = { ...room, rentAmount: e.target.value }
                        next[fi] = { ...floor, rooms }
                        setFloors(next)
                      }}
                    />
                    <Input
                      label="Amenities"
                      value={room.amenities}
                      onChange={(e) => {
                        const next = [...floors]
                        const rooms = [...floor.rooms]
                        rooms[ri] = { ...room, amenities: e.target.value }
                        next[fi] = { ...floor, rooms }
                        setFloors(next)
                      }}
                    />
                    <div className="flex items-end">
                      {floor.rooms.length > 1 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="w-full"
                          onClick={() => {
                            const next = [...floors]
                            next[fi] = {
                              ...floor,
                              rooms: floor.rooms.filter((_, i) => i !== ri),
                            }
                            setFloors(next)
                          }}
                        >
                          Remove
                        </Button>
                      ) : (
                        <div className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-xs text-neutral">
                          Beds: 1…{room.bedCount}
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-6 text-xs text-text-secondary">
                      Will create fixed bed numbers:{' '}
                      {Array.from({ length: room.bedCount }, (_, i) => `Bed ${i + 1}`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const nextLevel =
                floors.reduce((max, f) => Math.max(max, f.level), -1) + 1
              setFloors([...floors, defaultFloor(nextLevel, form.defaultRentAmount)])
            }}
          >
            Add another floor
          </Button>

          <Card className="!py-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                <strong>{summary.floors}</strong> floors
              </span>
              <span>
                <strong>{summary.rooms}</strong> rooms
              </span>
              <span>
                <strong>{summary.beds}</strong> beds
              </span>
            </div>
          </Card>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Card className="!bg-background border-l-[2px] border-l-primary">
            <h3 className="font-display text-xl">{form.name || 'Untitled property'}</h3>
            <p className="mt-1 text-sm text-text-secondary">{form.address}</p>
            <p className="mt-2 text-sm">
              Default rent {formatINR(Number(form.defaultRentAmount))} · Deposit{' '}
              {formatINR(Number(form.defaultDepositAmount))}
            </p>
          </Card>

          {floors.map((floor) => (
            <Card key={floor.key}>
              <h4 className="font-semibold">
                {floor.name}{' '}
                <span className="text-xs font-normal text-neutral">(level {floor.level})</span>
              </h4>
              <div className="mt-3 space-y-2">
                {floor.rooms.map((room) => (
                  <div
                    key={room.key}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  >
                    <span>
                      Room <strong>{room.roomNumber}</strong> · {room.roomType} ·{' '}
                      {room.bedCount} bed{room.bedCount > 1 ? 's' : ''} (Bed 1
                      {room.bedCount > 1 ? `–${room.bedCount}` : ''})
                    </span>
                    <span className="font-semibold">
                      {formatINR(Number(room.rentAmount || form.defaultRentAmount))}/bed
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <Card>
            <div className="text-sm text-text-secondary">
              Creating <strong>{summary.floors}</strong> floors,{' '}
              <strong>{summary.rooms}</strong> rooms, and{' '}
              <strong>{summary.beds}</strong> beds in one go.
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <div className="flex gap-2">
          {step > 0 && (
            <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button
              type="button"
              onClick={() => {
                if (step === 0 && !validateStep1()) return
                if (step === 1 && !validateStep2()) return
                setStep(step + 1)
              }}
            >
              Continue
            </Button>
          ) : (
            <Button type="button" onClick={createAll} disabled={saving}>
              {saving ? 'Creating…' : 'Create property with all rooms & beds'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
