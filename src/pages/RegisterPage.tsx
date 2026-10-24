import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CheckCircle2 } from 'lucide-react'
import api from '../lib/api'
import { Button, Input, Select, Skeleton, Textarea, formatINR } from '../components/ui'

type FormConfig = {
  brandName: string
  title: string
  subtitle: string
  welcomeMessage: string
  ctaLabel: string
  successTitle: string
  successMessage: string
  showEmergencyContact: boolean
  requireEmergencyContact: boolean
  showMoveInDate: boolean
  showRoomPreference: boolean
  showOccupation: boolean
  showGender: boolean
  showNotes: boolean
}

const emptyForm = {
  propertyId: '',
  fullName: '',
  email: '',
  phone: '',
  gender: '',
  occupation: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelation: '',
  preferredMoveInDate: '',
  preferredRoomType: '',
  additionalNotes: '',
}

export default function RegisterPage() {
  const { token } = useParams()
  const [info, setInfo] = useState<any>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [createdCreds, setCreatedCreds] = useState<{
    email?: string
    tempPassword?: string
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const cfg: FormConfig = useMemo(
    () => ({
      brandName: 'Has Tracker',
      title: 'Apply for a bed',
      subtitle: 'One application for all our homes. Pick a property and tell us about you.',
      welcomeMessage: '',
      ctaLabel: 'Submit application',
      successTitle: "You're in",
      successMessage:
        'Your account is ready. Admin will assign your room and bed next.',
      showEmergencyContact: true,
      requireEmergencyContact: false,
      showMoveInDate: true,
      showRoomPreference: true,
      showOccupation: true,
      showGender: true,
      showNotes: true,
      ...(info?.formConfig || {}),
    }),
    [info]
  )

  const selectedProperty = useMemo(
    () => (info?.properties || []).find((p: any) => String(p.id) === form.propertyId),
    [info, form.propertyId]
  )

  useEffect(() => {
    if (!token) return
    api
      .get(`/registrations/public/${token}`)
      .then((r) => {
        setInfo(r.data.data)
        const props = r.data.data.properties || []
        if (props.length === 1) {
          setForm((f) => ({ ...f, propertyId: String(props[0].id) }))
        }
      })
      .catch((e) => setError(e.message))
  }, [token])

  function set(key: keyof typeof emptyForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setFieldErrors((err) => {
      if (!err[key]) return err
      const next = { ...err }
      delete next[key]
      return next
    })
  }

  function validate() {
    const next: Record<string, string> = {}
    if (!form.propertyId) next.propertyId = 'Select a property'
    if (!form.fullName.trim()) next.fullName = 'Name is required'
    if (!form.email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email'
    }
    const digits = form.phone.replace(/\D/g, '')
    if (!form.phone.trim()) next.phone = 'Phone is required'
    else if (digits.length < 10) next.phone = 'Enter at least 10 digits'
    if (cfg.requireEmergencyContact && cfg.showEmergencyContact) {
      if (!form.emergencyName.trim()) next.emergencyName = 'Required'
      if (!form.emergencyPhone.trim()) next.emergencyPhone = 'Required'
    }
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please fix the highlighted fields')
      return
    }
    setSubmitting(true)
    try {
      const { data } = await api.post(`/registrations/public/${token}`, {
        propertyId: form.propertyId,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: cfg.showGender ? form.gender || undefined : undefined,
        occupation: cfg.showOccupation ? form.occupation || undefined : undefined,
        emergencyContact: cfg.showEmergencyContact
          ? {
              name: form.emergencyName,
              phone: form.emergencyPhone,
              relation: form.emergencyRelation,
            }
          : undefined,
        preferredMoveInDate:
          cfg.showMoveInDate && form.preferredMoveInDate
            ? form.preferredMoveInDate
            : undefined,
        preferredRoomType:
          cfg.showRoomPreference && form.preferredRoomType
            ? form.preferredRoomType
            : undefined,
        additionalNotes: cfg.showNotes ? form.additionalNotes : undefined,
      })
      setCreatedCreds({
        email: data.data?.email,
        tempPassword: data.data?.tempPassword,
      })
      setDone(true)
      toast.success('Registered')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <Page>
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <h1 className="font-display text-3xl">Link unavailable</h1>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-primary">
            Sign in
          </Link>
        </div>
      </Page>
    )
  }

  if (!info) {
    return (
      <Page>
        <Skeleton className="mb-4 h-16 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </Page>
    )
  }

  if (done) {
    return (
      <Page>
        <div className="rounded-2xl border border-border bg-white p-8 text-center sm:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <h1 className="mt-4 font-display text-3xl text-text-primary">
            {cfg.successTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-text-secondary">
            {cfg.successMessage}
          </p>
          {selectedProperty && (
            <p className="mt-4 text-sm font-semibold text-text-primary">
              {selectedProperty.name}
            </p>
          )}
          {createdCreds?.tempPassword && (
            <div className="mt-5 rounded-xl border border-border bg-stone-50 px-4 py-3 text-left text-sm">
              <div className="font-semibold text-text-primary">Sign in with</div>
              <div className="mt-1 text-text-secondary">{createdCreds.email}</div>
              <div className="mt-0.5 font-mono text-text-primary">
                {createdCreds.tempPassword}
              </div>
              <p className="mt-2 text-[11px] text-neutral">Save this password — shown once.</p>
            </div>
          )}
          <Link
            to="/login"
            className="mt-6 inline-flex text-sm font-semibold text-primary hover:underline"
          >
            Go to sign in
          </Link>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          {cfg.brandName}
        </p>
        <h1 className="mt-2 font-display text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.1] tracking-tight text-text-primary">
          {cfg.title}
        </h1>
        {cfg.subtitle && (
          <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
            {cfg.subtitle}
          </p>
        )}
        {cfg.welcomeMessage && (
          <p className="mt-4 rounded-xl border border-border bg-white px-4 py-3 text-sm text-text-secondary">
            {cfg.welcomeMessage}
          </p>
        )}
      </header>

      <form className="space-y-6" onSubmit={onSubmit} noValidate>
        {/* Property — always first */}
        <div>
          <Select
            label="Property"
            value={form.propertyId}
            onChange={(e) => set('propertyId', e.target.value)}
            required
          >
            <option value="">Select a property</option>
            {(info.properties || []).map((p: any) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
                {p.city ? ` · ${p.city}` : ''}
              </option>
            ))}
          </Select>
          {fieldErrors.propertyId && (
            <p className="mt-1 text-sm text-error">{fieldErrors.propertyId}</p>
          )}
          {selectedProperty && (
            <div className="mt-3 rounded-xl border border-border bg-white px-4 py-3 text-sm text-text-secondary">
              {selectedProperty.address && <p>{selectedProperty.address}</p>}
              {selectedProperty.defaultRentAmount != null && (
                <p className="mt-1 font-semibold text-text-primary">
                  From {formatINR(selectedProperty.defaultRentAmount)}/mo
                </p>
              )}
            </div>
          )}
        </div>

        <FieldGroup title="Your details">
          <Input
            label="Full name"
            autoComplete="name"
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            error={fieldErrors.fullName}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              error={fieldErrors.email}
              required
            />
            <Input
              label="Phone"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              error={fieldErrors.phone}
              required
            />
          </div>
          {(cfg.showGender || cfg.showOccupation) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {cfg.showGender && (
                <Select
                  label="Gender"
                  value={form.gender}
                  onChange={(e) => set('gender', e.target.value)}
                >
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </Select>
              )}
              {cfg.showOccupation && (
                <Input
                  label="Occupation"
                  placeholder="Student / Working"
                  value={form.occupation}
                  onChange={(e) => set('occupation', e.target.value)}
                />
              )}
            </div>
          )}
        </FieldGroup>

        {cfg.showEmergencyContact && (
          <FieldGroup title="Emergency contact">
            <Input
              label="Contact name"
              value={form.emergencyName}
              onChange={(e) => set('emergencyName', e.target.value)}
              error={fieldErrors.emergencyName}
              required={cfg.requireEmergencyContact}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Contact phone"
                type="tel"
                value={form.emergencyPhone}
                onChange={(e) => set('emergencyPhone', e.target.value)}
                error={fieldErrors.emergencyPhone}
                required={cfg.requireEmergencyContact}
              />
              <Input
                label="Relation"
                value={form.emergencyRelation}
                onChange={(e) => set('emergencyRelation', e.target.value)}
              />
            </div>
          </FieldGroup>
        )}

        {(cfg.showMoveInDate || cfg.showRoomPreference || cfg.showNotes) && (
          <FieldGroup title="Preferences">
            <div className="grid gap-3 sm:grid-cols-2">
              {cfg.showMoveInDate && (
                <Input
                  label="Preferred move-in"
                  type="date"
                  value={form.preferredMoveInDate}
                  onChange={(e) => set('preferredMoveInDate', e.target.value)}
                />
              )}
              {cfg.showRoomPreference && (
                <Select
                  label="Room preference"
                  value={form.preferredRoomType}
                  onChange={(e) => set('preferredRoomType', e.target.value)}
                >
                  <option value="">No preference</option>
                  <option value="single">Single</option>
                  <option value="double">Double sharing</option>
                  <option value="triple">Triple sharing</option>
                  <option value="quad">Quad sharing</option>
                </Select>
              )}
            </div>
            {cfg.showNotes && (
              <Textarea
                label="Notes"
                value={form.additionalNotes}
                onChange={(e) => set('additionalNotes', e.target.value)}
                placeholder="Anything we should know?"
              />
            )}
          </FieldGroup>
        )}

        <div className="pt-1">
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Submitting…' : cfg.ctaLabel}
          </Button>
          <p className="mt-3 text-center text-[11px] text-neutral">
            Approval required before a bed is assigned.
          </p>
        </div>
      </form>
    </Page>
  )
}

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#FAFAF9]">
      <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 sm:py-14">{children}</div>
    </div>
  )
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-neutral">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
