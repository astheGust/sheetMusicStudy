'use client'

import { Check, Ellipsis, EyeOff } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { STATUSES, STATUS_LABEL, type Score } from '@/lib/data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { STATUS_STYLES } from './status-badge'

export function OptionsMenu({ score, className }: { score: Score; className?: string }) {
  const { setStatus, hide } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"]')?.focus()
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)} onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-expanded:bg-secondary aria-expanded:text-foreground"
      >
        <Ellipsis className="size-4" />
        <span className="sr-only">Opções de {score.title}</span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={`Opções de ${score.title}`}
          className="absolute top-full right-0 z-30 mt-1 w-56 animate-in rounded-xl border bg-popover p-1.5 shadow-2xl shadow-black/50 fade-in-0 zoom-in-95"
        >
          <p className="px-2 pt-1 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            Alterar status
          </p>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitemradio"
              aria-checked={score.status === s}
              onClick={() => {
                if (score.status !== s) setStatus(score.id, s)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            >
              <span className={cn('size-2 rounded-full', STATUS_STYLES[s].dot)} aria-hidden />
              {STATUS_LABEL[s]}
              {score.status === s && <Check className="ml-auto size-4 text-muted-foreground" />}
            </button>
          ))}
          <div className="my-1.5 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              hide(score.id)
              setOpen(false)
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:outline-none"
          >
            <EyeOff className="size-4" />
            Remover da visualização
          </button>
        </div>
      )}
    </div>
  )
}
