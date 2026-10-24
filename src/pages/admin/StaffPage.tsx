import { FormEvent, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  PageHeader,
  Select,
} from '../../components/ui'

export default function StaffPage() {
  const [items, setItems] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'maintenance_staff',
    propertyIds: [] as string[],
  })

  async function load() {
    const [s, p] = await Promise.all([api.get('/staff'), api.get('/properties')])
    setItems(s.data.data || [])
    setProperties(p.data.data || [])
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message))
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await api.post('/staff', form)
      toast.success('Staff account created')
      setOpen(false)
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Roles and property-scoped access for your team"
        actions={<Button onClick={() => setOpen(true)}>Add staff</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((s) => (
          <Card key={s.id}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-xl">{s.fullName}</div>
                <div className="text-sm text-text-secondary">{s.email}</div>
              </div>
              <Badge tone={s.isActive ? 'success' : 'neutral'}>
                {s.role.replaceAll('_', ' ')}
              </Badge>
            </div>
            <div className="mt-3 text-xs text-text-secondary">
              Properties:{' '}
              {(s.assignment?.properties || []).map((p: any) => p.name).join(', ') || 'All/unscoped'}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create staff account">
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Temp password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="property_manager">Property manager</option>
            <option value="maintenance_staff">Maintenance staff</option>
            <option value="cleaning_staff">Cleaning staff</option>
            <option value="accountant">Accountant</option>
            <option value="readonly_staff">Read-only staff</option>
          </Select>
          <Select
            label="Primary property access"
            value={form.propertyIds[0] || ''}
            onChange={(e) => setForm({ ...form, propertyIds: e.target.value ? [e.target.value] : [] })}
          >
            <option value="">Select property</option>
            {properties.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </Select>
          <Button type="submit" className="w-full">Create</Button>
        </form>
      </Modal>
    </div>
  )
}
