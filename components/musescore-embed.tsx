'use client'

import { AlertCircle, ExternalLink, RotateCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'

export function MuseScoreEmbed({
  src,
  sourceUrl,
  title,
  className,
  frameClassName,
}: {
  src: string
  sourceUrl: string
  title: string
  className?: string
  frameClassName?: string
}) {
  const [attempt, setAttempt] = useState(0)
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading')

  useEffect(() => {
    setLoadState('loading')
    const timer = window.setTimeout(() => {
      setLoadState((state) => state === 'loading' ? 'error' : state)
    }, 20_000)
    return () => window.clearTimeout(timer)
  }, [attempt, src])

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-2xl border bg-card', className)}>
      <div className={cn('aspect-[4/3] min-h-[420px] sm:aspect-video sm:min-h-[520px]', frameClassName)}>
        <iframe
          key={attempt}
          src={src}
          title={title}
          className="size-full"
          loading="eager"
          allow="autoplay; fullscreen; clipboard-write"
          allowFullScreen
          onLoad={() => setLoadState((state) => state === 'error' ? state : 'loaded')}
          onError={() => setLoadState('error')}
        />
      </div>
      {loadState === 'error' ? (
        <div role="alert" className="flex flex-col items-center gap-3 border-t bg-card px-4 py-4 text-center">
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            A partitura não respondeu como esperado. Verifique a URL do MuseScore.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setAttempt((value) => value + 1)}>
              <RotateCw /> Tentar novamente
            </Button>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium hover:bg-secondary"
            >
              Abrir no MuseScore <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      ) : loadState === 'loaded' ? (
        <div className="flex items-center justify-between gap-3 border-t bg-card/80 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            A resposta do MuseScore foi carregada.
          </span>
          <button
            type="button"
            onClick={() => setLoadState('error')}
            className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            A partitura não apareceu?
          </button>
        </div>
      ) : null}
    </div>
  )
}
