import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  formatINR,
} from '../../components/ui'
import { useAuth } from '../../lib/auth'

export default function TenantsPage() {
  const { isAdmin } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [detail, setDetail] = useState<any>(null)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/tenants', {
        params: { q: q || undefined, status: status || undefined },
      })
      setItems(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message))
  }, [q, status])

  async function openDetail(id: string) {
    const { data } = await api.get(`/tenants/${id}`)
    setDetail(data.data)
  }

  async function checkout(id: string) {
    if (!window.confirm('Check out this tenant and free their bed?')) return
    try {
      await api.post(`/tenants/${id}/checkout`)
      toast.success('Tenant checked out')
      setDetail(null)
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div>
      <PageHeader
        title="Tenants"
        subtitle="Directory with property, bed assignment, and payment status"
        actions={
          <>
            <Input placeholder="Search name, email, phone" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="checked_out">Checked out</option>
              <option value="inactive">Inactive</option>
            </Select>
          </>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState title="No tenants found" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase tracking-wide text-neutral">
              <tr>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Property / Bed</th>
                <th className="px-4 py-3">Move-in</th>
                <th className="px-4 py-3">Rent</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t._id} className="border-b border-border last:border-0 hover:bg-surface-raised/60">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{t.fullName}</div>
                    <div className="text-xs text-text-secondary">{t.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{t.property?.name || '—'}</div>
                    <div className="text-xs text-text-secondary">
                      {t.assignment
                        ? `Floor ${t.assignment.floor?.name} · R${t.assignment.room?.roomNumber} · B${t.assignment.bed?.bedNumber}`
                        : 'Unassigned'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {t.moveInDate ? new Date(t.moveInDate).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div>{formatINR(t.agreedRent)}</div>
                    <div className="text-xs capitalize text-text-secondary">{t.paymentStatus}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={t.status === 'active' ? 'success' : t.status === 'pending' ? 'accent' : 'neutral'}>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="secondary" onClick={() => openDetail(t._id)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.tenant?.fullName || 'Tenant'} wide>
        {detail && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h4 className="font-semibold">Profile</h4>
              <div className="mt-2 space-y-1 text-sm text-text-secondary">
                <div>{detail.tenant.email}</div>
                <div>{detail.tenant.phone}</div>
                <div>
                  Emergency: {detail.tenant.emergencyContact?.name || '—'} (
                  {detail.tenant.emergencyContact?.phone || '—'})
                </div>
                <div>Deposit: {formatINR(detail.tenant.securityDeposit)}</div>
              </div>
              {isAdmin && detail.tenant.status === 'active' && (
                <Button className="mt-4" variant="danger" size="sm" onClick={() => checkout(detail.tenant._id)}>
                  Record check-out
                </Button>
              )}
            </Card>
            <Card>
              <h4 className="font-semibold">Current assignment</h4>
              {detail.assignment ? (
                <div className="mt-2 text-sm text-text-secondary">
                  {detail.assignment.property?.name || detail.tenant.property?.name}
                  <br />
                  {detail.assignment.floor?.name} · Room {detail.assignment.room?.roomNumber} · Bed{' '}
                  {detail.assignment.bed?.bedNumber}
                </div>
              ) : (
                <p className="mt-2 text-sm text-text-secondary">No active assignment</p>
              )}
            </Card>
            <Card className="md:col-span-2">
              <h4 className="font-semibold">Rent records</h4>
              <div className="mt-3 space-y-2">
                {(detail.rents || []).map((r: any) => (
                  <div key={r._id} className="flex justify-between text-sm">
                    <span>
                      {r.periodMonth}/{r.periodYear} · {r.status}
                    </span>
                    <span>
                      {formatINR(r.amountPaid)} / {formatINR(r.amountDue)}
                    </span>
                  </div>
                ))}
                {!detail.rents?.length && <p className="text-sm text-text-secondary">No rent records</p>}
              </div>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  )
}
