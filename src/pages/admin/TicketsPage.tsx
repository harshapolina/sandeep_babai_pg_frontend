import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { Button, EmptyState, Skeleton, cn } from '../../components/ui'
import { useAuth } from '../../lib/auth'

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'resolved_awaiting_confirmation', label: 'Awaiting' },
  { id: 'closed', label: 'Closed' },
  { id: 'reopened', label: 'Reopened' },
] as const

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved_awaiting_confirmation', label: 'Resolved (await tenant)' },
  { value: 'closed', label: 'Closed' },
  { value: 'reopened', label: 'Reopened' },
]

function statusLabel(s: string) {
  return String(s || '').replaceAll('_', ' ')
}

function statusTone(s: string) {
  if (s === 'closed') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (s?.includes('resolved')) return 'bg-amber-50 text-amber-800 ring-amber-200'
  if (s === 'reopened') return 'bg-orange-50 text-orange-800 ring-orange-200'
  if (s === 'open') return 'bg-stone-100 text-stone-700 ring-stone-200'
  return 'bg-stone-50 text-stone-600 ring-stone-200'
}

const LIST_CACHE = 'pg_admin_tickets'

const fieldClass =
  'h-9 w-full rounded-md border border-border bg-white px-2.5 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-[3px] focus:ring-primary/10 disabled:opacity-50'

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

  const [allItems, setAllItems] = useState<any[]>(cached?.items || [])
  const [status, setStatus] = useState('')
  const [staff, setStaff] = useState<any[]>([])
  const [detail, setDetail] = useState<any>(null)
  const [comment, setComment] = useState('')
  const [assignTo, setAssignTo] = useState('')
  const [listLoading, setListLoading] = useState(!cached?.items?.length)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of allItems) {
      const key = t.status || 'open'
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [allItems])

  const items = useMemo(() => {
    if (!status) return allItems
    return allItems.filter((t) => t.status === status)
  }, [allItems, status])

  async function load() {
    const { data } = await api.get('/tickets', { params: { limit: 50 } })
    const list = data.data || []
    setAllItems(list)
    try {
      sessionStorage.setItem(LIST_CACHE, JSON.stringify({ items: list }))
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    let alive = true
    setListLoading(!allItems.length)
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
  }, [isAdmin])

  const totalOpen = useMemo(() => {
    return (
      (statusCounts.open || 0) +
      (statusCounts.assigned || 0) +
      (statusCounts.in_progress || 0) +
      (statusCounts.reopened || 0)
    )
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
    const prevItems = allItems

    setDetail((d: any) => (d ? { ...d, ticket: { ...d.ticket, ...payload } } : d))
    setAllItems((list) => list.map((t) => (t._id === id ? { ...t, ...payload } : t)))

    setSaving(true)
    try {
      await api.patch(`/tickets/${id}`, payload)
      toast.success('Updated')
      load().catch(() => {})
    } catch (err: any) {
      setDetail(prevDetail)
      setAllItems(prevItems)
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
    ticket && !['resolved_awaiting_confirmation', 'closed'].includes(ticket.status)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">
          Maintenance
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {totalOpen} active · {statusCounts.closed || 0} closed
        </p>
      </div>

      <div className="mb-3 flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => {
          const count = f.id
            ? statusCounts[f.id] || 0
            : Object.values(statusCounts).reduce((a, b) => a + b, 0)
          const active = status === f.id
          return (
            <button
              key={f.id || 'all'}
              type="button"
              onClick={() => setStatus(f.id)}
              className={cn(
                'shrink-0 rounded-md px-2.5 py-1 text-[13px] font-semibold transition',
                active
                  ? 'bg-stone-900 text-white'
                  : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
              )}
            >
              {f.label}
              {count > 0 && (
                <span className={cn('ml-1 tabular-nums', active ? 'text-white/70' : 'text-neutral')}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {listLoading && !items.length ? (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-none border-b border-border last:border-0" />
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState title="No tickets" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          {items.map((t, i) => (
            <button
              key={t._id}
              type="button"
              onClick={() => openDetail(t)}
              className={cn(
                'flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-stone-50',
                i > 0 && 'border-t border-border',
                detail?.ticket?._id === t._id && 'bg-stone-50'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-neutral">{t.ticketNumber}</span>
                  <span className="truncate text-sm font-semibold text-text-primary">{t.title}</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-text-secondary">
                  {t.tenant?.fullName || '—'}
                  {t.property?.name ? ` · ${t.property.name}` : ''}
                  {t.room?.roomNumber ? ` · R${t.room.roomNumber}` : ''}
                </div>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset',
                  statusTone(t.status)
                )}
              >
                {statusLabel(t.status)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Detail drawer — minimal, no heavy modal chrome */}
      {ticket && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/25"
            aria-label="Close"
            onClick={() => setDetail(null)}
          />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-white shadow-[-12px_0_40px_rgba(28,25,23,0.08)]">
            <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <span className="font-mono text-xs text-neutral">{ticket.ticketNumber}</span>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-md p-1.5 text-neutral transition hover:bg-surface-raised hover:text-text-primary"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <h2 className="text-[17px] font-semibold leading-snug text-text-primary">
                {ticket.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {ticket.description}
              </p>

              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral">
                    Status
                  </dt>
                  <dd className="mt-1">
                    <select
                      className={fieldClass}
                      value={ticket.status}
                      disabled={saving}
                      onChange={(e) => updateTicket({ status: e.target.value })}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral">
                    Priority
                  </dt>
                  <dd className="mt-1 capitalize text-text-primary">{ticket.priority}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral">
                    Assign to
                  </dt>
                  <dd className="mt-1">
                    <select
                      className={fieldClass}
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
                    </select>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral">
                    Tenant
                  </dt>
                  <dd className="mt-1 text-text-primary">{ticket.tenant?.fullName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral">
                    Location
                  </dt>
                  <dd className="mt-1 text-text-primary">
                    {[ticket.property?.name, ticket.room?.roomNumber && `R${ticket.room.roomNumber}`]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </dd>
                </div>
              </dl>

              {canResolve && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => updateTicket({ status: 'resolved_awaiting_confirmation' })}
                  className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-md bg-stone-900 px-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-50"
                >
                  <Check size={14} />
                  {saving ? 'Saving…' : 'Mark resolved'}
                </button>
              )}

              <section className="mt-8 border-t border-border pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral">
                    Activity
                  </h3>
                  {detailLoading && (
                    <span className="text-[11px] text-neutral">Loading…</span>
                  )}
                </div>

                <div className="space-y-3">
                  {(detail.comments || []).map((c: any) => (
                    <div key={c._id} className="text-sm">
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
              </section>
            </div>

            <form
              onSubmit={addComment}
              className="flex shrink-0 gap-2 border-t border-border bg-white p-4"
            >
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Reply…"
                disabled={saving}
                className={cn(fieldClass, 'flex-1')}
              />
              <Button type="submit" size="sm" disabled={saving || !comment.trim()} variant="secondary">
                Send
              </Button>
            </form>
          </aside>
        </div>
      )}
    </div>
  )
}
