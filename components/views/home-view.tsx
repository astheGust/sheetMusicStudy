'use client'

import { ArrowRight, BookOpen, CircleAlert, FileText, Play, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import type { Score, StudyNote } from '@/lib/data'
import { composerLabel, formatActivity, type Status, type StudyStatus } from '@/lib/data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { ScoreCover } from '../score-cover'
import { statusDotStyle, StatusBadge } from '../status-badge'

type Activity =
  | { id: string; kind: 'study'; score: Score; sortAt: number }
  | { id: string; kind: 'note'; score: Score; note: StudyNote; sortAt: number }

type HistoryLayout = 'cards' | 'compact'

const DAY_MS = 24 * 60 * 60 * 1000

export function HomeView() {
  const {
    loadState,
    retry,
    library,
    visibleLibrary,
    derivedCounts,
    statuses,
    hiddenIds,
    restoreHidden,
    navigate,
  } = useStore()
  const [layout, setLayout] = useState<HistoryLayout>('cards')
  const [showAllActivity, setShowAllActivity] = useState(false)

  if (loadState === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border bg-card px-6 py-20 text-center">
        <CircleAlert className="size-6 text-destructive" />
        <div>
          <p className="font-medium">Não foi possível abrir sua biblioteca.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Não foi possível ler os dados salvos neste navegador.
          </p>
        </div>
        <Button onClick={retry}>Tentar novamente</Button>
      </div>
    )
  }

  const loading = loadState === 'loading'
  const activity = buildActivity(visibleLibrary)
  const total = statuses.reduce((sum, status) => sum + (derivedCounts[status.id] ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col items-center gap-3 border-b pb-4 text-center">
        <div>
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Seu espaço de estudo</p>
          <h1 className="mt-1 text-3xl font-medium tracking-tight sm:text-4xl">Histórico</h1>
        </div>
        <div className="flex justify-center">
          <Button
            variant="ghost"
            className="h-10 rounded-full px-4 text-sm"
            onClick={() => navigate({ name: 'all' })}
          >
            <FileText className="size-4" />
            Biblioteca
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="h-16 animate-pulse rounded-2xl border bg-card" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl border bg-card" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <ProgressSummary
            counts={derivedCounts}
            statuses={statuses}
            total={total}
            hiddenCount={hiddenIds.length}
            onRestore={restoreHidden}
          />

          <section aria-labelledby="history-title" className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <h2 id="history-title" className="text-xl font-medium tracking-tight">Recentes:</h2>
              <div
                role="group"
                aria-label="Formato das atividades recentes"
                className="inline-flex rounded-lg border bg-surface p-0.5"
              >
                <LayoutButton
                  active={layout === 'cards'}
                  onClick={() => setLayout('cards')}
                >
                  Cards
                </LayoutButton>
                <LayoutButton
                  active={layout === 'compact'}
                  onClick={() => setLayout('compact')}
                >
                  Compacta
                </LayoutButton>
              </div>
            </div>

            {activity.length === 0 ? (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-dashed px-4 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <BookOpen className="size-5 shrink-0 text-muted-foreground" />
                  <p className="text-sm font-medium">Seu histórico começa na próxima sessão</p>
                </div>
                {library.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 rounded-full"
                    onClick={() => navigate({ name: 'all' })}
                  >
                    Ver biblioteca
                  </Button>
                )}
              </div>
            ) : layout === 'cards' ? (
              <ActivityCards
                activity={activity.slice(0, showAllActivity ? activity.length : 4)}
                onOpen={(id) => navigate({ name: 'study', id })}
              />
            ) : (
              <CompactActivity
                activity={activity.slice(0, showAllActivity ? activity.length : 4)}
                onOpen={(id) => navigate({ name: 'study', id })}
              />
            )}
            {activity.length > 4 && (
              <button
                type="button"
                aria-expanded={showAllActivity}
                onClick={() => setShowAllActivity((expanded) => !expanded)}
                className="mt-1 inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {showAllActivity
                  ? 'Mostrar menos'
                  : `Ver mais ${activity.length - 4} ${activity.length - 4 === 1 ? 'atividade' : 'atividades'}`}
                <ArrowRight className={cn('size-3 transition-transform', showAllActivity && '-rotate-90')} />
              </button>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function ProgressSummary({
  counts,
  statuses,
  total,
  hiddenCount,
  onRestore,
}: {
  counts: Record<Status, number>
  statuses: StudyStatus[]
  total: number
  hiddenCount: number
  onRestore: () => void
}) {
  return (
    <aside className="rounded-2xl border bg-card px-4 py-3" aria-labelledby="progress-title">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-2">
          <h2 id="progress-title" className="text-sm font-medium">Progresso</h2>
          <span className="text-xs text-muted-foreground">
            {total} {total === 1 ? 'partitura' : 'partituras'}
          </span>
        </div>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {statuses.map((status) => (
            <li key={status.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full" style={statusDotStyle(statuses, status.id)} aria-hidden />
              {status.name}
              <span className="font-medium tabular-nums text-foreground">{counts[status.id] ?? 0}</span>
            </li>
          ))}
          {hiddenCount > 0 && (
            <li className="text-xs text-muted-foreground">
              <button
                type="button"
                onClick={onRestore}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <RotateCcw className="size-3" />
                Restaurar {hiddenCount}
              </button>
            </li>
          )}
        </ul>
      </div>
      <div
        className="mt-2 flex h-1.5 gap-1 overflow-hidden rounded-full bg-secondary"
        aria-label={statuses.map((status) => `${counts[status.id] ?? 0} ${status.name}`).join(', ')}
        role="img"
      >
        {total > 0 &&
          statuses.map((status) => (
            <span
              key={status.id}
              className="h-full rounded-full"
              style={{
                width: `${((counts[status.id] ?? 0) / total) * 100}%`,
                backgroundColor: statusDotStyle(statuses, status.id).backgroundColor,
              }}
            />
          ))}
      </div>
    </aside>
  )
}

function buildActivity(scores: Score[]): Activity[] {
  const today = new Date()
  today.setHours(12, 0, 0, 0)

  return scores
    .flatMap((score): Activity[] => {
      const entries: Activity[] = []
      if (score.lastActivity !== null) {
        entries.push({
          id: `${score.id}-study`,
          kind: 'study',
          score,
          sortAt: today.getTime() - score.lastActivity * DAY_MS,
        })
      }
      for (const note of score.notes) {
        entries.push({
          id: `${score.id}-${note.id}`,
          kind: 'note',
          score,
          note,
          sortAt: note.createdAt,
        })
      }
      return entries
    })
    .sort((a, b) => b.sortAt - a.sortAt)
    .slice(0, 12)
}

function ActivityCards({
  activity,
  onOpen,
}: {
  activity: Activity[]
  onOpen: (id: string) => void
}) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {activity.map((item) => (
        <li key={item.id} className="min-w-0">
          <ActivityButton item={item} onOpen={onOpen} layout="cards" />
        </li>
      ))}
    </ol>
  )
}

function CompactActivity({
  activity,
  onOpen,
}: {
  activity: Activity[]
  onOpen: (id: string) => void
}) {
  return (
    <ol className="divide-y divide-border rounded-xl border">
      {activity.map((item) => (
        <li key={item.id}>
          <ActivityButton item={item} onOpen={onOpen} layout="compact" />
        </li>
      ))}
    </ol>
  )
}

function ActivityButton({
  item,
  onOpen,
  layout,
}: {
  item: Activity
  onOpen: (id: string) => void
  layout: HistoryLayout
}) {
  const { statuses } = useStore()
  const isNote = item.kind === 'note'
  const date = isNote ? formatNoteDate(item.note.createdAt) : formatActivity(item.score.lastActivity)

  return (
    <button
      type="button"
      onClick={() => onOpen(item.score.id)}
      className={cn(
        'group w-full text-left transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        layout === 'cards'
          ? 'flex h-full min-h-24 gap-2.5 rounded-2xl border bg-card p-2.5 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-secondary/30 hover:shadow-lg hover:shadow-black/10'
          : 'rounded-none px-3 py-3 hover:bg-secondary/60',
      )}
    >
      {layout === 'cards' ? (
        <>
          <ScoreCover
            src={item.score.cover}
            title={item.score.title}
            status={item.score.status}
            statuses={statuses}
            sizes="72px"
            className="size-16 shrink-0 rounded-lg sm:size-[72px]"
            textClassName="text-xl"
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                {isNote ? (
                  <FileText className="size-3 text-primary" aria-hidden />
                ) : (
                  <Play className="size-3 fill-current" aria-hidden />
                )}
                {isNote ? 'Anotação' : 'Sessão'}
              </span>
              <time
                dateTime={isNote ? new Date(item.note.createdAt).toISOString() : undefined}
                className="shrink-0 text-[11px] text-muted-foreground"
              >
                {date}
              </time>
            </span>
            <span className="mt-1 line-clamp-1 text-sm font-medium leading-tight">
              {item.score.title}
            </span>
            <span className="mt-0.5 truncate text-xs text-muted-foreground">
              {composerLabel(item.score.composer)}
            </span>
            {isNote ? (
              <span className="mt-1 line-clamp-1 text-xs leading-relaxed text-foreground/75">
                {item.note.content}
              </span>
            ) : (
              <span className="mt-1">
                <StatusBadge status={item.score.status} statuses={statuses} className="px-2 py-0 text-[10px]" />
              </span>
            )}
          </span>
          <ArrowRight className="mt-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden />
        </>
      ) : (
        <>
          <span className="flex min-w-0 items-center gap-2">
            {isNote ? (
              <FileText className="size-3.5 shrink-0 text-primary" aria-hidden />
            ) : (
              <Play className="size-3 shrink-0 fill-current text-muted-foreground" aria-hidden />
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.score.title}</span>
            <time
              dateTime={isNote ? new Date(item.note.createdAt).toISOString() : undefined}
              className="shrink-0 text-xs text-muted-foreground"
            >
              {date}
            </time>
          </span>
          <span className="mt-1 block pl-[22px] text-xs text-muted-foreground">
            {isNote ? (
              <span className="line-clamp-2 whitespace-pre-wrap text-foreground/75 [overflow-wrap:anywhere]">{item.note.content}</span>
            ) : (
              <span className="flex flex-wrap items-center gap-2">
                Último estudo
                <StatusBadge status={item.score.status} statuses={statuses} className="px-2 py-0 text-[10px]" />
              </span>
            )}
          </span>
        </>
      )}
    </button>
  )
}

function LayoutButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'h-7 rounded-md px-2.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function formatNoteDate(timestamp: number) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(timestamp)
}
