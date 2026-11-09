'use client'

import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { getStatusName, composerLabel, type StudyNote } from '@/lib/data'
import { getPdfFile } from '@/lib/pdf-storage'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { ScoreCover } from '../score-cover'
import { statusBadgeStyle, statusDotStyle } from '../status-badge'
import { BackButton } from './page-parts'
import { MuseScoreEmbed } from '../musescore-embed'

export function StudyView({ id }: { id: string }) {
  const {
    findScore,
    markStudied,
    setStatus,
    addNote,
    updateNote,
    deleteNote,
    notify,
    requireAuthentication,
    statuses,
  } = useStore()
  const score = findScore(id)
  const [content, setContent] = useState('')
  const [editingNote, setEditingNote] = useState<StudyNote | null>(null)
  const [editContent, setEditContent] = useState('')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    if (score) markStudied(score.id)
  }, [score?.id, markStudied])

  useEffect(() => {
    if (!score?.pdfStorageId) return
    let active = true
    let objectUrl: string | null = null

    getPdfFile(score.pdfStorageId)
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
  }, [score?.pdfStorageId, notify])

  if (!score) return null

  const saveNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!requireAuthentication()) return
    if (!content.trim()) return
    addNote(score.id, content)
    setContent('')
  }

  const saveEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!requireAuthentication()) return
    if (!editingNote || !editContent.trim()) return
    updateNote(score.id, editingNote.id, editContent)
    setEditingNote(null)
    setEditContent('')
  }

  const notes = [...score.notes].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="flex flex-col gap-8">
      <BackButton />
      <div className="relative overflow-hidden rounded-3xl border bg-card">
        <div className="pointer-events-none absolute inset-0 opacity-25" aria-hidden>
          {score.cover && (
            <div
              className="size-full scale-110 bg-cover bg-center blur-3xl"
              style={{ backgroundImage: `url(${score.cover})` }}
            />
          )}
        </div>
        <div className="relative flex flex-col items-center gap-6 px-3 py-8 text-center sm:gap-8 sm:px-6 sm:py-14">
          <ScoreCover
            src={score.cover}
            title={score.title}
            status={score.status}
            statuses={statuses}
            sizes="192px"
            className="size-40 rounded-2xl shadow-2xl shadow-black/60 sm:size-48"
          />
          <div>
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Estudando
            </p>
            <h1 className="mt-2 break-words font-serif text-3xl tracking-tight text-balance [overflow-wrap:anywhere] sm:text-4xl">
              {score.title}
            </h1>
            <p className="mt-1 text-muted-foreground">{composerLabel(score.composer)}</p>
          </div>

          {score.embedUrl ? (
            <MuseScoreEmbed
              src={score.embedUrl}
              sourceUrl={score.source}
              title={score.title}
              className="w-full"
            />
          ) : score.pdfStorageId ? (
            <div className="aspect-[4/3] min-h-[420px] w-full overflow-hidden rounded-2xl border bg-background sm:aspect-video sm:min-h-[520px]">
              {pdfUrl ? (
                <iframe src={pdfUrl} title={`Partitura ${score.title}`} className="size-full" />
              ) : (
                <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                  Carregando partitura…
                </div>
              )}
            </div>
          ) : (
            <p className="w-full rounded-2xl border border-dashed px-4 py-10 text-sm text-muted-foreground">
              Esta partitura não possui uma URL incorporada. Atualize o cadastro para visualizar o conteúdo.
            </p>
          )}
        </div>
      </div>

      <section
        aria-labelledby="outcome-title"
        className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div>
          <h2 id="outcome-title" className="font-medium">Estado da partitura</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Selecione o estado atual para mantê-lo salvo na biblioteca.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {statuses.map(({ id: status }) => (
            <button
              key={status}
              type="button"
              aria-pressed={score.status === status}
              onClick={() => score.status !== status && setStatus(score.id, status)}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
                score.status === status
                  ? 'ring-1 ring-inset'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
              style={score.status === status ? statusBadgeStyle(statuses, status) : undefined}
            >
              <span className="size-2 rounded-full" style={statusDotStyle(statuses, status)} aria-hidden />
              {getStatusName(statuses, status)}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="notes-title" className="rounded-3xl border bg-card p-5 sm:p-6">
        <div>
          <h2 id="notes-title" className="font-medium">Anotações de estudo</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Registre observações e acompanhe o histórico por data.
          </p>
        </div>

        <form onSubmit={saveNote} className="mt-5 flex flex-col gap-3">
          <label htmlFor="study-note" className="text-sm font-medium">Nova anotação</label>
          <textarea
            id="study-note"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="O que você praticou ou deseja lembrar?"
            maxLength={2000}
            rows={4}
            className="w-full resize-y rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:ring-3 focus:ring-ring/25"
          />
          <Button type="submit" className="h-10 self-end rounded-full px-5" disabled={!content.trim()}>
            <Plus /> Adicionar anotação
          </Button>
        </form>

        <ol className="mt-6 flex flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-2xl border bg-background/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <time dateTime={new Date(note.createdAt).toISOString()} className="text-xs text-muted-foreground">
                  {formatNoteDate(note.createdAt)}
                  {note.updatedAt && <span> · editada</span>}
                </time>
                {editingNote?.id !== note.id && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingNote(note)
                        setEditContent(note.content)
                      }}
                    >
                      <Pencil /> Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNote(score.id, note.id)}
                    >
                      <Trash2 /> Excluir
                    </Button>
                  </div>
                )}
              </div>
              {editingNote?.id === note.id ? (
                <form onSubmit={saveEdit} className="mt-3 flex flex-col gap-3">
                  <label htmlFor={`edit-note-${note.id}`} className="sr-only">
                    Editar anotação
                  </label>
                  <textarea
                    id={`edit-note-${note.id}`}
                    value={editContent}
                    onChange={(event) => setEditContent(event.target.value)}
                    maxLength={2000}
                    rows={4}
                    className="w-full resize-y rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/40 focus:ring-3 focus:ring-ring/25"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingNote(null)
                        setEditContent('')
                      }}
                    >
                      <X /> Cancelar
                    </Button>
                    <Button type="submit" disabled={!editContent.trim()}>
                      Salvar edição
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">
                  {note.content}
                </p>
              )}
            </li>
          ))}
          {notes.length === 0 && (
            <li className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma anotação por enquanto.
            </li>
          )}
        </ol>
      </section>
    </div>
  )
}

function formatNoteDate(timestamp: number) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}
