'use client'

import { ArrowRight, BookOpen, FolderOpen, Music2 } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { Button } from './ui/button'

export const WELCOME_TUTORIAL_KEY = 'cadenza:welcome-tutorial-dismissed:v1'

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

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') continueToApp()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-tutorial-title"
      aria-describedby="welcome-tutorial-description"
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6"
    >
      <section className="w-full max-w-2xl overflow-y-auto rounded-3xl border bg-card p-5 shadow-2xl shadow-black/60 max-h-[calc(100dvh-1.5rem)] sm:p-7 sm:max-h-[calc(100dvh-3rem)]">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-primary/10 text-primary">
            <Music2 className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Seu espaço de estudo</p>
            <h1 id="welcome-tutorial-title" className="font-serif text-3xl tracking-tight sm:text-4xl">
              Bem-vindo ao Cadenza
            </h1>
          </div>
        </div>

        <p id="welcome-tutorial-description" className="mb-5 text-sm leading-6 text-muted-foreground sm:text-base">
          Organize suas partituras, registre anotações e acompanhe sua jornada musical em um só lugar.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <article className="overflow-hidden rounded-2xl border bg-background/60">
            <img
              src="/onboarding/study-progress.jpg"
              alt="Partituras organizadas por progresso de estudo"
              className="h-32 w-full object-cover sm:h-36"
            />
            <div className="flex gap-3 p-3.5">
              <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-medium">Acompanhe seu progresso</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Guarde partituras e veja em que etapa de estudo cada uma está.
                </p>
              </div>
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border bg-background/60">
            <img
              src="/onboarding/study-folders.jpg"
              alt="Pastas para organizar partituras"
              className="h-32 w-full object-cover sm:h-36"
            />
            <div className="flex gap-3 p-3.5">
              <FolderOpen className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-medium">Organize do seu jeito</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Personalize seus status e reúna partituras em pastas.
                </p>
              </div>
            </div>
          </article>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={onLogin}
            className="h-11 w-full rounded-full px-5 sm:flex-1"
            autoFocus
          >
            Entrar ou criar conta
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={continueToApp}
            className="h-11 w-full rounded-full px-5 sm:flex-1"
          >
            Ir para o app <ArrowRight />
          </Button>
        </div>

        <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
            className="size-4 accent-primary"
          />
          Não exibir esta mensagem novamente
        </label>
      </section>
    </div>
  )
}
