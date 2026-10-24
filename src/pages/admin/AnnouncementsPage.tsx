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
  Textarea,
} from '../../components/ui'

export default function AnnouncementsPage() {
  const [items, setItems] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    body: '',
    category: 'general',
    scope: 'all',
    propertyIds: [] as string[],
  })

  async function load() {
    const [a, p] = await Promise.all([api.get('/announcements'), api.get('/properties')])
    setItems(a.data.data || [])
    setProperties(p.data.data || [])
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message))
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      const { data } = await api.post('/announcements', {
        ...form,
        notify: true,
      })
      toast.success(data.message || 'Announcement published')
      setOpen(false)
      setForm({
        title: '',
        body: '',
        category: 'general',
        scope: 'all',
        propertyIds: [],
      })
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Notify one property, selected properties, or everyone"
        actions={<Button onClick={() => setOpen(true)}>New announcement</Button>}
      />

      <div className="space-y-3">
        {items.map((a) => (
          <Card key={a._id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-display text-xl">{a.title}</div>
                <p className="mt-2 text-sm text-text-secondary">{a.body}</p>
              </div>
              <Badge tone="accent">{a.category.replaceAll('_', ' ')}</Badge>
            </div>
            <div className="mt-2 text-xs text-neutral">
              {a.scope === 'all'
                ? 'All properties'
                : (a.properties || []).map((p: any) => p.name).join(', ')}
              {' · '}
              {new Date(a.publishedAt).toLocaleString('en-IN')}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create announcement">
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Textarea label="Message" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="general">General</option>
            <option value="maintenance">Maintenance</option>
            <option value="water_supply">Water supply</option>
            <option value="electricity">Electricity</option>
            <option value="rent_deadline">Rent deadline</option>
            <option value="rules">Rules</option>
          </Select>
          <Select label="Scope" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
            <option value="all">All properties</option>
            <option value="selected">Selected property</option>
          </Select>
          {form.scope === 'selected' && (
            <Select
              label="Property"
              value={form.propertyIds[0] || ''}
              onChange={(e) => setForm({ ...form, propertyIds: [e.target.value] })}
            >
              <option value="">Select</option>
              {properties.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </Select>
          )}
          <Button type="submit" className="w-full">Publish</Button>
        </form>
      </Modal>
    </div>
  )
}
