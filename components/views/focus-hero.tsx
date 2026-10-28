'use client'

import { ArrowRight, FolderInput, Play, Search, Sparkles } from 'lucide-react'
import { composerLabel, formatActivity, type Score } from '@/lib/data'
import { useStore, type Focus } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { ScoreCover } from '../score-cover'
import { StatusBadge } from '../status-badge'

export function pickSuggestion(library: Score[]): Score | undefined {
  const rusty = library
    .filter((s) => s.status === 'enferrujada')
    .sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0))
  if (rusty[0]) return rusty[0]
  const reading = library
    .filter((s) => s.status === 'lendo')
    .sort((a, b) => (a.lastActivity ?? 99) - (b.lastActivity ?? 99))
  return reading[0] ?? library[0]
}

function reasonFor(score: Score) {
  if (score.status === 'enferrujada')
    return `Sem revisão ${score.lastActivity ? `há ${score.lastActivity} dias` : 'recente'}. Uma passada lenta de 15 minutos devolve a fluidez.`
  if (score.status === 'lendo')
    return 'Você está no meio da leitura. Continue de onde parou enquanto a memória está fresca.'
  return 'Já dominada. Toque do início ao fim para manter o repertório vivo.'
}

export function FocusToggle() {
  const { focus, setFocus } = useStore()
  const options: { value: Focus; label: string }[] = [
    { value: 'study', label: 'Continuar estudando' },
    { value: 'organize', label: 'Organizar biblioteca' },
  ]
  return (
    <div role="radiogroup" aria-label="Foco do início" className="inline-flex rounded-full border bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={focus === o.value}
          onClick={() => setFocus(o.value)}
          className={cn(
            'h-8 rounded-full px-4 text-sm transition-all focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            focus === o.value
              ? 'bg-foreground text-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function FocusHero() {
  const { focus } = useStore()
  return (
    <div key={focus} className="animate-in fade-in-0 duration-300">
      {focus === 'study' ? <StudyHero /> : <OrganizeHero />}
    </div>
  )
}

function StudyHero() {
  const { visibleLibrary, navigate } = useStore()
  const score = pickSuggestion(visibleLibrary)
  if (!score) return null

  return (
    <section
      aria-labelledby="hero-title"
      className="relative flex h-full flex-col gap-6 overflow-hidden rounded-3xl border bg-card p-5 sm:flex-row sm:p-6"
    >
      <div
        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-rusty/10 blur-3xl"
        aria-hidden
      />
      <button
        type="button"
        onClick={() => navigate({ name: 'detail', id: score.id })}
        className="relative shrink-0 self-start rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={`Abrir detalhes de ${score.title}`}
      >
        <ScoreCover
          src={score.cover}
          title={score.title}
          priority
          sizes="224px"
          className="size-36 rounded-xl shadow-2xl shadow-black/50 sm:size-52 lg:size-56"
        />
      </button>
      <div className="relative flex min-w-0 flex-1 flex-col">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          <Sparkles className="size-3.5 text-rusty" /> Sugerida para hoje
        </p>
        <h2 id="hero-title" className="mt-2 font-serif text-3xl leading-tight tracking-tight text-balance sm:text-4xl">
          {score.title}
        </h2>
        <p className="mt-1 text-muted-foreground">{composerLabel(score.composer)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <StatusBadge status={score.status} />
          <span className="text-muted-foreground">
            Última atividade: <span className="text-foreground">{formatActivity(score.lastActivity)}</span>
          </span>
        </div>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
          {reasonFor(score)}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          <Button size="lg" className="h-10 rounded-full px-5" onClick={() => navigate({ name: 'study', id: score.id })}>
            <Play className="fill-current" /> Estudar agora
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-10 rounded-full px-5"
            onClick={() => navigate({ name: 'detail', id: score.id })}
          >
            Ver detalhes
          </Button>
        </div>
      </div>
    </section>
  )
}

function OrganizeHero() {
  const { visibleLibrary, navigate } = useStore()
  const withoutFolder = visibleLibrary.filter((s) => s.folders.length === 0)
  const neverStudied = visibleLibrary.filter((s) => s.lastActivity === null)
  const missingInfo = visibleLibrary.filter((s) => !s.composer || !s.cover)
  const queue = [...new Set([...withoutFolder, ...neverStudied, ...missingInfo])].slice(0, 3)

  const focusSearch = () => {
    const input = document.getElementById('search') as HTMLInputElement | null
    input?.focus()
    input?.select()
  }

  return (
    <section
      aria-labelledby="hero-title"
      className="relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card p-5 sm:p-6"
    >
      <div
        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-reading/10 blur-3xl"
        aria-hidden
      />
      <p className="relative inline-flex items-center gap-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
        <FolderInput className="size-3.5 text-reading" /> Organizar biblioteca
      </p>
      <h2 id="hero-title" className="relative mt-2 font-serif text-3xl leading-tight tracking-tight sm:text-4xl">
        Deixe o acervo pronto para a próxima sessão
      </h2>
      <dl className="relative mt-5 grid grid-cols-3 gap-2">
        {[
          { label: 'Sem pasta', value: withoutFolder.length },
          { label: 'Ainda não estudadas', value: neverStudied.length },
          { label: 'Com dados faltando', value: missingInfo.length },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-secondary/60 px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="font-serif text-2xl tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
      {queue.length > 0 && (
        <ul className="relative mt-4 divide-y divide-border rounded-xl border">
          {queue.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => navigate({ name: 'detail', id: s.id })}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:outline-none"
              >
                <ScoreCover src={s.cover} title={s.title} sizes="36px" className="size-9 shrink-0 rounded-md" textClassName="text-xs" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{s.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {s.folders.length === 0
                      ? 'Ainda sem pasta'
                      : s.lastActivity === null
                        ? 'Ainda não estudada'
                        : 'Revise os dados da partitura'}
                  </span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative mt-auto flex flex-wrap gap-2 pt-6">
        <Button size="lg" className="h-10 rounded-full px-5" onClick={() => navigate({ name: 'all' })}>
          Ver todas as partituras
        </Button>
        <Button size="lg" variant="outline" className="h-10 rounded-full px-5" onClick={focusSearch}>
          <Search /> Buscar novas partituras
        </Button>
      </div>
    </section>
  )
}
