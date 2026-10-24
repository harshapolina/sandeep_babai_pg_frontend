import { FormEvent, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Select,
  Skeleton,
  Textarea,
  formatINR,
} from '../../components/ui'

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

export default function TenantPaymentsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [proof, setProof] = useState<File | null>(null)
  const [form, setForm] = useState({
    rentRecordId: '',
    amount: '',
    method: 'upi',
    referenceId: '',
    notes: '',
  })

  const unpaid = useMemo(
    () =>
      (data?.rents || []).filter(
        (r: any) => r.status !== 'paid' && r.status !== 'waived'
      ),
    [data]
  )

  async function load() {
    const r = await api.get('/tenant-portal/payments')
    setData(r.data.data)
    return r.data.data
  }

  useEffect(() => {
    load()
      .then((d) => {
        const first = (d?.rents || []).find(
          (r: any) => r.status !== 'paid' && r.status !== 'waived'
        )
        if (first) {
          setForm((f) => ({
            ...f,
            rentRecordId: first._id,
            amount: String(
              Math.max(0, first.outstanding ?? first.amountDue - first.amountPaid)
            ),
          }))
        }
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  function onRentChange(id: string) {
    const rent = unpaid.find((r: any) => r._id === id)
    setForm((f) => ({
      ...f,
      rentRecordId: id,
      amount: rent
        ? String(Math.max(0, rent.outstanding ?? rent.amountDue - rent.amountPaid))
        : f.amount,
    }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.rentRecordId) return toast.error('Select the rent month')
    setSubmitting(true)
    try {
      const body = new FormData()
      body.append('rentRecordId', form.rentRecordId)
      body.append('amount', form.amount)
      body.append('method', form.method)
      if (form.referenceId) body.append('referenceId', form.referenceId)
      if (form.notes) body.append('notes', form.notes)
      if (proof) body.append('proof', proof)

      await api.post('/tenant-portal/payments/mark-paid', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Marked as paid')
      setProof(null)
      const d = await load()
      const next = (d?.rents || []).find(
        (r: any) => r.status !== 'paid' && r.status !== 'waived'
      )
      setForm({
        rentRecordId: next?._id || '',
        amount: next
          ? String(Math.max(0, next.outstanding ?? next.amountDue - next.amountPaid))
          : '',
        method: 'upi',
        referenceId: '',
        notes: '',
      })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Skeleton className="h-64 rounded-2xl" />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl leading-none text-text-primary">Payments</h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          Pay rent, then mark it done here. Optional screenshot. No approval needed.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral">
          Your stay
        </div>
        <div className="mt-1 font-semibold text-text-primary">
          {data?.tenantName || 'Tenant'}
        </div>
        <div className="mt-0.5 text-sm text-text-secondary">
          {[data?.propertyName, data?.roomLabel].filter(Boolean).join(' · ') ||
            'Room not assigned yet'}
        </div>
      </div>

      {unpaid.length > 0 ? (
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-border bg-white p-4"
        >
          <h2 className="text-sm font-semibold text-text-primary">Mark rent paid</h2>

          <Select
            label="Rent month"
            value={form.rentRecordId}
            onChange={(e) => onRentChange(e.target.value)}
            required
          >
            <option value="">Select month</option>
            {unpaid.map((r: any) => (
              <option key={r._id} value={r._id}>
                {MONTHS[r.periodMonth]} {r.periodYear} · Due{' '}
                {formatINR(r.outstanding ?? r.amountDue - r.amountPaid)}
              </option>
            ))}
          </Select>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Amount"
              type="number"
              min={1}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
            <Select
              label="Paid via"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            >
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </Select>
          </div>

          <Input
            label="UPI / reference (optional)"
            value={form.referenceId}
            onChange={(e) => setForm({ ...form, referenceId: e.target.value })}
            placeholder="Transaction ID"
          />

          <label className="block space-y-1.5">
            <span className="block text-sm font-semibold text-text-primary">
              Screenshot (optional)
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setProof(e.target.files?.[0] || null)}
              className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-text-primary"
            />
            {proof && (
              <span className="text-xs text-neutral">{proof.name}</span>
            )}
          </label>

          <Textarea
            label="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? 'Saving…' : 'Mark as paid'}
          </Button>
        </form>
      ) : (
        <EmptyState
          title="Nothing due"
          description="All listed rent months are paid, or no rent bill has been generated yet."
        />
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-text-primary">All months</h2>
        <div className="space-y-2">
          {(data?.rents || []).map((r: any) => (
            <div
              key={r._id}
              className="flex items-center justify-between rounded-xl border border-border bg-white px-3.5 py-3"
            >
              <div>
                <div className="text-sm font-semibold">
                  {MONTHS[r.periodMonth]} {r.periodYear}
                </div>
                <div className="text-xs text-text-secondary">
                  {formatINR(r.amountPaid)} / {formatINR(r.amountDue)}
                </div>
              </div>
              <Badge tone={r.status === 'paid' ? 'success' : 'warning'}>
                {r.status}
              </Badge>
            </div>
          ))}
          {!data?.rents?.length && (
            <p className="text-sm text-text-secondary">No rent records yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-text-primary">History</h2>
        <div className="space-y-2 rounded-2xl border border-border bg-white p-3">
          {(data?.payments || []).map((p: any) => (
            <div
              key={p._id}
              className="flex items-start justify-between gap-2 border-b border-border py-2 text-sm last:border-0"
            >
              <div>
                <div className="font-semibold">{formatINR(p.amount)}</div>
                <div className="text-xs text-text-secondary">
                  {p.method?.replaceAll('_', ' ')}
                  {p.reportedByTenant ? ' · marked by you' : ''}
                  {p.proofFileKey ? ' · screenshot attached' : ''}
                </div>
              </div>
              <div className="text-xs text-neutral">
                {new Date(p.paidAt).toLocaleDateString('en-IN')}
              </div>
            </div>
          ))}
          {!data?.payments?.length && (
            <p className="py-2 text-sm text-text-secondary">No payments yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}
