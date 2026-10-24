import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '../../lib/api'
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Select,
  Skeleton,
  formatINR,
} from '../../components/ui'

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [propertyId, setPropertyId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/properties').then((r) => setProperties(r.data.data || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    api
      .get('/dashboard/overview', { params: propertyId ? { propertyId } : {} })
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false))
  }, [propertyId])

  if (loading || !data) {
    return (
      <div>
        <PageHeader title="Operations overview" subtitle="Loading live metrics…" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-72 xl:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  const t = data.totals || {}

  const metrics = [
    { label: 'Properties', value: t.properties },
    { label: 'Floors / Rooms / Beds', value: `${t.floors} / ${t.rooms} / ${t.beds}` },
    { label: 'Occupied beds', value: t.occupiedBeds },
    { label: 'Available beds', value: t.availableBeds },
    { label: 'Reserved', value: t.reservedBeds },
    { label: 'Maintenance beds', value: t.maintenanceBeds },
    { label: 'Active tenants', value: t.activeTenants },
    { label: 'New registrations', value: t.pendingRegistrations },
    { label: 'Rent collected (month)', value: formatINR(t.monthlyRentCollected) },
    { label: 'Pending rent', value: formatINR(t.pendingRent) },
    { label: 'Open tickets', value: t.openTickets },
    { label: 'Awaiting confirmation', value: t.ticketsAwaitingConfirmation },
  ]

  return (
    <div>
      <PageHeader
        title="Operations overview"
        subtitle="Live metrics from your Hyderabad PG portfolio"
        actions={
          <Select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="min-w-56"
          >
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="!p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral">
              {m.label}
            </div>
            <div className="mt-2 font-display text-2xl text-text-primary">{m.value}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="font-display text-xl">Monthly revenue & expense</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.monthlyChart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                <XAxis dataKey="label" tick={{ fill: '#78716C', fontSize: 12 }} />
                <YAxis tick={{ fill: '#78716C', fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#C2410C" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="expense" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-xl">Property occupancy</h3>
          <div className="mt-4 space-y-4">
            {(data?.occupancyByProperty || []).map((p: any) => (
              <div key={p.propertyId}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-text-secondary">{p.occupancyPct}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${p.occupancyPct}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-neutral">
                  {p.occupiedBeds}/{p.totalBeds} beds
                </div>
              </div>
            ))}
            {!data?.occupancyByProperty?.length && (
              <EmptyState title="No properties yet" description="Add a property to see occupancy." />
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <h3 className="font-display text-xl">Recent registrations</h3>
          <div className="mt-3 space-y-3">
            {(data?.recentTenants || []).map((t: any) => (
              <div key={t._id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
                <div>
                  <div className="text-sm font-semibold">{t.fullName}</div>
                  <div className="text-xs text-text-secondary">{t.property?.name}</div>
                </div>
                <Badge tone={t.status === 'active' ? 'success' : 'accent'}>{t.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-display text-xl">Recent tickets</h3>
          <div className="mt-3 space-y-3">
            {(data?.recentTickets || []).map((t: any) => (
              <div key={t._id} className="border-b border-border pb-2 last:border-0">
                <div className="text-sm font-semibold">{t.title}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-text-secondary">
                  <span>{t.ticketNumber}</span>
                  <Badge>{t.status.replaceAll('_', ' ')}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-display text-xl">Upcoming rent due</h3>
          <div className="mt-3 space-y-3">
            {(data?.upcomingRent || []).map((r: any) => (
              <div key={r._id} className="flex justify-between border-b border-border pb-2 last:border-0">
                <div>
                  <div className="text-sm font-semibold">{r.tenant?.fullName}</div>
                  <div className="text-xs text-text-secondary">
                    Due {new Date(r.dueDate).toLocaleDateString('en-IN')}
                  </div>
                </div>
                <div className="text-sm font-semibold">{formatINR(r.amountDue - r.amountPaid)}</div>
              </div>
            ))}
            {!data?.upcomingRent?.length && (
              <p className="text-sm text-text-secondary">No upcoming dues in the next 14 days.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
