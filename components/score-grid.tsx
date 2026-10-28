'use client'

import { SearchX } from 'lucide-react'
import { STATUS_LABEL, type Score, type Status } from '@/lib/data'
import { Button } from './ui/button'
import { ScoreCard } from './score-card'

export function ScoreGrid({
  scores,
  filter,
  onClearFilter,
}: {
  scores: Score[]
  filter: Status | null
  onClearFilter: () => void
}) {
  const filtered = filter ? scores.filter((s) => s.status === filter) : scores

  if (filter && filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center">
        <SearchX className="size-6 text-muted-foreground" />
        <div>
          <p className="font-medium">Nenhuma partitura com status {STATUS_LABEL[filter]}.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Limpe o filtro para ver toda a seleção.
          </p>
        </div>
        <Button variant="outline" onClick={onClearFilter}>
          Limpar filtro
        </Button>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {filtered.map((score) => (
        <li key={score.id} className="animate-in fade-in-0 duration-300">
          <ScoreCard score={score} />
        </li>
      ))}
    </ul>
  )
}
