'use client'

import { FileUp, FolderPlus, LoaderCircle, Play } from 'lucide-react'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import type { FolderId } from '@/lib/data'
import { savePdfFile } from '@/lib/pdf-storage'
import { useStore } from '@/lib/store'
import { Button } from '../ui/button'
import { BackButton } from './page-parts'

export function PdfUploadView() {
  const { addUploadedPdf, findScore, navigate, folders, createFolder, requireAuthentication } = useStore()
  const [file, setFile] = useState<File | null>(null)
  const [fileId, setFileId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [composer, setComposer] = useState('')
  const [selectedFolders, setSelectedFolders] = useState<FolderId[]>([])
  const [newFolderName, setNewFolderName] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const existing = fileId ? findScore(fileId) : undefined

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    setError(null)
    setFile(null)
    setFileId(null)
    if (!selected) return

    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
      setError('Selecione um arquivo PDF.')
      event.target.value = ''
      return
    }

    setFile(selected)
    setFileId(`pdf-${crypto.randomUUID()}`)
    setTitle('')
    setComposer('')
    setSelectedFolders([])
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!requireAuthentication()) return
    const savedTitle = title.trim()
    if (!file || !fileId) {
      setError('Selecione um arquivo PDF para continuar.')
      return
    }
    if (!savedTitle) {
      setError('Informe um título para a partitura.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await savePdfFile(fileId, file)
      addUploadedPdf(fileId, savedTitle, composer, selectedFolders)
      navigate({ name: 'study', id: fileId })
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? `Não foi possível salvar o PDF neste navegador: ${saveError.message}`
          : 'Não foi possível salvar o PDF neste navegador.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <BackButton />
      <div>
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Biblioteca provisória
        </p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl">Enviar partitura em PDF</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          O arquivo fica salvo neste navegador e será exibido na página de estudo. Não verificamos se o PDF
          contém uma partitura.
        </p>
      </div>

      <form onSubmit={save} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="score-pdf" className="text-sm font-medium">
            Arquivo PDF <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <input
            id="score-pdf"
            name="file"
            type="file"
            accept=".pdf,application/pdf"
            required
            onChange={selectFile}
            className="block w-full cursor-pointer rounded-xl border bg-background text-sm text-muted-foreground file:mr-3 file:h-11 file:border-0 file:border-r file:bg-secondary file:px-4 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent"
          />
          {file && <p className="break-all text-xs text-muted-foreground">{file.name}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="uploaded-score-title" className="text-sm font-medium">
            Título da música <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <input
            id="uploaded-score-title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Clair de Lune"
            maxLength={120}
            required
            className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:ring-3 focus:ring-ring/25"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="uploaded-score-composer" className="text-sm font-medium">
            Compositor ou artista <span className="text-xs text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="uploaded-score-composer"
            name="composer"
            type="text"
            value={composer}
            onChange={(event) => setComposer(event.target.value)}
            placeholder="Ex.: Claude Debussy"
            maxLength={120}
            className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:ring-3 focus:ring-ring/25"
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">
            Pastas <span className="text-xs text-muted-foreground">(opcional)</span>
          </legend>
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
            <label htmlFor="uploaded-new-folder" className="sr-only">Nome da nova pasta</label>
            <input
              id="uploaded-new-folder"
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

        {previewUrl && (
          <div className="aspect-[4/3] min-h-[420px] overflow-hidden rounded-2xl border bg-background sm:aspect-video sm:min-h-[520px]">
            <iframe
              src={previewUrl}
              title={`Pré-visualização de ${file?.name ?? 'partitura'}`}
              className="size-full"
            />
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 rounded-full px-5"
            onClick={() => navigate({ name: 'home' })}
          >
            Voltar à biblioteca
          </Button>
          <Button
            type="submit"
            size="lg"
            className="h-11 rounded-full px-6"
            disabled={saving || !file || !title.trim()}
          >
            {saving ? <LoaderCircle className="animate-spin" /> : existing ? <Play className="fill-current" /> : <FileUp />}
            {saving ? 'Salvando no navegador…' : existing ? 'Atualizar título e estudar' : 'Adicionar e estudar'}
          </Button>
        </div>
      </form>
    </section>
  )
}
