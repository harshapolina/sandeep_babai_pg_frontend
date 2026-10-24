import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../lib/auth'
import { Button, Card, Input } from '../components/ui'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@pgplatform.local')
  const [password, setPassword] = useState('Admin@12345')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(email, password)
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}`)
      if (user.role === 'tenant') navigate('/tenant')
      else navigate('/admin')
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(194,65,12,0.1),transparent_45%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-4 py-12 lg:flex-row lg:items-center lg:gap-16">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            PG Management
          </p>
          <h1 className="mt-3 font-display text-5xl leading-tight text-text-primary md:text-[64px]">
            Has Tracker
          </h1>
          <p className="mt-4 max-w-md text-lg text-text-secondary">
            Manage properties, beds, tenants, rent, and maintenance from one calm,
            craft-focused workspace.
          </p>
        </div>

        <Card className="w-full max-w-md !bg-background shadow-[0_24px_48px_rgba(28,25,23,0.08)]">
          <h2 className="font-display text-2xl">Sign in</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Use your admin or tenant credentials.
          </p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <div className="mt-6 rounded-lg border border-border bg-surface p-3 text-xs text-text-secondary">
            <div className="font-semibold text-text-primary">Demo accounts</div>
            <div className="mt-1">Admin: admin@pgplatform.local / Admin@12345</div>
            <div>Tenant: tenant@pgplatform.local / Tenant@12345</div>
            <div>Staff: maintenance@pgplatform.local / Staff@12345</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
