import { FormEvent, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ImageIcon, Phone } from 'lucide-react'
import api from '../../lib/api'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  Skeleton,
  formatINR,
} from '../../components/ui'
import { useAuth } from '../../lib/auth'

type Filter = 'all' | 'unpaid' | 'paid'

const MONTHS = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export default function PaymentsPage() {
  const { isAdmin } = useAuth()
  const [rents, setRents] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('unpaid')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({ amount: '', method: 'upi', notes: '' })

  async function load() {
    const [r, p] = await Promise.all([
      api.get('/payments/rents', { params: { limit: 50 } }),
      api.get('/payments/list'),
    ])
    setRents(r.data.data || [])
    setPayments(p.data.data || [])
  }

  useEffect(() => {
    load()
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const counts = useMemo(() => {
    const unpaid = rents.filter((r) =>
      ['pending', 'partial', 'overdue'].includes(r.status)
    ).length
    const paid = rents.filter((r) => r.status === 'paid').length
    return { all: rents.length, unpaid, paid }
  }, [rents])

  const visible = useMemo(() => {
    if (filter === 'unpaid') {
      return rents.filter((r) => ['pending', 'partial', 'overdue'].includes(r.status))
    }
    if (filter === 'paid') return rents.filter((r) => r.status === 'paid')
    return rents
  }, [rents, filter])

  const paymentByRent = useMemo(() => {
    const map: Record<string, any> = {}
    for (const p of payments) {
      const key = p.rentRecord?._id || p.rentRecord
      if (!key) continue
      const id = String(key)
      if (!map[id] || new Date(p.paidAt) > new Date(map[id].paidAt)) map[id] = p
    }
    return map
  }, [payments])

  async function generateMonth() {
    try {
      const { data } = await api.post('/payments/rents/generate-month', {})
      toast.success(`Created ${data.created} rent records`)
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  function openRecord(rent: any) {
    setSelected(rent)
    setForm({
      amount: String(Math.max(0, rent.outstanding ?? rent.amountDue - rent.amountPaid)),
      method: 'upi',
      notes: '',
    })
    setOpen(true)
  }

  async function submitPayment(e: FormEvent) {
    e.preventDefault()
    try {
      const { data } = await api.post('/payments/record', {
        tenantId: selected.tenant._id || selected.tenant,
        rentRecordId: selected._id,
        amount: Number(form.amount),
        method: form.method,
        notes: form.notes,
      })
      toast.success(`Recorded · ${data.data.payment.receiptNumber}`)
      setOpen(false)
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral">
            Finance
          </p>
          <h1 className="font-display text-[30px] leading-none tracking-tight text-text-primary">
            Rent & payments
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Who paid / who didn’t. Tenants mark paid themselves — no approval step.
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" variant="secondary" onClick={generateMonth}>
            Generate this month
          </Button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {(
          [
            { key: 'unpaid', label: 'Unpaid' },
            { key: 'paid', label: 'Paid' },
            { key: 'all', label: 'All' },
          ] as const
        ).map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition ${
                active
                  ? 'bg-text-primary text-white'
                  : 'bg-white text-text-secondary ring-1 ring-border hover:text-text-primary'
              }`}
            >
              {f.label}
              <span className={active ? 'text-white/70' : 'text-neutral'}>
                {counts[f.key]}
              </span>
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {visible.map((r) => {
          const phone = r.tenant?.phone
          const pay = paymentByRent[String(r._id)]
          return (
            <article
              key={r._id}
              className="rounded-2xl border border-border bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-text-primary">
                    {r.tenant?.fullName || 'Tenant'}
                  </div>
                  <div className="mt-0.5 text-xs text-text-secondary">
                    {r.property?.name} · {MONTHS[r.periodMonth]} {r.periodYear}
                  </div>
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <Phone size={12} />
                      {phone}
                    </a>
                  )}
                </div>
                <Badge
                  tone={
                    r.status === 'paid'
                      ? 'success'
                      : r.status === 'overdue'
                        ? 'error'
                        : 'warning'
                  }
                >
                  {r.status}
                </Badge>
              </div>

              <div className="mt-3 text-sm text-text-secondary">
                {formatINR(r.amountPaid)} / {formatINR(r.amountDue)}
                {(r.outstanding ?? r.amountDue - r.amountPaid) > 0 && (
                  <span className="ml-1 font-semibold text-text-primary">
                    · Due {formatINR(r.outstanding ?? r.amountDue - r.amountPaid)}
                  </span>
                )}
              </div>

              {pay && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                  {pay.reportedByTenant && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium">
                      Marked by tenant
                    </span>
                  )}
                  <span>{String(pay.method).replaceAll('_', ' ')}</span>
                  {pay.referenceId && <span>Ref {pay.referenceId}</span>}
                  {pay.proofFileKey && (
                    <a
                      href={`/api/files/${pay.proofFileKey}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      <ImageIcon size={12} />
                      Screenshot
                    </a>
                  )}
                </div>
              )}

              {isAdmin && r.status !== 'paid' && (
                <div className="mt-3">
                  <Button size="sm" variant="secondary" onClick={() => openRecord(r)}>
                    Record payment
                  </Button>
                </div>
              )}
            </article>
          )
        })}

        {!visible.length && (
          <EmptyState
            title={filter === 'unpaid' ? 'Everyone is paid up' : 'No rent records'}
            description={
              filter === 'all'
                ? 'Generate this month’s rent to start tracking.'
                : undefined
            }
          />
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Record payment">
        <form className="space-y-4" onSubmit={submitPayment}>
          <p className="text-sm text-text-secondary">
            Recording for <strong>{selected?.tenant?.fullName}</strong>.
          </p>
          <Input
            label="Amount"
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
          <Select
            label="Method"
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
          >
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="card">Card</option>
          </Select>
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <Button type="submit" className="w-full">
            Save payment
          </Button>
        </form>
      </Modal>
    </div>
  )
}
