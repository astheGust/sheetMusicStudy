'use client'

import { Check, Play } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { MuseScoreReference } from '@/lib/data'
import { useStore } from '@/lib/store'
import { Button } from '../ui/button'
import { BackButton } from './page-parts'

export function MuseScoreView({ score }: { score: MuseScoreReference }) {
  const { addMuseScore, findScore, navigate } = useStore()
  const owned = findScore(score.id)
  const [title, setTitle] = useState(owned?.title ?? '')
  const [titleError, setTitleError] = useState<string | null>(null)

  const startStudying = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setTitleError('Informe o título da música para continuar.')
      return
    }

    addMuseScore(score, trimmedTitle)
    navigate({ name: 'study', id: score.id })
  }

  return (
    <section className="flex flex-col gap-6">
      <BackButton />
      <div>
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Partitura do MuseScore
        </p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl">Pré-visualização</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Confira a partitura e informe um título para salvá-la no catálogo deste navegador.
        </p>
      </div>

      <div className="aspect-[4/3] min-h-[420px] overflow-hidden rounded-2xl border bg-card sm:aspect-video sm:min-h-[520px]">
        <iframe
          src={score.embedUrl}
          title="Pré-visualização da partitura do MuseScore"
          className="size-full"
          loading="eager"
          allow="autoplay; fullscreen; clipboard-write"
          allowFullScreen
        />
      </div>

      <form onSubmit={startStudying} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="musescore-title" className="text-sm font-medium">
            Nome ou título da música <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <input
            id="musescore-title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setTitleError(null)
            }}
            placeholder="Ex.: Clair de Lune"
            autoComplete="off"
            maxLength={120}
            required
            aria-invalid={titleError !== null}
            aria-describedby={titleError ? 'musescore-title-error' : 'musescore-title-help'}
            className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:ring-3 focus:ring-ring/25"
          />
          {titleError ? (
            <p id="musescore-title-error" role="alert" className="text-sm text-destructive">
              {titleError}
            </p>
          ) : (
            <p id="musescore-title-help" className="text-xs text-muted-foreground">
              O título será usado para identificar a partitura no seu catálogo.
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="lg" className="h-11 rounded-full px-5" onClick={() => navigate({ name: 'home' })}>
            Voltar à biblioteca
          </Button>
          <Button type="submit" size="lg" className="h-11 rounded-full px-6">
            {owned ? <Play className="fill-current" /> : <Check />}
            {owned ? 'Salvar título e estudar' : 'Adicionar e estudar'}
          </Button>
        </div>
      </form>
    </section>
  )
}
