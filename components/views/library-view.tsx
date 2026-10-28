'use client'

import { FolderOpen } from 'lucide-react'
import { useState } from 'react'
import { FOLDERS, type FolderId, type Status } from '@/lib/data'
import { useStore } from '@/lib/store'
import { Button } from '../ui/button'
import { ScoreCardSkeleton } from '../score-card'
import { ScoreGrid } from '../score-grid'
import { StatusFilter } from '../status-badge'
import { PageHeader } from './page-parts'

export function LibraryView({ folderId }: { folderId?: FolderId }) {
  const { visibleLibrary, loadState, navigate, hiddenIds, restoreHidden } = useStore()
  const [filter, setFilter] = useState<Status | null>(null)
  const folder = folderId ? FOLDERS.find((f) => f.id === folderId) : undefined
  const scores = folderId
    ? visibleLibrary.filter((s) => s.folders.includes(folderId))
    : visibleLibrary

  const counts = { dominada: 0, enferrujada: 0, lendo: 0 }
  for (const s of scores) counts[s.status]++

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={folder ? 'Pasta' : 'Biblioteca'}
        title={folder ? folder.name : 'Todas as Partituras'}
        description={`${scores.length} ${scores.length === 1 ? 'partitura' : 'partituras'}${
          hiddenIds.length > 0 ? ` · ${hiddenIds.length} oculta${hiddenIds.length > 1 ? 's' : ''}` : ''
        }`}
      >
        {scores.length > 0 && <StatusFilter value={filter} onChange={setFilter} counts={counts} />}
      </PageHeader>

      {hiddenIds.length > 0 && (
        <p className="-mt-4 text-xs text-muted-foreground">
          <button type="button" onClick={restoreHidden} className="font-medium text-foreground/80 hover:underline">
            Mostrar partituras ocultas
          </button>
        </p>
      )}

      {loadState === 'loading' ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <ScoreCardSkeleton key={i} />
          ))}
        </div>
      ) : scores.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed px-6 py-16 text-center">
          <FolderOpen className="size-7 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {folder ? 'Esta pasta ainda não tem partituras.' : 'Sua biblioteca está vazia.'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {folder
                ? 'Quando você organizar partituras aqui, elas aparecerão nesta pasta.'
                : 'Use a busca para encontrar e adicionar sua primeira partitura.'}
            </p>
          </div>
          {folder && (
            <Button variant="outline" onClick={() => navigate({ name: 'all' })}>
              Ver todas as partituras
            </Button>
          )}
        </div>
      ) : (
        <ScoreGrid scores={scores} filter={filter} onClearFilter={() => setFilter(null)} />
      )}

      {folder && scores.length > 0 && (
        <div>
          <Button variant="ghost" className="text-muted-foreground" onClick={() => navigate({ name: 'all' })}>
            Voltar para Todas as Partituras
          </Button>
        </div>
      )}
    </div>
  )
}
