import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { Badge, Card, EmptyState, Skeleton } from '../../components/ui'

export default function TenantRoomPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/tenant-portal/room')
      .then((r) => setData(r.data.data))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton className="h-64" />
  if (!data?.assignment) {
    return (
      <EmptyState
        title="No room assigned yet"
        description="Once admin assigns your bed, details will appear here."
      />
    )
  }

  const { assignment, property } = data

  return (
    <div className="space-y-4">
      <Card className="!bg-background">
        <h1 className="font-display text-3xl">My room</h1>
        <p className="mt-2 text-sm text-text-secondary">{property?.name}</p>
        <p className="text-sm text-text-secondary">{property?.address}</p>
      </Card>

      <Card>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-neutral">Floor</div>
            <div className="font-semibold">{assignment.floor?.name}</div>
          </div>
          <div>
            <div className="text-xs text-neutral">Room</div>
            <div className="font-semibold">{assignment.room?.roomNumber}</div>
          </div>
          <div>
            <div className="text-xs text-neutral">Bed</div>
            <div className="font-semibold">{assignment.bed?.label || assignment.bed?.bedNumber}</div>
          </div>
          <div>
            <div className="text-xs text-neutral">Type</div>
            <div className="font-semibold capitalize">{assignment.room?.roomType}</div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-xl">Room amenities</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(assignment.room?.amenities || []).map((a: string) => (
            <Badge key={a}>{a}</Badge>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-xl">Shared facilities</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(property?.facilities || []).map((f: string) => (
            <Badge key={f} tone="accent">{f}</Badge>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-xl">House rules</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
          {property?.houseRules || 'Follow quiet hours and keep common areas clean.'}
        </p>
      </Card>

      <Card>
        <h2 className="font-display text-xl">Property contact</h2>
        <p className="mt-2 text-sm text-text-secondary">
          {property?.contactPhone || '—'}
          <br />
          {property?.contactEmail || ''}
        </p>
      </Card>
    </div>
  )
}
