'use client'

import { Check, Play } from 'lucide-react'
import { composerLabel, formatActivity, type Score } from '@/lib/data'
import { useStore } from '@/lib/store'
import { OptionsMenu } from './options-menu'
import { ScoreCover } from './score-cover'
import { StatusBadge } from './status-badge'

export function ScoreCard({ score }: { score: Score }) {
  const { navigate, recentlyAddedId } = useStore()
  const openDetail = () => navigate({ name: 'detail', id: score.id })

  return (
    <article className="group relative flex flex-col rounded-2xl border bg-card p-3 transition-colors hover:border-foreground/15 hover:bg-[oklch(0.205_0.009_260)]">
      <button
        type="button"
        onClick={openDetail}
        className="relative block rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={`Abrir detalhes de ${score.title}`}
      >
        <ScoreCover
          src={score.cover}
          title={score.title}
          className="transition-transform duration-300 group-hover:scale-[1.01]"
        />
        {recentlyAddedId === score.id && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-xs font-medium text-mastered backdrop-blur">
            <Check className="size-3" /> Adicionada
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-3 px-1 pt-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] leading-snug font-medium text-pretty">
              <button
                type="button"
                onClick={openDetail}
                className="text-left hover:underline hover:underline-offset-4 focus-visible:underline focus-visible:outline-none"
              >
                {score.title}
              </button>
            </h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {composerLabel(score.composer)}
            </p>
          </div>
          <OptionsMenu score={score} className="-mt-1 -mr-1.5" />
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <StatusBadge status={score.status} className="self-start" />
            <span className="truncate text-xs text-muted-foreground">
              {formatActivity(score.lastActivity)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate({ name: 'study', id: score.id })}
            aria-label={`Estudar ${score.title}`}
            className="inline-flex size-8 shrink-0 items-center justify-center gap-1.5 rounded-full border text-xs sm:w-auto sm:px-3 font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Play className="size-3 fill-current" />
            <span className="hidden sm:inline">Estudar</span>
          </button>
        </div>
      </div>
    </article>
  )
}

export function ScoreCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border bg-card p-3" aria-hidden>
      <div className="aspect-square animate-pulse rounded-lg bg-secondary" />
      <div className="space-y-2 px-1 pt-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
        <div className="h-5 w-20 animate-pulse rounded-full bg-secondary" />
      </div>
    </div>
  )
}
