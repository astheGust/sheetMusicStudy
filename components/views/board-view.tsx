'use client'

import { Play } from 'lucide-react'
import { STATUSES, STATUS_LABEL, composerLabel, formatActivity, type Status } from '@/lib/data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { OptionsMenu } from '../options-menu'
import { ScoreCover } from '../score-cover'
import { STATUS_STYLES } from '../status-badge'
import { PageHeader } from './page-parts'

const COLUMN_HINT: Record<Status, string> = {
  lendo: 'Continue a leitura',
  enferrujada: 'Revise com calma',
  dominada: 'Mantenha no repertório',
}

const ORDER: Status[] = ['lendo', 'enferrujada', 'dominada']

export function BoardView() {
  const { visibleLibrary, navigate } = useStore()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Quadro de Estudos"
        title="O que pede sua atenção"
        description="Use o menu de cada partitura para movê-la entre as colunas."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {ORDER.map((status) => {
          const items = visibleLibrary.filter((s) => s.status === status)
          return (
            <section
              key={status}
              aria-labelledby={`col-${status}`}
              className="flex flex-col rounded-3xl border bg-surface p-3"
            >
              <header className="flex items-center justify-between px-2 pt-1 pb-3">
                <div className="flex items-center gap-2">
                  <span className={cn('size-2 rounded-full', STATUS_STYLES[status].dot)} aria-hidden />
                  <h2 id={`col-${status}`} className="text-sm font-medium">
                    {STATUS_LABEL[status]}
                  </h2>
                  <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
                </div>
                <span className="text-xs text-muted-foreground">{COLUMN_HINT[status]}</span>
              </header>
              {items.length === 0 ? (
                <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhuma partitura aqui.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {items.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 rounded-2xl border bg-card p-2.5">
                      <button
                        type="button"
                        onClick={() => navigate({ name: 'detail', id: s.id })}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <ScoreCover src={s.cover} title={s.title} sizes="48px" className="size-12 shrink-0 rounded-md" textClassName="text-sm" />
                        <span className="min-w-0">
                          <span className="block text-sm leading-snug font-medium text-pretty">{s.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {composerLabel(s.composer)} · {formatActivity(s.lastActivity)}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate({ name: 'study', id: s.id })}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full border text-muted-foreground hover:border-primary/40 hover:text-primary"
                      >
                        <Play className="size-3 fill-current" />
                        <span className="sr-only">Estudar {s.title}</span>
                      </button>
                      <OptionsMenu score={s} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

export { STATUSES }
