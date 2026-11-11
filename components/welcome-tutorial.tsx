'use client'

import { ArrowRight, BookOpen, FolderOpen, Music2, Palette } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type TouchEvent } from 'react'
import { Button } from './ui/button'

export const WELCOME_TUTORIAL_KEY = 'cadenza:welcome-tutorial-dismissed:v1'

const tutorialItems = [
  {
    title: 'Acompanhe seus estudos',
    description: 'Veja suas partituras agrupadas pelo momento de cada uma no seu aprendizado.',
    image: '/onboarding/study-progress.jpg',
    alt: 'Partituras agrupadas por progresso de estudo',
    Icon: BookOpen,
  },
  {
    title: 'Personalize seu progresso',
    description: 'Crie estados com nomes que façam sentido para a sua rotina de estudo.',
    image: '/onboarding/study-statuses.jpg',
    alt: 'Exemplo de estados personalizados para acompanhar partituras',
    Icon: Palette,
  },
  {
    title: 'Organize por pastas',
    description: 'Reúna partituras por artista, projeto ou objetivo.',
    image: '/onboarding/study-folders.jpg',
    alt: 'Pastas para organizar partituras',
    Icon: FolderOpen,
  },
]

export function WelcomeTutorial({
  onLogin,
  onContinue,
  onStorageError,
}: {
  onLogin: () => void
  onContinue: () => void
  onStorageError: (error: unknown) => void
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % tutorialItems.length)
    }, 6_000)
    return () => window.clearInterval(timer)
  }, [])

  const continueToApp = () => {
    if (dontShowAgain) {
      try {
        window.localStorage.setItem(WELCOME_TUTORIAL_KEY, 'true')
      } catch (error) {
        onStorageError(error)
      }
    }
    onContinue()
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') continueToApp()
  }

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    touchStartX.current = event.changedTouches[0]?.screenX ?? null
  }

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const startX = touchStartX.current
    const endX = event.changedTouches[0]?.screenX
    touchStartX.current = null
    if (startX === null || endX === undefined || Math.abs(endX - startX) < 40) return
    const direction = endX < startX ? 1 : -1
    setActiveSlide((current) => (current + direction + tutorialItems.length) % tutorialItems.length)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-tutorial-title"
      aria-describedby="welcome-tutorial-description"
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-6"
    >
      <section className="flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border bg-card p-4 shadow-2xl shadow-black/60 sm:max-h-[calc(100dvh-3rem)] sm:p-7">
        <header className="flex shrink-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary sm:size-11 sm:rounded-2xl">
            <Music2 className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase sm:text-xs">
              Seu espaço de estudo
            </p>
            <h1 id="welcome-tutorial-title" className="font-serif text-2xl tracking-tight sm:text-4xl">
              Bem-vindo ao Cadenza
            </h1>
          </div>
        </header>

        <p
          id="welcome-tutorial-description"
          className="mt-2 shrink-0 text-xs leading-5 text-muted-foreground sm:mt-3 sm:text-base sm:leading-6"
        >
          Organize suas partituras, registre anotações e acompanhe sua jornada musical em um só lugar.
        </p>

        <div
          aria-live="polite"
          className="mt-3 min-h-0 flex-1 overflow-y-auto sm:mt-5 sm:flex-none sm:overflow-visible"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {tutorialItems.map(({ title, description, image, alt, Icon }, index) => (
              <article
                key={title}
                className={`min-w-0 overflow-hidden rounded-2xl border bg-background/60 p-2 sm:block ${
                  index === activeSlide ? 'block' : 'hidden'
                }`}
              >
                <img
                  src={image}
                  alt={alt}
                  className="h-40 w-full rounded-xl bg-background object-contain sm:h-28"
                />
                <div className="flex gap-3 px-2 pt-3 pb-1.5 sm:gap-3.5 sm:px-2.5 sm:pt-3.5">
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-xs font-medium sm:text-sm">{title}</h2>
                    <p className="text-[11px] leading-4 text-muted-foreground sm:text-xs sm:leading-5">
                      {description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <nav
            aria-label="Etapas da apresentação"
            className="mt-2 flex items-center justify-center gap-2 sm:hidden"
          >
            {tutorialItems.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setActiveSlide(index)}
                aria-label={`Mostrar etapa ${index + 1}: ${item.title}`}
                aria-current={index === activeSlide ? 'step' : undefined}
                className={`h-2 rounded-full transition-all ${
                  index === activeSlide ? 'w-5 bg-primary' : 'w-2 bg-muted-foreground/40'
                }`}
              />
            ))}
          </nav>
        </div>

        <footer className="mt-2 shrink-0 sm:mt-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={onLogin}
              className="h-10 w-full rounded-full px-5 text-sm sm:h-11 sm:flex-1"
              autoFocus
            >
              Entrar ou criar conta
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={continueToApp}
              className="h-10 w-full rounded-full px-5 text-sm sm:h-11 sm:flex-1"
            >
              Ir para o app <ArrowRight />
            </Button>
          </div>

          <label className="mt-2 flex min-h-10 cursor-pointer items-center justify-center gap-2 text-xs text-muted-foreground sm:mt-3 sm:justify-start sm:text-sm">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.target.checked)}
              className="size-4 shrink-0 accent-primary"
            />
            Não exibir esta mensagem novamente
          </label>
        </footer>
      </section>
    </div>
  )
}
