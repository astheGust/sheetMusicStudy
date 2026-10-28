'use client'

import { Minus, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { STATUSES, STATUS_LABEL, type Status } from '@/lib/data'
import { useStore, type Counts } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { STATUS_STYLES } from '../status-badge'

const HINT: Record<Status, string> = {
  dominada: 'Prontas para tocar',
  enferrujada: 'Pedem revisão',
  lendo: 'Em leitura',
}

export function StudyOverview({
  filter,
  onFilter,
}: {
  filter: Status | null
  onFilter: (s: Status | null) => void
}) {
  const { counts, summaryEdited, setSummary, resetSummary } = useStore()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Counts>(counts)
  const total = counts.dominada + counts.enferrujada + counts.lendo

  const startEdit = () => {
    setDraft(counts)
    setEditing(true)
  }

  const change = (s: Status, delta: number) =>
    setDraft((d) => ({ ...d, [s]: Math.max(0, Math.min(999, d[s] + delta)) }))

  return (
    <section
      aria-labelledby="study-overview-title"
      className="flex flex-col rounded-3xl border bg-card p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="study-overview-title" className="text-sm font-medium">
            Visão de estudo
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {total} {total === 1 ? 'partitura acompanhada' : 'partituras acompanhadas'}
          </p>
        </div>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={startEdit} className="text-muted-foreground">
            <Pencil /> Editar
          </Button>
        )}
      </div>

      <div className="mt-5 flex h-2 gap-1 overflow-hidden rounded-full bg-secondary" aria-hidden>
        {total > 0 &&
          STATUSES.map((s) => (
            <div
              key={s}
              className={cn('h-full rounded-full transition-all duration-500', STATUS_STYLES[s].bar)}
              style={{ width: `${(counts[s] / total) * 100}%` }}
            />
          ))}
      </div>

      {editing ? (
        <div className="mt-5 flex flex-1 flex-col">
          <ul className="flex flex-col gap-2">
            {STATUSES.map((s) => (
              <li key={s} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2">
                <span className="flex items-center gap-2 text-sm">
                  <span className={cn('size-2 rounded-full', STATUS_STYLES[s].dot)} aria-hidden />
                  {STATUS_LABEL[s]}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => change(s, -1)}>
                    <Minus />
                    <span className="sr-only">Diminuir {STATUS_LABEL[s]}</span>
                  </Button>
                  <label className="sr-only" htmlFor={`count-${s}`}>
                    Contagem de {STATUS_LABEL[s]}
                  </label>
                  <input
                    id={`count-${s}`}
                    inputMode="numeric"
                    value={draft[s]}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value.replace(/\D/g, '') || '0', 10)
                      setDraft((d) => ({ ...d, [s]: Math.min(999, n) }))
                    }}
                    className="h-7 w-11 rounded-md border bg-background text-center text-sm tabular-nums outline-none focus:ring-3 focus:ring-ring/30"
                  />
                  <Button variant="ghost" size="icon-sm" onClick={() => change(s, 1)}>
                    <Plus />
                    <span className="sr-only">Aumentar {STATUS_LABEL[s]}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setSummary(draft)
                setEditing(false)
              }}
            >
              Salvar contagens
            </Button>
          </div>
        </div>
      ) : (
        <ul className="mt-5 flex flex-1 flex-col gap-1.5">
          {STATUSES.map((s) => (
            <li key={s}>
              <button
                type="button"
                aria-pressed={filter === s}
                onClick={() => onFilter(filter === s ? null : s)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  filter === s && 'bg-secondary',
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className={cn('size-2 rounded-full', STATUS_STYLES[s].dot)} aria-hidden />
                  <span>
                    <span className="block text-sm font-medium">{STATUS_LABEL[s]}</span>
                    <span className="block text-xs text-muted-foreground">{HINT[s]}</span>
                  </span>
                </span>
                <span className="font-serif text-3xl tabular-nums">{counts[s]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {summaryEdited && !editing && (
        <p className="mt-3 text-xs text-muted-foreground">
          Contagens ajustadas manualmente.{' '}
          <button type="button" onClick={resetSummary} className="font-medium text-foreground/80 underline-offset-4 hover:underline">
            Recalcular pela biblioteca
          </button>
        </p>
      )}
    </section>
  )
}
