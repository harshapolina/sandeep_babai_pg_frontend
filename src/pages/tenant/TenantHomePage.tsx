import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { Badge, Button, Card, Skeleton, formatINR } from '../../components/ui'

const HOME_CACHE = 'pg_tenant_home'

export default function TenantHomePage() {
  const cached = (() => {
    try {
      const raw = sessionStorage.getItem(HOME_CACHE)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })()
  const [data, setData] = useState<any>(cached)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    let alive = true
    api
      .get('/tenant-portal/home')
      .then((r) => {
        if (!alive) return
        setData(r.data.data)
        try {
          sessionStorage.setItem(HOME_CACHE, JSON.stringify(r.data.data))
        } catch {
          /* ignore */
        }
      })
      .catch((e) => toast.error(e.message))
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  const a = data?.assignment

  return (
    <div className="space-y-4">
      <Card className="!bg-background border-l-[2px] border-l-primary">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Welcome</p>
        <h1 className="mt-1 font-display text-3xl">{data?.welcomeName}</h1>
        <p className="mt-2 text-sm text-text-secondary">
          {a?.property?.name || 'Awaiting room assignment'}
          {a ? ` · ${a.floor?.name} · Room ${a.room?.roomNumber} · Bed ${a.bed?.bedNumber}` : ''}
        </p>
        {data?.tenant?.moveInDate && (
          <p className="mt-1 text-xs text-neutral">
            Move-in {new Date(data.tenant.moveInDate).toLocaleDateString('en-IN')}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="text-xs text-neutral">Rent status</div>
          <div className="mt-1 font-semibold capitalize">
            {data?.rentStatus?.status || 'Up to date'}
          </div>
          {data?.rentStatus && (
            <div className="mt-1 text-xs text-text-secondary">
              Due {new Date(data.rentStatus.dueDate).toLocaleDateString('en-IN')}
              <br />
              {formatINR(data.rentStatus.outstanding)} outstanding
            </div>
          )}
        </Card>
        <Card>
          <div className="text-xs text-neutral">Open tickets</div>
          <div className="mt-1 font-display text-2xl">{data?.openTickets || 0}</div>
          <Link to="/tenant/tickets/new" className="mt-2 inline-block">
            <Button size="sm">Raise ticket</Button>
          </Link>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl">Announcements</h2>
          <Link to="/tenant/announcements" className="text-sm font-semibold text-primary">
            View all
          </Link>
        </div>
        <div className="space-y-3">
          {(data?.announcements || []).map((n: any) => (
            <div key={n._id} className="border-b border-border pb-2 last:border-0">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-sm">{n.title}</div>
                <Badge tone="accent">{n.category}</Badge>
              </div>
              <p className="mt-1 text-xs text-text-secondary line-clamp-2">{n.body}</p>
            </div>
          ))}
          {!data?.announcements?.length && (
            <p className="text-sm text-text-secondary">No announcements yet.</p>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-xl">Recent notifications</h2>
        <div className="mt-3 space-y-2">
          {(data?.notifications || []).map((n: any) => (
            <div key={n._id} className="text-sm">
              <div className="font-semibold">{n.title}</div>
              <div className="text-xs text-text-secondary">{n.body}</div>
            </div>
          ))}
          {!data?.notifications?.length && (
            <p className="text-sm text-text-secondary">You're all caught up.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
