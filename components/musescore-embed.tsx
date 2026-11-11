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
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'unavailable'>('loading')

  useEffect(() => {
    setLoadState('loading')
    const timer = window.setTimeout(() => {
      setLoadState((state) => state === 'loading' ? 'unavailable' : state)
    }, 20_000)
    return () => window.clearTimeout(timer)
  }, [attempt, src])

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-2xl border bg-card', className)}>
      <div className={cn('aspect-[4/3] min-h-[420px] sm:aspect-video sm:min-h-[520px]', frameClassName)}>
        {loadState === 'unavailable' ? (
          <div role="alert" className="flex size-full min-h-[260px] flex-col items-center justify-center gap-4 bg-muted/30 px-5 py-8 text-center sm:px-8">
            <AlertCircle className="size-8 text-muted-foreground" />
            <div className="max-w-md">
              <h2 className="font-medium">Não foi possível exibir esta partitura aqui</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                O MuseScore pode limitar a exibição incorporada por políticas externas. Tente abrir a partitura diretamente pelo app ou site.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setAttempt((value) => value + 1)}>
                <RotateCw /> Tentar novamente
              </Button>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium hover:bg-secondary"
              >
                Abrir no MuseScore <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        ) : (
          <iframe
            key={attempt}
            src={src}
            title={title}
            className="size-full"
            loading="eager"
            allow="autoplay; fullscreen; clipboard-write"
            allowFullScreen
            onLoad={() => setLoadState((state) => state === 'unavailable' ? state : 'loaded')}
            onError={() => setLoadState('unavailable')}
          />
        )}
      </div>
      {loadState === 'loaded' ? (
        <div className="flex items-center justify-between gap-3 border-t bg-card/80 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            O conteúdo do MuseScore foi carregado.
          </span>
          <button
            type="button"
            onClick={() => setLoadState('unavailable')}
            className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            A partitura não apareceu?
          </button>
        </div>
      ) : null}
    </div>
  )
}
