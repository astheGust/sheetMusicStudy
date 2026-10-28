'use client'

import { CircleAlert, Music } from 'lucide-react'
import { useState } from 'react'
import type { Status } from '@/lib/data'
import { useStore } from '@/lib/store'
import { Button } from '../ui/button'
import { ScoreCardSkeleton } from '../score-card'
import { ScoreGrid } from '../score-grid'
import { StatusFilter } from '../status-badge'
import { FocusHero, FocusToggle } from './focus-hero'
import { StudyOverview } from './study-overview'

export function HomeView() {
  const { loadState, retry, visibleLibrary, derivedCounts, hiddenIds, restoreHidden } = useStore()
  const [filter, setFilter] = useState<Status | null>(null)

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
  const isEmpty = !loading && visibleLibrary.length === 0 && hiddenIds.length === 0
  const recent = visibleLibrary.slice(0, 10)
  const recentCounts = { dominada: 0, enferrujada: 0, lendo: 0 }
  for (const s of recent) recentCounts[s.status]++

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Sua biblioteca de partituras</p>
          <h1 className="mt-1 font-serif text-4xl tracking-tight text-balance sm:text-5xl">
            Sua próxima sessão pode começar aqui.
          </h1>
        </div>
        <FocusToggle />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        {loading ? (
          <div className="flex flex-col gap-6 rounded-3xl border bg-card p-6 sm:flex-row" aria-busy="true" aria-label="Carregando destaque">
            <div className="size-52 animate-pulse rounded-xl bg-secondary" />
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-3 w-32 animate-pulse rounded bg-secondary" />
              <div className="h-8 w-2/3 animate-pulse rounded bg-secondary" />
              <div className="h-4 w-40 animate-pulse rounded bg-secondary" />
              <div className="h-10 w-40 animate-pulse rounded-full bg-secondary" />
            </div>
          </div>
        ) : isEmpty ? (
          <EmptyLibraryHero />
        ) : (
          <FocusHero />
        )}
        {loading ? (
          <div className="h-80 animate-pulse rounded-3xl border bg-card" aria-hidden />
        ) : (
          <StudyOverview filter={filter} onFilter={setFilter} />
        )}
      </div>

      <section aria-labelledby="recent-title" className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="recent-title" className="text-xl font-medium tracking-tight">
              Adicionadas Recentemente
            </h2>
            {hiddenIds.length > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {hiddenIds.length} oculta{hiddenIds.length > 1 ? 's' : ''} da visualização ·{' '}
                <button type="button" onClick={restoreHidden} className="font-medium text-foreground/80 hover:underline">
                  Mostrar novamente
                </button>
              </p>
            )}
          </div>
          {!isEmpty && <StatusFilter value={filter} onChange={setFilter} counts={loading ? derivedCounts : recentCounts} />}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <ScoreCardSkeleton key={i} />
            ))}
          </div>
        ) : isEmpty ? (
          <p className="rounded-2xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
            As partituras que você adicionar aparecerão aqui.
          </p>
        ) : (
          <ScoreGrid scores={recent} filter={filter} onClearFilter={() => setFilter(null)} />
        )}
      </section>
    </div>
  )
}

function EmptyLibraryHero() {
  return (
    <section className="flex flex-col items-start justify-center gap-4 rounded-3xl border bg-card p-8">
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Music className="size-5" />
      </div>
      <div>
        <h2 className="font-serif text-3xl tracking-tight">Sua biblioteca ainda está vazia</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          As partituras cadastradas serão exibidas aqui.
        </p>
      </div>
    </section>
  )
}
