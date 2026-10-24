import { FormEvent, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, ExternalLink, Save } from 'lucide-react'
import api from '../../lib/api'
import { Button, Input, Skeleton, Textarea } from '../../components/ui'

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
  includedPropertyIds: string[]
}

const DEFAULT: FormConfig = {
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
  includedPropertyIds: [],
}

export default function RegistrationEditPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [token, setToken] = useState('')
  const [properties, setProperties] = useState<any[]>([])
  const [meta, setMeta] = useState({
    label: '',
    isActive: true,
    expiresAt: '',
    maxUses: '',
  })
  const [cfg, setCfg] = useState<FormConfig>({ ...DEFAULT })

  useEffect(() => {
    api
      .get('/registrations/form')
      .then(({ data }) => {
        const link = data.data
        setToken(link.token)
        setProperties(data.properties || [])
        setMeta({
          label: link.label || '',
          isActive: Boolean(link.isActive),
          expiresAt: link.expiresAt
            ? new Date(link.expiresAt).toISOString().slice(0, 10)
            : '',
          maxUses: link.maxUses != null ? String(link.maxUses) : '',
        })
        const fc = link.formConfig || {}
        setCfg({
          ...DEFAULT,
          ...fc,
          includedPropertyIds: (fc.includedPropertyIds || []).map(String),
        })
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  function setField<K extends keyof FormConfig>(key: K, value: FormConfig[K]) {
    setCfg((c) => ({ ...c, [key]: value }))
  }

  function toggleProperty(id: string) {
    setCfg((c) => {
      const has = c.includedPropertyIds.includes(id)
      // empty array = all properties; first toggle from "all" starts with only this one
      if (!c.includedPropertyIds.length) {
        const allIds = properties.map((p) => String(p._id))
        return {
          ...c,
          includedPropertyIds: allIds.filter((x) => x !== id),
        }
      }
      return {
        ...c,
        includedPropertyIds: has
          ? c.includedPropertyIds.filter((x) => x !== id)
          : [...c.includedPropertyIds, id],
      }
    })
  }

  function selectAllProperties() {
    setCfg((c) => ({ ...c, includedPropertyIds: [] }))
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch('/registrations/form', {
        label: meta.label,
        isActive: meta.isActive,
        expiresAt: meta.expiresAt || null,
        maxUses: meta.maxUses === '' ? null : Number(meta.maxUses),
        formConfig: cfg,
      })
      toast.success('Form saved')
      navigate('/admin/registrations')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const publicUrl = token ? `${window.location.origin}/register/${token}` : ''

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  const fieldToggles: Array<{ key: keyof FormConfig; label: string; hint?: string }> = [
    { key: 'showGender', label: 'Gender' },
    { key: 'showOccupation', label: 'Occupation' },
    { key: 'showEmergencyContact', label: 'Emergency contact' },
    {
      key: 'requireEmergencyContact',
      label: 'Require emergency contact',
      hint: 'Only if emergency contact is shown',
    },
    { key: 'showMoveInDate', label: 'Preferred move-in date' },
    { key: 'showRoomPreference', label: 'Room preference' },
    { key: 'showNotes', label: 'Additional notes' },
  ]

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          to="/admin/registrations"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[28px] leading-none tracking-tight text-text-primary">
            Edit application form
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            One form for every property. Change copy, fields, and which PGs appear.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink size={14} />
          Preview
        </Button>
      </div>

      <form onSubmit={onSave} className="space-y-5">
        <Section title="Link">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Internal name"
              value={meta.label}
              onChange={(e) => setMeta({ ...meta, label: e.target.value })}
            />
            <Input
              label="Expires on"
              type="date"
              value={meta.expiresAt}
              onChange={(e) => setMeta({ ...meta, expiresAt: e.target.value })}
            />
            <Input
              label="Max uses (blank = unlimited)"
              type="number"
              min={1}
              value={meta.maxUses}
              onChange={(e) => setMeta({ ...meta, maxUses: e.target.value })}
            />
            <label className="flex items-end gap-2 pb-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={meta.isActive}
                onChange={(e) => setMeta({ ...meta, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              Form is live
            </label>
          </div>
          <p className="mt-3 break-all font-mono text-[11px] text-neutral">{publicUrl}</p>
        </Section>

        <Section title="Copy & messaging">
          <div className="grid gap-3">
            <Input
              label="Brand name"
              value={cfg.brandName}
              onChange={(e) => setField('brandName', e.target.value)}
            />
            <Input
              label="Headline"
              value={cfg.title}
              onChange={(e) => setField('title', e.target.value)}
            />
            <Input
              label="Subtitle"
              value={cfg.subtitle}
              onChange={(e) => setField('subtitle', e.target.value)}
            />
            <Textarea
              label="Welcome message"
              value={cfg.welcomeMessage}
              onChange={(e) => setField('welcomeMessage', e.target.value)}
            />
            <Input
              label="Submit button label"
              value={cfg.ctaLabel}
              onChange={(e) => setField('ctaLabel', e.target.value)}
            />
            <Input
              label="Success title"
              value={cfg.successTitle}
              onChange={(e) => setField('successTitle', e.target.value)}
            />
            <Textarea
              label="Success message"
              value={cfg.successMessage}
              onChange={(e) => setField('successMessage', e.target.value)}
            />
          </div>
        </Section>

        <Section
          title="Properties on the form"
          hint="Empty selection = all active properties appear in the dropdown."
        >
          <div className="mb-3">
            <button
              type="button"
              onClick={selectAllProperties}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Include all properties
            </button>
            <span className="ml-2 text-xs text-neutral">
              {cfg.includedPropertyIds.length === 0
                ? '(currently: all)'
                : `(${cfg.includedPropertyIds.length} selected)`}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {properties.map((p) => {
              const id = String(p._id)
              const checked =
                cfg.includedPropertyIds.length === 0 ||
                cfg.includedPropertyIds.includes(id)
              return (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-3 py-2.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleProperty(id)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="font-medium text-text-primary">{p.name}</span>
                </label>
              )
            })}
            {!properties.length && (
              <p className="text-sm text-text-secondary">No active properties yet.</p>
            )}
          </div>
        </Section>

        <Section title="Fields on the form">
          <div className="grid gap-2 sm:grid-cols-2">
            {fieldToggles.map((f) => (
              <label
                key={f.key}
                className="flex cursor-pointer flex-col rounded-xl border border-border px-3 py-2.5"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  <input
                    type="checkbox"
                    checked={Boolean(cfg[f.key])}
                    onChange={(e) => setField(f.key, e.target.checked as never)}
                    className="h-4 w-4 rounded border-border"
                  />
                  {f.label}
                </span>
                {f.hint && (
                  <span className="mt-1 pl-6 text-[11px] text-neutral">{f.hint}</span>
                )}
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-neutral">
            Name, email, phone, and property dropdown are always required.
          </p>
        </Section>

        <div className="sticky bottom-4 flex justify-end gap-2 rounded-2xl border border-border bg-white/95 p-3 shadow-lg backdrop-blur">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save size={14} />
            {saving ? 'Saving…' : 'Save form'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5">
      <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
      {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}
