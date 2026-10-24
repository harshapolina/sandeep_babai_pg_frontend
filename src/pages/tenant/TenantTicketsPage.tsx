import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Textarea,
} from '../../components/ui'

export function TenantTicketsListPage() {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    api
      .get('/tickets/tenant')
      .then((r) => setItems(r.data.data || []))
      .catch((e) => toast.error(e.message))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Tickets</h1>
        <Link to="/tenant/tickets/new">
          <Button size="sm">New</Button>
        </Link>
      </div>
      {!items.length ? (
        <EmptyState title="No tickets yet" action={<Link to="/tenant/tickets/new"><Button>Raise a ticket</Button></Link>} />
      ) : (
        items.map((t) => (
          <Link key={t._id} to={`/tenant/tickets/${t._id}`}>
            <Card className="mb-3">
              <div className="text-xs text-primary">{t.ticketNumber}</div>
              <div className="font-semibold">{t.title}</div>
              <div className="mt-2 flex gap-2">
                <Badge>{t.status.replaceAll('_', ' ')}</Badge>
                <Badge tone="accent">{t.category}</Badge>
              </div>
            </Card>
          </Link>
        ))
      )}
    </div>
  )
}

export function TenantTicketNewPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    category: 'plumbing',
    title: '',
    description: '',
    priority: 'medium',
  })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      const { data } = await api.post('/tickets/tenant', form)
      toast.success('Ticket submitted')
      navigate(`/tenant/tickets/${data.data._id}`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Raise a ticket</h1>
      <Card>
        <form className="space-y-3" onSubmit={onSubmit}>
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="cleaning">Cleaning</option>
            <option value="furniture">Furniture</option>
            <option value="internet">Internet</option>
            <option value="water_supply">Water supply</option>
            <option value="other">Other</option>
          </Select>
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
          <Button type="submit" className="w-full">Submit ticket</Button>
        </form>
      </Card>
    </div>
  )
}

export function TenantTicketDetailPage() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  const [reason, setReason] = useState('')

  async function load() {
    const res = await api.get(`/tickets/tenant/${id}`)
    setData(res.data.data)
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message))
  }, [id])

  async function confirm() {
    try {
      await api.post(`/tickets/tenant/${id}/confirm`)
      toast.success('Thanks — ticket closed')
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function reopen() {
    if (!reason) return toast.error('Please share a reason')
    try {
      await api.post(`/tickets/tenant/${id}/reopen`, { reason })
      toast.success('Ticket reopened')
      setReason('')
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (!data) return null
  const t = data.ticket

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-primary">{t.ticketNumber}</div>
        <h1 className="font-display text-3xl">{t.title}</h1>
        <div className="mt-2">
          <Badge>{t.status.replaceAll('_', ' ')}</Badge>
        </div>
      </div>
      <Card>
        <p className="text-sm text-text-secondary">{t.description}</p>
        {t.resolutionNotes && (
          <p className="mt-3 rounded-lg bg-surface p-3 text-sm">
            <strong>Resolution:</strong> {t.resolutionNotes}
          </p>
        )}
      </Card>

      {t.status === 'resolved_awaiting_confirmation' && (
        <Card>
          <p className="text-sm">Staff marked this resolved. Is the issue fixed?</p>
          <div className="mt-3 flex gap-2">
            <Button onClick={confirm}>Confirm fixed</Button>
          </div>
          <Input
            className="mt-3"
            label="Or reopen with reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button className="mt-2" variant="secondary" onClick={reopen}>
            Reopen ticket
          </Button>
        </Card>
      )}

      <Card>
        <h2 className="font-display text-xl">Activity</h2>
        <div className="mt-3 space-y-2">
          {(data.comments || []).map((c: any) => (
            <div key={c._id} className="rounded-lg border border-border bg-background p-3 text-sm">
              <div className="font-semibold">{c.author?.fullName}</div>
              <div className="mt-1">{c.body}</div>
            </div>
          ))}
          {!data.comments?.length && (
            <p className="text-sm text-text-secondary">No replies yet.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
