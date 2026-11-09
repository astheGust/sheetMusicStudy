'use client'

import { Check, FolderPlus, Play } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { FolderId, MuseScoreReference } from '@/lib/data'
import { useStore } from '@/lib/store'
import { Button } from '../ui/button'
import { BackButton } from './page-parts'
import { MuseScoreEmbed } from '../musescore-embed'

export function MuseScoreView({
  score,
  onAdded,
}: {
  score: MuseScoreReference
  onAdded: () => void
}) {
  const { addScore, findScore, navigate, folders, createFolder, requireAuthentication } = useStore()
  const owned = findScore(score.id)
  const [title, setTitle] = useState(owned?.title ?? '')
  const [composer, setComposer] = useState(owned?.composer ?? '')
  const [selectedFolders, setSelectedFolders] = useState<FolderId[]>(owned?.folders ?? [])
  const [newFolderName, setNewFolderName] = useState('')
  const [titleError, setTitleError] = useState<string | null>(null)

  const startStudying = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!requireAuthentication()) return
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setTitleError('Informe o título da música para continuar.')
      return
    }

    if (!addScore(score, trimmedTitle, composer, selectedFolders)) return
    onAdded()
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

      <MuseScoreEmbed
        src={score.embedUrl}
        sourceUrl={score.source}
        title="Pré-visualização da partitura do MuseScore"
      />

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

        <div className="flex flex-col gap-2">
          <label htmlFor="musescore-composer" className="text-sm font-medium">
            Compositor ou artista <span className="text-xs text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="musescore-composer"
            type="text"
            value={composer}
            onChange={(event) => setComposer(event.target.value)}
            placeholder="Ex.: Claude Debussy"
            autoComplete="off"
            maxLength={120}
            className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:ring-3 focus:ring-ring/25"
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Pastas <span className="text-xs text-muted-foreground">(opcional)</span></legend>
          {folders.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {folders.map((folder) => (
                <label
                  key={folder.id}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm hover:bg-secondary"
                >
                  <input
                    type="checkbox"
                    checked={selectedFolders.includes(folder.id)}
                    onChange={(event) =>
                      setSelectedFolders((current) =>
                        event.target.checked
                          ? [...current, folder.id]
                          : current.filter((id) => id !== folder.id),
                      )
                    }
                    className="accent-primary"
                  />
                  {folder.name}
                </label>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <label htmlFor="musescore-new-folder" className="sr-only">Nome da nova pasta</label>
            <input
              id="musescore-new-folder"
              type="text"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="Criar nova pasta"
              maxLength={80}
              className="h-10 min-w-48 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/25"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!newFolderName.trim()}
              onClick={() => {
                const folderId = createFolder(newFolderName)
                if (folderId) {
                  setSelectedFolders((current) => [...current, folderId])
                  setNewFolderName('')
                }
              }}
            >
              <FolderPlus /> Criar pasta
            </Button>
          </div>
        </fieldset>

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
