import { FormEvent, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Button, Card, Input } from '../../components/ui'

export default function TenantProfilePage() {
  const { user, tenant, refresh } = useAuth()
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    emergencyName: tenant?.emergencyContact?.name || '',
    emergencyPhone: tenant?.emergencyContact?.phone || '',
    emergencyRelation: tenant?.emergencyContact?.relation || '',
  })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await api.patch('/auth/me', {
        fullName: form.fullName,
        phone: form.phone,
        emergencyContact: {
          name: form.emergencyName,
          phone: form.emergencyPhone,
          relation: form.emergencyRelation,
        },
      })
      await refresh()
      toast.success('Profile updated')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Profile</h1>
      <Card>
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" value={user?.email || ''} disabled />
          <Input label="Emergency contact name" value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
          <Input label="Emergency phone" value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
          <Input label="Relation" value={form.emergencyRelation} onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })} />
          <p className="text-xs text-neutral">
            Room assignment, payments, and account roles can only be changed by admin staff.
          </p>
          <Button type="submit" className="w-full">Save profile</Button>
        </form>
      </Card>
    </div>
  )
}
