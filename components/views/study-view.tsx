'use client'

import { Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { STATUSES, STATUS_LABEL, composerLabel, type Status } from '@/lib/data'
import { getPdfFile } from '@/lib/pdf-storage'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { ScoreCover } from '../score-cover'
import { STATUS_STYLES } from '../status-badge'
import { BackButton } from './page-parts'

export function StudyView({ id }: { id: string }) {
  const { findScore, markStudied, setStatus, notify, back } = useStore()
  const score = findScore(id)
  const [running, setRunning] = useState(true)
  const [seconds, setSeconds] = useState(0)
  const [bpm, setBpm] = useState(72)
  const [outcome, setOutcome] = useState<Status | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [running])

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

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  const finish = () => {
    markStudied(score.id)
    if (outcome && outcome !== score.status) setStatus(score.id, outcome)
    else notify('Sessão registrada. Última atividade: Hoje.')
    back()
  }

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
        <div className="relative flex flex-col items-center gap-8 px-6 py-10 text-center sm:py-14">
          <ScoreCover src={score.cover} title={score.title} sizes="192px" className="size-40 rounded-2xl shadow-2xl shadow-black/60 sm:size-48" />
          <div>
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Sessão de estudo</p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight text-balance">{score.title}</h1>
            <p className="mt-1 text-muted-foreground">{composerLabel(score.composer)}</p>
          </div>

          {score.embedUrl && (
            <div className="aspect-[4/3] min-h-[420px] w-full overflow-hidden rounded-2xl border bg-background sm:aspect-video sm:min-h-[520px]">
              <iframe
                src={score.embedUrl}
                title={score.title}
                className="size-full"
                allow="autoplay; fullscreen; clipboard-write"
                allowFullScreen
              />
            </div>
          )}
          {score.pdfStorageId && (
            <div className="flex w-full flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Arquivo PDF{score.pdfPageCount ? ` · ${score.pdfPageCount} ${score.pdfPageCount === 1 ? 'página' : 'páginas'}` : ''}
              </p>
              <div className="aspect-[4/3] min-h-[420px] w-full overflow-hidden rounded-2xl border bg-background sm:aspect-video sm:min-h-[520px]">
                {pdfUrl ? (
                  <iframe src={pdfUrl} title={`Partitura ${score.title}`} className="size-full" />
                ) : (
                  <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                    Carregando partitura…
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            <p className="font-serif text-6xl tabular-nums" aria-live="off" aria-label={`Tempo de estudo ${mm} minutos e ${ss} segundos`}>
              {mm}:{ss}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-lg" className="rounded-full" onClick={() => setSeconds(0)}>
                <RotateCcw />
                <span className="sr-only">Reiniciar tempo</span>
              </Button>
              <Button size="lg" className="h-11 rounded-full px-6" onClick={() => setRunning((r) => !r)}>
                {running ? <Pause className="fill-current" /> : <Play className="fill-current" />}
                {running ? 'Pausar' : 'Retomar'}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-full border bg-background/60 px-2 py-1.5 backdrop-blur">
            <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => setBpm((b) => Math.max(40, b - 4))}>
              <Minus />
              <span className="sr-only">Diminuir andamento</span>
            </Button>
            <span className="min-w-24 text-sm tabular-nums">
              Metrônomo <strong className="font-medium">{bpm}</strong> bpm
            </span>
            <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => setBpm((b) => Math.min(208, b + 4))}>
              <Plus />
              <span className="sr-only">Aumentar andamento</span>
            </Button>
          </div>
        </div>
      </div>

      <section aria-labelledby="outcome-title" className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 id="outcome-title" className="font-medium">Como foi a sessão?</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Escolha o status que melhor descreve esta partitura agora.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={(outcome ?? score.status) === s}
              onClick={() => setOutcome(s)}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
                (outcome ?? score.status) === s
                  ? cn('ring-1 ring-inset', STATUS_STYLES[s].badge)
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <span className={cn('size-2 rounded-full', STATUS_STYLES[s].dot)} aria-hidden />
              {STATUS_LABEL[s]}
            </button>
          ))}
          <Button size="lg" className="h-9 rounded-full px-5" onClick={finish}>
            Encerrar sessão
          </Button>
        </div>
      </section>
      <p className="text-center text-xs text-muted-foreground">
        Tela de estudo representativa — a sessão completa de prática chegará em uma próxima versão.
      </p>
    </div>
  )
}
