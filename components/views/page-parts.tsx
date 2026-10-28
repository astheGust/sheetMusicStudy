'use client'

import { ArrowLeft } from 'lucide-react'
import { useStore } from '@/lib/store'

export function BackButton({ label = 'Voltar' }: { label?: string }) {
  const { back, canGoBack, navigate } = useStore()
  return (
    <button
      type="button"
      onClick={() => (canGoBack ? back() : navigate({ name: 'home' }))}
      className="inline-flex items-center gap-1.5 rounded-full py-1 pr-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <ArrowLeft className="size-4" />
      {label}
    </button>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{eyebrow}</p>
        )}
        <h1 className="mt-1 font-serif text-4xl tracking-tight text-balance">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}
