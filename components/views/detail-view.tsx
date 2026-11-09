'use client'

import { Check, FolderPlus, Info, Play, Plus, Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import {
  composerLabel,
  getStatusName,
  formatActivity,
  normalize,
} from '@/lib/data'
import { getPdfFile } from '@/lib/pdf-storage'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { ScoreCover } from '../score-cover'
import { statusBadgeStyle, statusDotStyle, StatusBadge } from '../status-badge'
import { BackButton } from './page-parts'
import { MuseScoreEmbed } from '../musescore-embed'

export function DetailView({ id, external }: { id: string; external?: boolean }) {
  const {
    findScore,
    findExternal,
    navigate,
    setStatus,
    isInLibrary,
    library,
    folders,
    createFolder,
    setScoreFolder,
    updateScoreComposer,
    notify,
    statuses,
  } = useStore()
  const owned = findScore(id)
  const ext = findExternal(id)
  const score = owned ?? ext
  const [composerDraft, setComposerDraft] = useState(owned?.composer ?? '')
  const [newFolderName, setNewFolderName] = useState('')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!owned?.pdfStorageId) return
    let active = true
    let objectUrl: string | null = null

    getPdfFile(owned.pdfStorageId)
      .then((file) => {
        if (!active) return
        if (!file) {
          notify('O arquivo PDF não foi encontrado neste navegador.')
          return
        }
        objectUrl = URL.createObjectURL(file)
        setPdfUrl(objectUrl)
      })
      .catch(() => {
        if (active) notify('Não foi possível abrir o PDF salvo neste navegador.')
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setPdfUrl(null)
    }
  }, [owned?.pdfStorageId, notify])

  if (!score) {
    return (
      <div className="flex flex-col gap-6">
        <BackButton />
        <p className="text-muted-foreground">Esta partitura não está mais disponível.</p>
      </div>
    )
  }

  const showAsExternal = external === true && ext !== undefined && !owned
  const similar = showAsExternal && ext
    ? library.find((s) => normalize(s.title) === normalize(ext.title))
    : undefined
  const title = score.title
  const composer = score.composer
  const cover = score.cover
  const source = score.source
  const assignedFolders = owned?.folders
    .map((folderId) => folders.find((folder) => folder.id === folderId))
    .filter((folder) => folder !== undefined)

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'Compositor ou artista',
      value: owned ? (
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            updateScoreComposer(owned.id, composerDraft)
          }}
          className="flex flex-wrap gap-2"
        >
          <label htmlFor="score-composer" className="sr-only">Compositor ou artista</label>
          <input
            id="score-composer"
            value={composerDraft}
            onChange={(event) => setComposerDraft(event.target.value)}
            maxLength={120}
            placeholder="Ex.: Claude Debussy"
            className="h-9 min-w-40 flex-1 rounded-lg border bg-background px-2.5 text-sm outline-none focus:ring-3 focus:ring-ring/25"
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={composerDraft.trim() === (owned.composer ?? '')}
          >
            <Save /> Salvar
          </Button>
        </form>
      ) : (
        composer ?? <Missing />
      ),
    },
    { label: 'Origem', value: source || <Missing /> },
  ]
  if (owned) {
    rows.push(
      { label: 'Última atividade', value: formatActivity(owned.lastActivity) },
      {
        label: 'Pastas',
        value: (
          <div className="flex flex-col gap-2">
            {assignedFolders && assignedFolders.length > 0 ? (
              <span className="flex flex-wrap gap-1.5">
                {assignedFolders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => navigate({ name: 'folder', id: folder.id })}
                    className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-secondary"
                  >
                    {folder.name}
                  </button>
                ))}
              </span>
            ) : (
              <span><Missing /></span>
            )}
            {folders.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {folders.map((folder) => (
                  <label
                    key={folder.id}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover:bg-secondary"
                  >
                    <input
                      type="checkbox"
                      checked={owned.folders.includes(folder.id)}
                      onChange={(event) =>
                        setScoreFolder(owned.id, folder.id, event.target.checked)
                      }
                      className="accent-primary"
                    />
                    {folder.name}
                  </label>
                ))}
              </div>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault()
                const folderId = createFolder(newFolderName)
                if (folderId) {
                  setScoreFolder(owned.id, folderId, true)
                  setNewFolderName('')
                }
              }}
              className="flex flex-wrap gap-2"
            >
              <label htmlFor="new-score-folder" className="sr-only">Nome da nova pasta</label>
              <input
                id="new-score-folder"
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                maxLength={80}
                placeholder="Nova pasta"
                className="h-8 min-w-32 flex-1 rounded-lg border bg-background px-2.5 text-xs outline-none focus:ring-3 focus:ring-ring/25"
              />
              <Button type="submit" size="sm" variant="outline" disabled={!newFolderName.trim()}>
                <FolderPlus /> Criar
              </Button>
            </form>
          </div>
        ),
      },
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <BackButton />
      <div className="grid gap-8 md:grid-cols-[minmax(0,320px)_1fr] lg:gap-12">
        <ScoreCover
          src={cover}
          title={title}
          status={owned?.status}
          statuses={owned ? statuses : undefined}
          priority
          sizes="320px"
          className="w-full max-w-xs rounded-2xl shadow-2xl shadow-black/50"
          textClassName="text-6xl"
        />
        <div className="flex min-w-0 flex-col">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {showAsExternal ? 'Descobrir Novas' : 'Na sua biblioteca'}
          </p>
          <h1 className="mt-2 break-words font-serif text-3xl leading-tight tracking-tight text-balance [overflow-wrap:anywhere] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">{composerLabel(composer)}</p>

          {owned && (
            <div className="mt-4">
              <StatusBadge status={owned.status} statuses={statuses} />
            </div>
          )}

          <dl className="mt-8 divide-y divide-border rounded-2xl border bg-card">
            {rows.map((r) => (
              <div key={r.label} className="grid min-w-0 gap-1 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
                <dt className="text-sm text-muted-foreground">{r.label}</dt>
                <dd className="min-w-0 break-words text-sm [overflow-wrap:anywhere]">{r.value}</dd>
              </div>
            ))}
          </dl>

          {owned && (
            <section aria-label="Visualização da partitura" className="mt-6">
              <h2 className="mb-3 text-sm font-medium">Partitura</h2>
              {owned.embedUrl ? (
                <MuseScoreEmbed
                  src={owned.embedUrl}
                  sourceUrl={owned.source}
                  title={owned.title}
                  frameClassName="h-[70svh] min-h-[420px] max-h-[1000px] aspect-auto sm:h-[78vh] sm:min-h-[560px]"
                />
              ) : owned.pdfStorageId ? (
                <div className="h-[70svh] min-h-[420px] max-h-[1000px] overflow-hidden rounded-2xl border bg-background sm:h-[78vh] sm:min-h-[560px]">
                  {pdfUrl ? (
                    <iframe src={pdfUrl} title={`Partitura ${owned.title}`} className="size-full" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                      Carregando partitura…
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
                  Esta partitura ainda não tem um arquivo ou endereço incorporado.
                </p>
              )}
            </section>
          )}

          {owned && (
            <fieldset className="mt-6">
              <legend className="text-sm text-muted-foreground">Status de aprendizado</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {statuses.map(({ id: s }) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={owned.status === s}
                    onClick={() => owned.status !== s && setStatus(owned.id, s)}
                    className={cn(
                      'inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
                      owned.status === s
                        ? 'ring-1 ring-inset'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                    style={owned.status === s ? statusBadgeStyle(statuses, s) : undefined}
                  >
                    <span className="size-2 rounded-full" style={statusDotStyle(statuses, s)} aria-hidden />
                    {getStatusName(statuses, s)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {similar && (
            <p className="mt-6 flex items-start gap-2 rounded-xl border border-reading/25 bg-reading/8 px-4 py-3 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-reading" />
              <span>
                Você já tem uma versão de <strong className="font-medium">{similar.title}</strong> de{' '}
                {composerLabel(similar.composer)}. Compare antes de adicionar para evitar duplicatas.
              </span>
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-2">
            {owned ? (
              <Button size="lg" className="h-11 rounded-full px-6" onClick={() => navigate({ name: 'study', id: owned.id })}>
                <Play className="fill-current" /> Estudar agora
              </Button>
            ) : isInLibrary(id) ? (
              <Button size="lg" className="h-11 rounded-full px-6" disabled>
                <Check /> Já está na sua biblioteca
              </Button>
            ) : (
              <Button size="lg" className="h-11 rounded-full px-6" onClick={() => navigate({ name: 'compare', id })}>
                <Plus /> Adicionar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Missing() {
  return <span className="text-muted-foreground italic">Não informado</span>
}
