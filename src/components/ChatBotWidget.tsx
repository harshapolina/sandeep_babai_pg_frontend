import { FormEvent, useEffect, useRef, useState } from 'react'
import { Bot, Loader2, MessageCircle, Send, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { cn } from './ui'

type Msg = {
  id: string
  role: 'user' | 'assistant'
  text: string
  sources?: { title: string; sourceType: string }[]
}

const SUGGESTIONS_ADMIN = [
  'How do registrations work?',
  'How many free beds do we have?',
  'How do I set up SMTP for announcements?',
  'What are the open maintenance tickets?',
]

const SUGGESTIONS_TENANT = [
  'How do I mark rent as paid?',
  'How do I raise a maintenance ticket?',
  'Where do I see announcements?',
  'What is my rent due day?',
]

export default function ChatBotWidget({ variant = 'admin' }: { variant?: 'admin' | 'tenant' }) {
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi — I’m Has Tracker. Ask anything about this platform. I learn from live data and stay up to date automatically.',
    },
  ])
  const bottomRef = useRef<HTMLDivElement>(null)
  const suggestions = variant === 'tenant' ? SUGGESTIONS_TENANT : SUGGESTIONS_ADMIN

  useEffect(() => {
    api
      .get('/chat/status')
      .then((r) => setEnabled(r.data.data?.enabled !== false))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, busy])

  async function send(text: string) {
    const q = text.trim()
    if (!q || busy) return
    setInput('')
    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text: q }
    setMessages((m) => [...m, userMsg])
    setBusy(true)
    try {
      const { data } = await api.post('/chat', { message: q })
      const a = data.data
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: a.answer || 'No answer returned.',
          sources: a.sources,
        },
      ])
    } catch (err: any) {
      toast.error(err.message)
      setMessages((m) => [
        ...m,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: 'Sorry — I couldn’t answer that right now. Try again in a moment.',
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void send(input)
  }

  if (!enabled) return null

  return (
    <div
      className={cn(
        'fixed z-50',
        variant === 'tenant' ? 'bottom-24 right-4' : 'bottom-5 right-5'
      )}
    >
      {open && (
        <div className="mb-3 flex h-[min(560px,70vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_50px_rgba(28,25,23,0.18)]">
          <div className="flex items-center gap-2 border-b border-border bg-[#FFFCFA] px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-text-primary">Has Tracker</div>
              <div className="text-[11px] text-text-secondary">Live knowledge · always learning</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-raised"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-surface text-text-primary ring-1 ring-border'
                  )}
                >
                  {m.text}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 border-t border-border/60 pt-1.5 text-[10px] text-text-secondary">
                      Sources: {m.sources.slice(0, 3).map((s) => s.title).join(' · ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Loader2 size={12} className="animate-spin" />
                Searching knowledge…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length < 3 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:border-primary/40 hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={onSubmit} className="flex gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/12"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-50"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(194,65,12,0.35)] transition hover:bg-primary-hover"
        aria-label="Open Has Tracker"
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
        {open ? 'Close' : 'Has Tracker'}
      </button>
    </div>
  )
}
