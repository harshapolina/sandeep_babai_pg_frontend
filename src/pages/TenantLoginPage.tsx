import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../lib/auth'
import { Button, Card, Input } from '../components/ui'

export default function TenantLoginPage() {
  const { loginTenant } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await loginTenant(email.trim())
      toast.success(`Welcome, ${user.fullName.split(' ')[0]}`)
      navigate('/tenant')
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(194,65,12,0.1),transparent_45%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Tenant access
          </p>
          <h1 className="mt-2 font-display text-4xl text-text-primary">Has Tracker</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Sign in with the email you used during registration.
          </p>
        </div>

        <Card className="w-full !bg-background shadow-[0_24px_48px_rgba(28,25,23,0.08)]">
          <h2 className="text-xl font-semibold text-text-primary">Tenant sign in</h2>
          <p className="mt-1 text-sm text-text-secondary">No password needed — just your email.</p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@email.com"
            />
            <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
              {loading ? 'Signing in…' : 'Continue'}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-neutral">
          Staff?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Staff sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
