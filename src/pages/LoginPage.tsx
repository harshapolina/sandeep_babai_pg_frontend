import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../lib/auth'
import { Button, Card, Input } from '../components/ui'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(email, password)
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}`)
      navigate('/admin')
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
            Staff access
          </p>
          <h1 className="mt-3 font-display text-5xl leading-tight text-text-primary md:text-[64px]">
            Has Tracker
          </h1>
          <p className="mt-4 max-w-md text-lg text-text-secondary">
            Sign in to manage properties, rooms, rent, and maintenance.
          </p>
        </div>

        <Card className="w-full max-w-md !bg-background shadow-[0_24px_48px_rgba(28,25,23,0.08)]">
          <h2 className="font-display text-2xl">Staff sign in</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Enter your staff email and password.
          </p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-neutral">
            Tenant?{' '}
            <Link to="/tenant/login" className="font-semibold text-primary hover:underline">
              Sign in with email only
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
