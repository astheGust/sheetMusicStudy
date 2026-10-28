'use client'

import { AlertCircle, Check, FileUp, LoaderCircle, Play, Upload } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type { UploadedPdfReference } from '@/lib/data'
import { savePdfFile } from '@/lib/pdf-storage'
import { useStore } from '@/lib/store'
import { Button } from '../ui/button'
import { BackButton } from './page-parts'

const MAX_FILE_SIZE = 20 * 1024 * 1024

function isUploadedPdfReference(value: unknown): value is UploadedPdfReference {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.fileName === 'string' &&
    typeof candidate.pageCount === 'number' &&
    typeof candidate.source === 'string'
  )
}

export function PdfUploadView() {
  const { addUploadedPdf, findScore, navigate } = useStore()
  const [file, setFile] = useState<File | null>(null)
  const [reference, setReference] = useState<UploadedPdfReference | null>(null)
  const [title, setTitle] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)

  const existing = reference ? findScore(reference.id) : undefined

  useEffect(() => {
    if (!file || !reference) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file, reference])

  const analyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) {
      setError('Selecione um arquivo PDF para continuar.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('O arquivo excede o limite de 20 MB.')
      return
    }

    setAnalyzing(true)
    setError(null)
    setReference(null)
    try {
      const formData = new FormData()
      formData.set('file', file)
      const response = await fetch('/api/score-upload', { method: 'POST', body: formData })
      const result: unknown = await response.json()

      if (!response.ok) {
        const message =
          result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
            ? result.error
            : 'Não foi possível analisar o arquivo.'
        throw new Error(message)
      }
      if (!isUploadedPdfReference(result)) {
        throw new Error('A resposta da análise do arquivo está inválida.')
      }

      setReference(result)
      setTitle(findScore(result.id)?.title ?? '')
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : 'Não foi possível analisar o arquivo. Tente novamente.',
      )
    } finally {
      setAnalyzing(false)
    }
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const savedTitle = title.trim()
    if (!reference || !file) {
      setError('Analise um arquivo PDF válido antes de adicioná-lo.')
      return
    }
    if (!savedTitle) {
      setError('Informe um título para a partitura.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await savePdfFile(reference.id, file)
      addUploadedPdf(reference, savedTitle)
      navigate({ name: 'study', id: reference.id })
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
          Modo de teste: aceitamos qualquer PDF válido e legível. A identificação automática de partituras está
          desativada por enquanto.
        </p>
      </div>

      <form onSubmit={analyze} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5">
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
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null)
              setReference(null)
              setError(null)
            }}
            className="block w-full cursor-pointer rounded-xl border bg-background text-sm text-muted-foreground file:mr-3 file:h-11 file:border-0 file:border-r file:bg-secondary file:px-4 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent"
          />
          <p className="text-xs text-muted-foreground">Tamanho máximo: 20 MB.</p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="lg" className="h-11 rounded-full px-5" onClick={() => navigate({ name: 'home' })}>
            Voltar à biblioteca
          </Button>
          <Button type="submit" size="lg" className="h-11 rounded-full px-6" disabled={analyzing || !file}>
            {analyzing ? <LoaderCircle className="animate-spin" /> : <Upload />}
            {analyzing ? 'Analisando PDF…' : reference ? 'Analisar novamente' : 'Enviar e analisar'}
          </Button>
        </div>
      </form>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      {reference && (
        <>
          <div className="flex items-start gap-3 rounded-xl border border-mastered/25 bg-mastered/5 px-4 py-3 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-mastered" />
            <div className="min-w-0">
              <p className="font-medium">PDF válido e pronto para teste</p>
              <p className="mt-1 break-all text-muted-foreground">
                {reference.fileName} · {reference.pageCount} {reference.pageCount === 1 ? 'página' : 'páginas'}
              </p>
            </div>
          </div>

          {previewUrl && (
            <div className="aspect-[4/3] min-h-[420px] overflow-hidden rounded-2xl border bg-card sm:aspect-video sm:min-h-[520px]">
              <iframe
                src={previewUrl}
                title={`Pré-visualização de ${reference.fileName}`}
                className="size-full"
              />
            </div>
          )}

          <form onSubmit={save} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="uploaded-score-title" className="text-sm font-medium">
                Nome ou título da música <span className="text-destructive" aria-hidden="true">*</span>
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
              <p className="text-xs text-muted-foreground">
                O PDF ficará armazenado neste navegador, sem associação a uma conta.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" size="lg" className="h-11 rounded-full px-5" onClick={() => navigate({ name: 'home' })}>
                Cancelar
              </Button>
              <Button type="submit" size="lg" className="h-11 rounded-full px-6" disabled={saving}>
                {saving ? <LoaderCircle className="animate-spin" /> : existing ? <Play className="fill-current" /> : <FileUp />}
                {saving ? 'Salvando PDF…' : existing ? 'Atualizar título e estudar' : 'Adicionar à biblioteca e estudar'}
              </Button>
            </div>
          </form>
        </>
      )}
    </section>
  )
}
