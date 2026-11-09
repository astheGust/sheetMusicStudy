'use client'

import { GripVertical, Palette, Play } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { composerLabel, formatActivity, type Status } from '@/lib/data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { OptionsMenu } from '../options-menu'
import { ScoreCover } from '../score-cover'
import { statusDotStyle } from '../status-badge'
import { PageHeader } from './page-parts'
import { StatusSetupView } from './status-setup-view'

const COLUMN_HINT: Record<Status, string> = {
  lendo: 'Continue a leitura',
  enferrujada: 'Revise com calma',
  dominada: 'Mantenha no repertório',
}

export function BoardView() {
  const { visibleLibrary, navigate, setStatus, statuses, requireAuthentication } = useStore()
  const [draggedScoreId, setDraggedScoreId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<Status | null>(null)
  const [editingStatuses, setEditingStatuses] = useState(false)

  const allowDrop = (event: DragEvent<HTMLElement>, status: Status) => {
    if (!draggedScoreId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverStatus(status)
  }

  const dropScore = (event: DragEvent<HTMLElement>, status: Status) => {
    event.preventDefault()
    const scoreId = event.dataTransfer.getData('text/plain') || draggedScoreId
    const score = visibleLibrary.find((item) => item.id === scoreId)
    if (score && score.status !== status) setStatus(score.id, status)
    setDraggedScoreId(null)
    setDragOverStatus(null)
  }

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <PageHeader
        eyebrow="Quadro de Estudos"
        title="O que pede sua atenção"
        description="No computador, arraste para outra coluna; no celular, use o menu do cartão para alterar o estado."
      >
        <button
          type="button"
          onClick={() => {
            if (requireAuthentication()) setEditingStatuses(true)
          }}
          className="inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm hover:bg-secondary"
        >
          <Palette className="size-4" /> Personalizar estados
        </button>
      </PageHeader>
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        {statuses.map(({ id: status, name }) => {
          const items = visibleLibrary.filter((s) => s.status === status)
          return (
            <section
              key={status}
              aria-labelledby={`col-${status}`}
              onDragOver={(event) => allowDrop(event, status)}
              onDragLeave={(event) => {
                if (
                  !(event.relatedTarget instanceof Node) ||
                  !event.currentTarget.contains(event.relatedTarget)
                ) {
                  setDragOverStatus(null)
                }
              }}
              onDrop={(event) => dropScore(event, status)}
              className={cn(
                'flex min-h-48 min-w-0 flex-col rounded-3xl border bg-surface p-3 transition-colors',
                dragOverStatus === status && 'border-primary/60 bg-primary/5',
              )}
            >
              <header className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 px-2 pt-1 pb-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-2 rounded-full" style={statusDotStyle(statuses, status)} aria-hidden />
                  <h2 id={`col-${status}`} className="break-words text-sm font-medium [overflow-wrap:anywhere]">
                    {name}
                  </h2>
                  <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {COLUMN_HINT[status] ?? 'Organize seu estudo'}
                </span>
              </header>
              {items.length === 0 ? (
                <p className="min-w-0 rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  Nenhuma partitura aqui.
                </p>
              ) : (
                <ul className="flex min-w-0 flex-col gap-2">
                  {items.map((s) => (
                    <li
                      key={s.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/plain', s.id)
                        setDraggedScoreId(s.id)
                      }}
                      onDragEnd={() => {
                        setDraggedScoreId(null)
                        setDragOverStatus(null)
                      }}
                      className={cn(
                        'flex min-w-0 cursor-grab items-center gap-1.5 rounded-2xl border bg-card p-2 active:cursor-grabbing sm:gap-2 sm:p-2.5',
                        draggedScoreId === s.id && 'opacity-50',
                      )}
                    >
                      <GripVertical
                        className="hidden size-4 shrink-0 text-muted-foreground/60 sm:block"
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={() => navigate({ name: 'detail', id: s.id })}
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:gap-3"
                      >
                        <ScoreCover
                          src={s.cover}
                          title={s.title}
                          status={s.status}
                          statuses={statuses}
                          sizes="40px"
                          className="size-10 shrink-0 rounded-md sm:size-12"
                          textClassName="text-sm"
                        />
                        <span className="min-w-0">
                          <span className="block break-words text-sm leading-snug font-medium text-pretty [overflow-wrap:anywhere]">{s.title}</span>
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
      {editingStatuses && (
        <StatusSetupView
          mode="editor"
          onClose={() => setEditingStatuses(false)}
        />
      )}
    </div>
  )
}
