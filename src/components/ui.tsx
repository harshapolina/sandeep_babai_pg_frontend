import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function cn(...parts: Array<string | false | null | undefined>) {
  return clsx(parts)
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg'
  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  }
  const variants = {
    primary:
      'bg-primary text-white hover:bg-primary-hover hover:shadow-[0_4px_12px_rgba(194,65,12,0.25)]',
    secondary:
      'bg-transparent border border-border text-text-primary hover:bg-surface-raised',
    ghost: 'bg-transparent text-text-secondary hover:bg-surface-raised hover:text-text-primary',
    danger: 'bg-error text-white hover:bg-red-700',
  }
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...props} />
  )
}

export function Input({
  className,
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="block text-sm font-semibold text-text-primary">{label}</span>
      )}
      <input
        className={cn(
          'w-full rounded-lg border border-border bg-surface px-3 py-3 text-base text-text-primary outline-none transition placeholder:text-neutral',
          'focus:border-primary focus:ring-[3px] focus:ring-primary/12',
          error && 'border-error',
          className
        )}
        {...props}
      />
      {error && <span className="block text-sm text-error">{error}</span>}
    </label>
  )
}

export function Textarea({
  className,
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="block text-sm font-semibold text-text-primary">{label}</span>
      )}
      <textarea
        className={cn(
          'w-full rounded-lg border border-border bg-surface px-3 py-3 text-base text-text-primary outline-none transition min-h-28',
          'focus:border-primary focus:ring-[3px] focus:ring-primary/12',
          className
        )}
        {...props}
      />
    </label>
  )
}

export function Select({
  className,
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="block text-sm font-semibold text-text-primary">{label}</span>
      )}
      <select
        className={cn(
          'w-full rounded-lg border border-border bg-surface px-3 py-3 text-base text-text-primary outline-none',
          'focus:border-primary focus:ring-[3px] focus:ring-primary/12',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

export function Card({
  children,
  className,
  selected,
  accent,
  onClick,
}: {
  children: ReactNode
  className?: string
  selected?: boolean
  accent?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border border-border bg-surface p-4 transition',
        'hover:shadow-[0_4px_16px_rgba(28,25,23,0.06)]',
        selected && 'border-l-[2px] border-l-primary',
        accent && 'border-l-4',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'error' | 'primary' | 'accent'
}) {
  const tones = {
    neutral: 'bg-stone-100 text-stone-600',
    success: 'bg-green-50 text-success',
    warning: 'bg-amber-50 text-warning',
    error: 'bg-red-50 text-error',
    primary: 'bg-orange-50 text-primary',
    accent: 'bg-amber-100 text-amber-800',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-semibold',
        tones[tone]
      )}
    >
      {children}
    </span>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-[28px] leading-tight text-text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      <h3 className="font-display text-xl text-text-primary">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-raised', className)} />
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  extraWide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
  extraWide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-[0_24px_48px_rgba(28,25,23,0.12)]',
          extraWide ? 'max-w-5xl' : wide ? 'max-w-3xl' : 'max-w-lg'
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} type="button">
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function bedTone(status: string) {
  switch (status) {
    case 'available':
      return 'success' as const
    case 'occupied':
      return 'primary' as const
    case 'reserved':
      return 'accent' as const
    case 'maintenance':
      return 'warning' as const
    default:
      return 'neutral' as const
  }
}

export function formatINR(n: number | undefined | null) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)
}
