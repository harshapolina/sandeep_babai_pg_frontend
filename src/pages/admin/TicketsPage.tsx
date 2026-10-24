import { FormEvent, useEffect, useState } from 'react'
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
} from '../../components/ui'
import { useAuth } from '../../lib/auth'

export default function TicketsPage() {
  const { isAdmin } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [status, setStatus] = useState('')
  const [staff, setStaff] = useState<any[]>([])
  const [detail, setDetail] = useState<any>(null)
  const [comment, setComment] = useState('')
  const [assignTo, setAssignTo] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await api.get('/tickets', {
      params: { status: status || undefined, limit: 50 },
    })
    setItems(data.data || [])
    setStatusCounts(data.statusCounts || {})
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message))
    if (isAdmin) {
      api
        .get('/staff')
        .then((r) => setStaff(r.data.data || []))
        .catch(() => {})
    }
  }, [status, isAdmin])

  /** Open instantly from list row; hydrate comments in background */
  function openDetail(ticket: any) {
    setDetail({
      ticket,
      comments: [],
      attachments: [],
    })
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

  async function updateTicket(payload: any, opts?: { close?: boolean }) {
    if (!detail?.ticket?._id || saving) return
    const id = detail.ticket._id
    const prevDetail = detail
    const prevItems = items

    // Optimistic UI — no waiting for round-trip before feedback
    setDetail((d: any) =>
      d
        ? {
            ...d,
            ticket: { ...d.ticket, ...payload },
          }
        : d
    )
    setItems((list) =>
      list.map((t) => (t._id === id ? { ...t, ...payload } : t))
    )
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
      toast.success('Ticket updated')
      if (opts?.close) setDetail(null)
      // Soft refresh list in background (don't block UI)
      load().catch(() => {})
    } catch (err: any) {
      setDetail(prevDetail)
      setItems(prevItems)
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function addComment(e: FormEvent) {
    e.preventDefault()
    if (!comment.trim() || !detail?.ticket?._id || saving) return
    setSaving(true)
    try {
      await api.post(`/tickets/${detail.ticket._id}/comments`, { body: comment })
      setComment('')
      const { data } = await api.get(`/tickets/${detail.ticket._id}`)
      setDetail(data.data)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Maintenance tickets"
        subtitle="Assign, update, resolve — tap a card to open instantly"
        actions={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-56">
            <option value="">All statuses</option>
            {Object.keys(statusCounts).map((s) => (
              <option key={s} value={s}>
                {s.replaceAll('_', ' ')} ({statusCounts[s]})
              </option>
            ))}
          </Select>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(statusCounts).map(([k, v]) => (
          <Badge
            key={k}
            tone={k.includes('resolved') ? 'accent' : k === 'closed' ? 'success' : 'neutral'}
          >
            {String(k).replaceAll('_', ' ')}: {String(v)}
          </Badge>
        ))}
      </div>

      {!items.length ? (
        <EmptyState title="No tickets" />
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <Card
              key={t._id}
              className="cursor-pointer transition hover:border-primary/40"
              onClick={() => openDetail(t)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-primary">{t.ticketNumber}</div>
                  <div className="font-display text-xl">{t.title}</div>
                  <div className="mt-1 text-sm text-text-secondary">
                    {t.tenant?.fullName} · {t.property?.name} · Room{' '}
                    {t.room?.roomNumber || '—'}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge>{t.status.replaceAll('_', ' ')}</Badge>
                  <Badge
                    tone={
                      t.priority === 'urgent' || t.priority === 'high' ? 'error' : 'neutral'
                    }
                  >
                    {t.priority}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.ticket?.ticketNumber || 'Ticket'}
        wide
      >
        {detail && (
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-2xl">{detail.ticket.title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{detail.ticket.description}</p>
              {detail.ticket.resolutionNotes && (
                <p className="mt-2 rounded-lg bg-surface p-3 text-sm">
                  <strong>Resolution:</strong> {detail.ticket.resolutionNotes}
                </p>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Select
                label="Status"
                value={detail.ticket.status}
                disabled={saving}
                onChange={(e) => updateTicket({ status: e.target.value })}
              >
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In progress</option>
                <option value="resolved_awaiting_confirmation">
                  Resolved, awaiting confirmation
                </option>
                <option value="closed">Closed (admin override)</option>
                <option value="reopened">Reopened</option>
              </Select>
              <Select
                label="Assign to"
                value={assignTo}
                disabled={saving}
                onChange={(e) => {
                  setAssignTo(e.target.value)
                  updateTicket({ assignedTo: e.target.value, status: 'assigned' })
                }}
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.role})
                  </option>
                ))}
              </Select>
              <Button
                disabled={saving}
                onClick={() =>
                  updateTicket({ status: 'resolved_awaiting_confirmation' })
                }
              >
                {saving ? 'Saving…' : 'Mark resolved'}
              </Button>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Activity</h4>
                {detailLoading && (
                  <span className="text-xs text-text-secondary">Loading replies…</span>
                )}
              </div>
              <div className="mt-2 space-y-2">
                {(detail.comments || []).map((c: any) => (
                  <div
                    key={c._id}
                    className="rounded-lg border border-border bg-surface p-3 text-sm"
                  >
                    <div className="font-semibold">
                      {c.author?.fullName}{' '}
                      <span className="text-xs font-normal text-neutral">
                        {new Date(c.createdAt).toLocaleString('en-IN')}
                        {c.isInternal ? ' · internal' : ''}
                      </span>
                    </div>
                    <div className="mt-1">{c.body}</div>
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
                  placeholder="Add a reply…"
                  className="flex-1"
                  required
                  disabled={saving}
                />
                <Button type="submit" disabled={saving}>
                  Reply
                </Button>
              </form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
