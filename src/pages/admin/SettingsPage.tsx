import { FormEvent, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Bot,
  Building2,
  ExternalLink,
  IndianRupee,
  Mail,
  RefreshCw,
  Save,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import api from '../../lib/api'
import { Button, Input, Select, Skeleton, Textarea } from '../../components/ui'
import { useAuth } from '../../lib/auth'

type MailForm = {
  enabled: boolean
  host: string
  port: string
  secure: boolean
  user: string
  pass: string
  fromName: string
  fromEmail: string
  hasPassword?: boolean
}

type ChatbotForm = {
  enabled: boolean
  provider: string
  model: string
  apiKey: string
  hasApiKey?: boolean
}

type SharingPricesForm = {
  single: string
  double: string
  triple: string
  quad: string
  dorm: string
  other: string
}

type SettingsForm = {
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  appName: string
  defaultRentDueDay: string
  currency: string
  timezone: string
  autoApproveRegistrations: boolean
  ticketCategories: string
  mail: MailForm
  chatbot: ChatbotForm
  sharingPrices: SharingPricesForm
  applySharingPrices: boolean
}

type TabId = 'organization' | 'defaults' | 'pricing' | 'email' | 'chatbot' | 'account'

const TABS: { id: TabId; label: string; icon: typeof Building2 }[] = [
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'defaults', label: 'Defaults', icon: SlidersHorizontal },
  { id: 'pricing', label: 'Bed pricing', icon: IndianRupee },
  { id: 'email', label: 'Email / SMTP', icon: Mail },
  { id: 'chatbot', label: 'AI Chatbot', icon: Bot },
  { id: 'account', label: 'Account', icon: UserRound },
]

const SHARING_FIELDS: { key: keyof SharingPricesForm; label: string; hint: string }[] = [
  { key: 'single', label: '1 sharing (single)', hint: '1 bed per room' },
  { key: 'double', label: '2 sharing', hint: '2 beds per room' },
  { key: 'triple', label: '3 sharing', hint: '3 beds per room' },
  { key: 'quad', label: '4 sharing', hint: '4 beds per room' },
  { key: 'dorm', label: '5+ / dorm', hint: '5 or more beds' },
  { key: 'other', label: 'Other', hint: 'Fallback type' },
]

const empty: SettingsForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  appName: 'Has Tracker',
  defaultRentDueDay: '5',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  autoApproveRegistrations: true,
  ticketCategories: '',
  mail: {
    enabled: false,
    host: '',
    port: '587',
    secure: false,
    user: '',
    pass: '',
    fromName: '',
    fromEmail: '',
  },
  chatbot: {
    enabled: true,
    provider: 'auto',
    model: '',
    apiKey: '',
  },
  sharingPrices: {
    single: '15000',
    double: '12000',
    triple: '10000',
    quad: '8000',
    dorm: '6000',
    other: '9000',
  },
  applySharingPrices: true,
}

export default function SettingsPage() {
  const { user, isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [chunkCount, setChunkCount] = useState<number | null>(null)
  const [tab, setTab] = useState<TabId>('organization')
  const [form, setForm] = useState<SettingsForm>(empty)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/settings')
      const d = data.data
      const s = d.settings || {}
      const m = s.mail || {}
      const c = s.chatbot || {}
      const sp = s.sharingPrices || {}
      setForm({
        name: d.name || '',
        email: d.email || '',
        phone: d.phone || '',
        address: d.address || '',
        city: d.city || '',
        state: d.state || '',
        appName: s.appName || d.name || 'Has Tracker',
        defaultRentDueDay: String(s.defaultRentDueDay ?? 5),
        currency: s.currency || 'INR',
        timezone: s.timezone || 'Asia/Kolkata',
        autoApproveRegistrations: s.autoApproveRegistrations !== false,
        ticketCategories: (s.ticketCategories || []).join(', '),
        mail: {
          enabled: Boolean(m.enabled),
          host: m.host || '',
          port: String(m.port || 587),
          secure: Boolean(m.secure),
          user: m.user || '',
          pass: m.hasPassword ? '********' : '',
          fromName: m.fromName || '',
          fromEmail: m.fromEmail || '',
          hasPassword: Boolean(m.hasPassword),
        },
        chatbot: {
          enabled: c.enabled !== false,
          provider: c.provider || 'auto',
          model: c.model || '',
          apiKey: c.hasApiKey ? '********' : '',
          hasApiKey: Boolean(c.hasApiKey),
        },
        sharingPrices: {
          single: String(sp.single ?? 15000),
          double: String(sp.double ?? 12000),
          triple: String(sp.triple ?? 10000),
          quad: String(sp.quad ?? 8000),
          dorm: String(sp.dorm ?? 6000),
          other: String(sp.other ?? 9000),
        },
        applySharingPrices: true,
      })
      api
        .get('/chat/status')
        .then((r) => setChunkCount(r.data.data?.chunkCount ?? null))
        .catch(() => {})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message))
  }, [])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!isAdmin) return
    setSaving(true)
    try {
      const { data } = await api.patch('/settings', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        state: form.state,
        settings: {
          appName: form.appName,
          defaultRentDueDay: Number(form.defaultRentDueDay) || 5,
          currency: form.currency,
          timezone: form.timezone,
          autoApproveRegistrations: form.autoApproveRegistrations,
          ticketCategories: form.ticketCategories
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean),
          sharingPrices: {
            single: Number(form.sharingPrices.single) || 0,
            double: Number(form.sharingPrices.double) || 0,
            triple: Number(form.sharingPrices.triple) || 0,
            quad: Number(form.sharingPrices.quad) || 0,
            dorm: Number(form.sharingPrices.dorm) || 0,
            other: Number(form.sharingPrices.other) || 0,
          },
          applySharingPrices: form.applySharingPrices,
          mail: {
            enabled: form.mail.enabled,
            host: form.mail.host,
            port: Number(form.mail.port) || 587,
            secure: form.mail.secure,
            user: form.mail.user,
            pass: form.mail.pass,
            fromName: form.mail.fromName || form.appName,
            fromEmail: form.mail.fromEmail || form.mail.user,
          },
          chatbot: {
            enabled: form.chatbot.enabled,
            provider: form.chatbot.provider,
            model: form.chatbot.model,
            apiKey: form.chatbot.apiKey,
          },
        },
      })
      toast.success(data.message || 'Settings saved')
      await load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function testMail() {
    setTesting(true)
    try {
      const { data } = await api.post('/settings/mail/test', {})
      toast.success(data.message || 'Test email sent')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setTesting(false)
    }
  }

  async function reindex() {
    setReindexing(true)
    try {
      const { data } = await api.post('/chat/reindex')
      toast.success(data.message || 'Knowledge refreshed')
      setChunkCount(data.data?.chunks ?? chunkCount)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setReindexing(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col gap-3 overflow-hidden">
        <Skeleton className="h-8 w-36 shrink-0" />
        <Skeleton className="h-10 w-full shrink-0 rounded-lg" />
        <Skeleton className="min-h-0 flex-1 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col overflow-hidden">
      <div className="shrink-0">
        <h1 className="font-display text-[26px] leading-none tracking-tight text-text-primary">
          Settings
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Customize organization, defaults, and SMTP for announcement emails.
        </p>
      </div>

      <div className="mt-3 flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-surface-raised/70 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === id
                ? 'bg-white text-text-primary shadow-sm ring-1 ring-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={onSave} className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-border bg-white">
          {tab === 'organization' && (
            <Panel title="Organization" hint="Brand and contact details shown across the app.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Organization name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={!isAdmin}
                />
                <Input
                  label="App name (shown in emails)"
                  value={form.appName}
                  onChange={(e) => setForm({ ...form, appName: e.target.value })}
                  disabled={!isAdmin}
                  placeholder="Has Tracker"
                />
                <Input
                  label="Contact email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={!isAdmin}
                />
                <Input
                  label="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  disabled={!isAdmin}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    disabled={!isAdmin}
                  />
                </div>
                <Input
                  label="City"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  disabled={!isAdmin}
                />
                <Input
                  label="State"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
            </Panel>
          )}

          {tab === 'defaults' && (
            <Panel title="Defaults" hint="Rent, currency, tickets, and registration form.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Default rent due day"
                  type="number"
                  min={1}
                  max={28}
                  value={form.defaultRentDueDay}
                  onChange={(e) => setForm({ ...form, defaultRentDueDay: e.target.value })}
                  disabled={!isAdmin}
                />
                <Select
                  label="Currency"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  disabled={!isAdmin}
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </Select>
                <Input
                  label="Timezone"
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  disabled={!isAdmin}
                />
                <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-text-primary">
                  <input
                    type="checkbox"
                    checked={form.autoApproveRegistrations}
                    onChange={(e) =>
                      setForm({ ...form, autoApproveRegistrations: e.target.checked })
                    }
                    disabled={!isAdmin}
                    className="h-4 w-4 rounded border-border"
                  />
                  Auto-join registrations (no approval)
                </label>
                <div className="sm:col-span-2">
                  <Textarea
                    label="Ticket categories (comma-separated)"
                    value={form.ticketCategories}
                    onChange={(e) => setForm({ ...form, ticketCategories: e.target.value })}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 text-xs text-text-secondary">
                  Shared registration form for all properties
                </p>
                <Link
                  to="/admin/registrations/edit"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  Edit registration form
                  <ExternalLink size={12} />
                </Link>
              </div>
            </Panel>
          )}

          {tab === 'pricing' && (
            <Panel
              title="Bed pricing by sharing"
              hint="Set monthly rent per bed for each sharing type. Example: 3 sharing = ₹10,000 per bed."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {SHARING_FIELDS.map(({ key, label, hint }) => (
                  <Input
                    key={key}
                    label={label}
                    type="number"
                    min={0}
                    value={form.sharingPrices[key]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sharingPrices: {
                          ...form.sharingPrices,
                          [key]: e.target.value,
                        },
                      })
                    }
                    disabled={!isAdmin}
                    placeholder="0"
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                Used when creating rooms/beds and assigning tenants. Hint:{' '}
                {SHARING_FIELDS.map((f) => f.hint).join(' · ')}
              </p>
              <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <input
                  type="checkbox"
                  checked={form.applySharingPrices}
                  onChange={(e) =>
                    setForm({ ...form, applySharingPrices: e.target.checked })
                  }
                  disabled={!isAdmin}
                  className="h-4 w-4 rounded border-border"
                />
                Apply these prices to all existing rooms &amp; beds on save
              </label>
            </Panel>
          )}

          {tab === 'email' && (
            <Panel
              title="Email / SMTP"
              hint="Announcements are sent from this mailbox. For Gmail, use an app password."
            >
              <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <input
                  type="checkbox"
                  checked={form.mail.enabled}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      mail: { ...form.mail, enabled: e.target.checked },
                    })
                  }
                  disabled={!isAdmin}
                  className="h-4 w-4 rounded border-border"
                />
                Enable email sending
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="SMTP host"
                  value={form.mail.host}
                  onChange={(e) =>
                    setForm({ ...form, mail: { ...form.mail, host: e.target.value } })
                  }
                  disabled={!isAdmin}
                  placeholder="smtp.gmail.com"
                />
                <Input
                  label="Port"
                  type="number"
                  value={form.mail.port}
                  onChange={(e) =>
                    setForm({ ...form, mail: { ...form.mail, port: e.target.value } })
                  }
                  disabled={!isAdmin}
                  placeholder="587"
                />
                <Input
                  label="SMTP user / email"
                  value={form.mail.user}
                  onChange={(e) =>
                    setForm({ ...form, mail: { ...form.mail, user: e.target.value } })
                  }
                  disabled={!isAdmin}
                  placeholder="you@gmail.com"
                />
                <Input
                  label="App password"
                  type="password"
                  value={form.mail.pass}
                  onChange={(e) =>
                    setForm({ ...form, mail: { ...form.mail, pass: e.target.value } })
                  }
                  disabled={!isAdmin}
                  placeholder={form.mail.hasPassword ? '•••••••• (saved)' : 'App password'}
                  autoComplete="new-password"
                />
                <Input
                  label="From name"
                  value={form.mail.fromName}
                  onChange={(e) =>
                    setForm({ ...form, mail: { ...form.mail, fromName: e.target.value } })
                  }
                  disabled={!isAdmin}
                  placeholder={form.appName || 'Has Tracker'}
                />
                <Input
                  label="From email"
                  type="email"
                  value={form.mail.fromEmail}
                  onChange={(e) =>
                    setForm({ ...form, mail: { ...form.mail, fromEmail: e.target.value } })
                  }
                  disabled={!isAdmin}
                  placeholder="same as SMTP user"
                />
                <label className="flex items-end gap-2 pb-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={form.mail.secure}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        mail: { ...form.mail, secure: e.target.checked },
                      })
                    }
                    disabled={!isAdmin}
                    className="h-4 w-4 rounded border-border"
                  />
                  Use SSL (port 465)
                </label>
              </div>

              {isAdmin && (
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={testMail}
                    disabled={testing || !form.mail.enabled}
                  >
                    {testing ? 'Sending…' : 'Send test email to me'}
                  </Button>
                </div>
              )}
            </Panel>
          )}

          {tab === 'chatbot' && (
            <Panel
              title="AI Chatbot (RAG)"
              hint="Indexes properties, rooms, tenants, announcements, tickets, and how-to guides. Refreshes automatically every 10 minutes."
            >
              <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <input
                  type="checkbox"
                  checked={form.chatbot.enabled}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      chatbot: { ...form.chatbot, enabled: e.target.checked },
                    })
                  }
                  disabled={!isAdmin}
                  className="h-4 w-4 rounded border-border"
                />
                Enable floating assistant
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Answer mode"
                  value={form.chatbot.provider}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      chatbot: { ...form.chatbot, provider: e.target.value },
                    })
                  }
                  disabled={!isAdmin}
                >
                  <option value="auto">Auto (API key → smart, else local RAG)</option>
                  <option value="local">Local RAG only (no external AI)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                </Select>
                <Input
                  label="Model (optional)"
                  value={form.chatbot.model}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      chatbot: { ...form.chatbot, model: e.target.value },
                    })
                  }
                  disabled={!isAdmin}
                  placeholder="gemini-2.0-flash or gpt-4o-mini"
                />
                <div className="sm:col-span-2">
                  <Input
                    label="API key (Gemini or OpenAI)"
                    type="password"
                    value={form.chatbot.apiKey}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        chatbot: { ...form.chatbot, apiKey: e.target.value },
                      })
                    }
                    disabled={!isAdmin}
                    placeholder={
                      form.chatbot.hasApiKey ? '•••••••• (saved)' : 'Optional — richer answers'
                    }
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                <p className="text-xs text-text-secondary">
                  Knowledge chunks indexed:{' '}
                  <span className="font-semibold text-text-primary">
                    {chunkCount ?? '…'}
                  </span>
                </p>
                {isAdmin && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={reindex}
                    disabled={reindexing}
                  >
                    <RefreshCw size={14} className={reindexing ? 'animate-spin' : ''} />
                    {reindexing ? 'Training…' : 'Reindex now'}
                  </Button>
                )}
              </div>
            </Panel>
          )}

          {tab === 'account' && (
            <Panel title="Your account">
              <p className="text-sm text-text-primary">{user?.fullName}</p>
              <p className="text-sm text-text-secondary">{user?.email}</p>
              <p className="mt-1 text-xs capitalize text-neutral">
                {user?.role?.replaceAll('_', ' ')}
              </p>
            </Panel>
          )}
        </div>

        {isAdmin && tab !== 'account' && (
          <div className="mt-3 flex shrink-0 justify-end border-t border-border bg-background pt-3">
            <Button type="submit" disabled={saving}>
              <Save size={14} />
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
      {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}
