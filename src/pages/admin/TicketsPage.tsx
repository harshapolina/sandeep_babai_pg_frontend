import { FormEvent, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { Button, EmptyState, Input, Modal, Select, Skeleton, cn } from '../../components/ui'
import { useAuth } from '../../lib/auth'

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'resolved_awaiting_confirmation', label: 'Awaiting tenant' },
  { id: 'closed', label: 'Closed' },
  { id: 'reopened', label: 'Reopened' },
] as const

function statusLabel(s: string) {
  return String(s || '').replaceAll('_', ' ')
}

function statusTone(s: string) {
  if (s === 'closed') return 'text-success'
  if (s?.includes('resolved')) return 'text-warning'
  if (s === 'reopened' || s === 'open') return 'text-primary'
  return 'text-text-secondary'
}

const LIST_CACHE = 'pg_admin_tickets'

export default function TicketsPage() {
  const { isAdmin } = useAuth()
  const cached = (() => {
    try {
      const raw = sessionStorage.getItem(LIST_CACHE)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })()

  const [items, setItems] = useState<any[]>(cached?.items || [])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>(
    cached?.statusCounts || {}
  )
  const [status, setStatus] = useState('')
  const [staff, setStaff] = useState<any[]>([])
  const [detail, setDetail] = useState<any>(null)
  const [comment, setComment] = useState('')
  const [assignTo, setAssignTo] = useState('')
  const [listLoading, setListLoading] = useState(!cached?.items?.length)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await api.get('/tickets', {
      params: { status: status || undefined, limit: 50 },
    })
    const list = data.data || []
    const counts = data.statusCounts || {}
    setItems(list)
    setStatusCounts(counts)
    try {
      sessionStorage.setItem(LIST_CACHE, JSON.stringify({ items: list, statusCounts: counts }))
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    let alive = true
    setListLoading(!cached?.items?.length)
    load()
      .catch((e) => toast.error(e.message))
      .finally(() => {
        if (alive) setListLoading(false)
      })
    if (isAdmin) {
      api
        .get('/staff')
        .then((r) => setStaff(r.data.data || []))
        .catch(() => {})
    }
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isAdmin])

  const totalOpen = useMemo(() => {
    return (statusCounts.open || 0) + (statusCounts.assigned || 0) + (statusCounts.in_progress || 0) + (statusCounts.reopened || 0)
  }, [statusCounts])

  function openDetail(ticket: any) {
    setDetail({ ticket, comments: [], attachments: [] })
    setAssignTo(ticket.assignedTo?._id || ticket.assignedTo || '')
    setComment('')
    setDetailLoading(true)
    api
      .get(`/tickets/${ticket._id}`)
      .then((r) => {
        setDetail(r.data.data)
        setAssignTo(r.data.data.ticket.assignedTo?._id || '')
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setDetailLoading(false))
  }

  async function updateTicket(payload: any) {
    if (!detail?.ticket?._id || saving) return
    const id = detail.ticket._id
    const prevDetail = detail
    const prevItems = items
    const prevCounts = statusCounts

    setDetail((d: any) => (d ? { ...d, ticket: { ...d.ticket, ...payload } } : d))
    setItems((list) => list.map((t) => (t._id === id ? { ...t, ...payload } : t)))
    if (payload.status) {
      setStatusCounts((c) => {
        const next = { ...c }
        const old = prevDetail.ticket.status
        if (old && next[old] > 0) next[old] -= 1
        next[payload.status] = (next[payload.status] || 0) + 1
        return next
      })
    }

    setSaving(true)
    try {
      await api.patch(`/tickets/${id}`, payload)
      toast.success('Updated')
      load().catch(() => {})
    } catch (err: any) {
      setDetail(prevDetail)
      setItems(prevItems)
      setStatusCounts(prevCounts)
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function addComment(e: FormEvent) {
    e.preventDefault()
    if (!comment.trim() || !detail?.ticket?._id || saving) return
    const body = comment.trim()
    setComment('')
    setSaving(true)
    try {
      const { data } = await api.post(`/tickets/${detail.ticket._id}/comments`, { body })
      setDetail((d: any) =>
        d ? { ...d, comments: [...(d.comments || []), data.data] } : d
      )
    } catch (err: any) {
      setComment(body)
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const ticket = detail?.ticket
  const canResolve =
    ticket &&
    !['resolved_awaiting_confirmation', 'closed'].includes(ticket.status)

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Maintenance
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {totalOpen} active · {statusCounts.closed || 0} closed
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const count = f.id ? statusCounts[f.id] || 0 : Object.values(statusCounts).reduce((a, b) => a + b, 0)
          const active = status === f.id
          return (
            <button
              key={f.id || 'all'}
              type="button"
              onClick={() => setStatus(f.id)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                active
                  ? 'bg-white text-text-primary shadow-sm ring-1 ring-border'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {f.label}
              {count > 0 && (
                <span className="ml-1.5 tabular-nums text-neutral">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {listLoading && !items.length ? (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-none border-b border-border last:border-0" />
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState title="No tickets" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          {items.map((t, i) => (
            <button
              key={t._id}
              type="button"
              onClick={() => openDetail(t)}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface/80',
                i > 0 && 'border-t border-border'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-mono text-[11px] font-medium text-neutral">
                    {t.ticketNumber}
                  </span>
                  <span className="text-sm font-semibold text-text-primary truncate">
                    {t.title}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-text-secondary">
                  {t.tenant?.fullName || '—'}
                  {t.property?.name ? ` · ${t.property.name}` : ''}
                  {t.room?.roomNumber ? ` · R${t.room.roomNumber}` : ''}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className={cn('text-xs font-semibold capitalize', statusTone(t.status))}>
                  {statusLabel(t.status)}
                </div>
                <div className="mt-0.5 text-[11px] capitalize text-neutral">{t.priority}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={ticket?.ticketNumber || 'Ticket'}
        wide
      >
        {ticket && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">{ticket.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                {ticket.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral">
                <span className={cn('font-semibold capitalize', statusTone(ticket.status))}>
                  {statusLabel(ticket.status)}
                </span>
                <span className="capitalize">{ticket.priority} priority</span>
                {ticket.tenant?.fullName && <span>{ticket.tenant.fullName}</span>}
                {ticket.property?.name && <span>{ticket.property.name}</span>}
                {ticket.room?.roomNumber && <span>Room {ticket.room.roomNumber}</span>}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Status"
                value={ticket.status}
                disabled={saving}
                onChange={(e) => updateTicket({ status: e.target.value })}
              >
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In progress</option>
                <option value="resolved_awaiting_confirmation">Resolved — await tenant</option>
                <option value="closed">Closed</option>
                <option value="reopened">Reopened</option>
              </Select>
              <Select
                label="Assign to"
                value={assignTo}
                disabled={saving}
                onChange={(e) => {
                  setAssignTo(e.target.value)
                  updateTicket({
                    assignedTo: e.target.value || null,
                    ...(e.target.value ? { status: 'assigned' } : {}),
                  })
                }}
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </Select>
            </div>

            {canResolve && (
              <Button
                className="w-full sm:w-auto"
                disabled={saving}
                onClick={() => updateTicket({ status: 'resolved_awaiting_confirmation' })}
              >
                {saving ? 'Saving…' : 'Mark resolved'}
              </Button>
            )}

            <div className="border-t border-border pt-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-text-primary">Activity</h4>
                {detailLoading && (
                  <span className="text-[11px] text-neutral">Loading…</span>
                )}
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {(detail.comments || []).map((c: any) => (
                  <div key={c._id} className="rounded-lg bg-surface px-3 py-2 text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-text-primary">
                        {c.author?.fullName || 'Staff'}
                      </span>
                      <span className="text-[11px] text-neutral">
                        {c.createdAt
                          ? new Date(c.createdAt).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                    <p className="mt-0.5 text-text-secondary">{c.body}</p>
                  </div>
                ))}
                {!detailLoading && !detail.comments?.length && (
                  <p className="text-sm text-text-secondary">No replies yet.</p>
                )}
              </div>
              <form className="mt-3 flex gap-2" onSubmit={addComment}>
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a reply…"
                  className="flex-1"
                  disabled={saving}
                />
                <Button type="submit" disabled={saving || !comment.trim()} variant="secondary">
                  Send
                </Button>
              </form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
