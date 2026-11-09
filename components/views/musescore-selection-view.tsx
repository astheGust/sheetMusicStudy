'use client'

import { ArrowRight, Check, FolderPlus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { FolderId, ScoreReference } from '@/lib/data'
import { useStore } from '@/lib/store'
import { Button } from '../ui/button'
import { MuseScoreEmbed } from '../musescore-embed'
import { BackButton } from './page-parts'

type ScoreDraft = {
  score: ScoreReference
  title: string
  composer: string
  folders: FolderId[]
  newFolderName: string
}

export function MuseScoreSelectionView({
  scores,
  onAdded,
}: {
  scores: ScoreReference[]
  onAdded: () => void
}) {
  const { addScores, findScore, navigate, folders, createFolder, requireAuthentication } = useStore()
  const [drafts, setDrafts] = useState<ScoreDraft[]>(() =>
    scores.map((score) => {
      const saved = findScore(score.id)
      return {
        score,
        title: saved?.title ?? score.title,
        composer: saved?.composer ?? '',
        folders: saved?.folders ?? [],
        newFolderName: '',
      }
    }),
  )
  const [removedScoreIds, setRemovedScoreIds] = useState<string[]>([])
  const activeDrafts = drafts.filter((draft) => !removedScoreIds.includes(draft.score.id))

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!requireAuthentication()) return
    const submissions = activeDrafts.map(({ score, title, composer, folders }) => ({
      score,
      title,
      composer,
      folders,
    }))
    if (!addScores(submissions)) return

    onAdded()
    const firstFolder = submissions.find((submission) => submission.folders.length > 0)?.folders[0]
    navigate(firstFolder ? { name: 'folder', id: firstFolder } : { name: 'all' })
  }

  const updateDraft = (scoreId: string, update: Partial<ScoreDraft>) => {
    setDrafts((current) =>
      current.map((draft) => draft.score.id === scoreId ? { ...draft, ...update } : draft),
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <BackButton />
      <header>
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Partituras do MuseScore
        </p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl">Detalhes</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Edite os detalhes de cada partitura e escolha individualmente em quais pastas salvá-la.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-6">
        {activeDrafts.length === 0 ? (
          <div className="rounded-2xl border border-dashed px-5 py-10 text-center">
            <p className="font-medium">Nenhuma partitura selecionada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Volte à busca para selecionar partituras ou retorne à biblioteca.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
          {activeDrafts.map((draft, index) => (
            <article key={draft.score.id} className="flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Partitura {index + 1} de {activeDrafts.length}</p>
                <button
                  type="button"
                  onClick={() => setRemovedScoreIds((current) => [...current, draft.score.id])}
                  aria-label={`Remover ${draft.title} desta seleção`}
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </div>
              <MuseScoreEmbed
                src={draft.score.embedUrl}
                sourceUrl={draft.score.source}
                title={`Pré-visualização da partitura ${draft.title}`}
                frameClassName="h-[min(55svh,340px)] min-h-[260px] aspect-auto sm:h-[340px] sm:min-h-0"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`selected-score-title-${index}`} className="text-sm font-medium">
                    Título <span className="text-destructive" aria-hidden="true">*</span>
                  </label>
                  <input
                    id={`selected-score-title-${index}`}
                    value={draft.title}
                    onChange={(event) => updateDraft(draft.score.id, { title: event.target.value })}
                    maxLength={120}
                    required
                    className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/25"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`selected-score-composer-${index}`} className="text-sm font-medium">
                    Compositor ou artista <span className="text-xs text-muted-foreground">(opcional)</span>
                  </label>
                  <input
                    id={`selected-score-composer-${index}`}
                    value={draft.composer}
                    onChange={(event) => updateDraft(draft.score.id, { composer: event.target.value })}
                    maxLength={120}
                    placeholder="Nome do compositor"
                    className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/25"
                  />
                </div>
              </div>

              <fieldset className="flex flex-col gap-2 border-t pt-3">
                <legend className="text-sm font-medium">
                  Pastas <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                </legend>
                {folders.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {folders.map((folder) => (
                      <label
                        key={folder.id}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs hover:bg-secondary"
                      >
                        <input
                          type="checkbox"
                          checked={draft.folders.includes(folder.id)}
                          onChange={(event) =>
                            updateDraft(draft.score.id, {
                              folders: event.target.checked
                                ? [...draft.folders, folder.id]
                                : draft.folders.filter((id) => id !== folder.id),
                            })
                          }
                          className="accent-primary"
                        />
                        {folder.name}
                      </label>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <label htmlFor={`musescore-new-folder-${index}`} className="sr-only">
                    Nova pasta para {draft.title}
                  </label>
                  <input
                    id={`musescore-new-folder-${index}`}
                    value={draft.newFolderName}
                    onChange={(event) => updateDraft(draft.score.id, { newFolderName: event.target.value })}
                    placeholder="Criar pasta para esta partitura"
                    maxLength={80}
                    className="h-9 min-w-40 flex-1 rounded-xl border bg-background px-3 text-xs outline-none focus:ring-3 focus:ring-ring/25"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!draft.newFolderName.trim()}
                    onClick={() => {
                      const folderId = createFolder(draft.newFolderName)
                      if (!folderId) return
                      updateDraft(draft.score.id, {
                        folders: [...draft.folders, folderId],
                        newFolderName: '',
                      })
                    }}
                  >
                    <FolderPlus /> Criar pasta
                  </Button>
                </div>
              </fieldset>
            </article>
          ))}
          </div>
        )}

        <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <Button type="button" variant="outline" size="lg" onClick={() => navigate({ name: 'home' })}>
            Voltar à biblioteca
          </Button>
          <Button type="submit" size="lg" className="rounded-full px-6" disabled={activeDrafts.length === 0}>
            <Check /> Adicionar {activeDrafts.length} {activeDrafts.length === 1 ? 'partitura' : 'partituras'}
            <ArrowRight />
          </Button>
        </div>
      </form>
    </section>
  )
}
