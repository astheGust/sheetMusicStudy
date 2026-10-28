'use client'

import { Check, Info, Play, Plus } from 'lucide-react'
import {
  FOLDERS,
  STATUSES,
  STATUS_LABEL,
  composerLabel,
  formatActivity,
  normalize,
} from '@/lib/data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { ScoreCover } from '../score-cover'
import { STATUS_STYLES, StatusBadge } from '../status-badge'
import { BackButton } from './page-parts'

export function DetailView({ id, external }: { id: string; external?: boolean }) {
  const { findScore, findExternal, navigate, setStatus, isInLibrary, library } = useStore()
  const owned = findScore(id)
  const ext = findExternal(id)

  if (!owned && !ext) {
    return (
      <div className="flex flex-col gap-6">
        <BackButton />
        <p className="text-muted-foreground">Esta partitura não está mais disponível.</p>
      </div>
    )
  }

  const showAsExternal = external && ext && !owned
  const title = owned?.title ?? ext!.title
  const composer = owned?.composer ?? ext!.composer
  const cover = owned?.cover ?? ext!.cover
  const source = owned?.source ?? ext!.source
  const similar = showAsExternal
    ? library.find((s) => normalize(s.title) === normalize(ext!.title))
    : undefined

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Compositor ou artista', value: composer ?? <Missing /> },
    { label: 'Origem', value: source || <Missing /> },
  ]
  if (owned) {
    rows.push(
      { label: 'Última atividade', value: formatActivity(owned.lastActivity) },
      {
        label: 'Pastas',
        value:
          owned.folders.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {owned.folders.map((fid) => {
                const f = FOLDERS.find((x) => x.id === fid)!
                return (
                  <button
                    key={fid}
                    type="button"
                    onClick={() => navigate({ name: 'folder', id: fid })}
                    className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-secondary"
                  >
                    {f.name}
                  </button>
                )
              })}
            </span>
          ) : (
            <Missing />
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
          priority
          sizes="320px"
          className="w-full max-w-xs rounded-2xl shadow-2xl shadow-black/50"
          textClassName="text-6xl"
        />
        <div className="flex min-w-0 flex-col">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {showAsExternal ? 'Descobrir Novas' : 'Na sua biblioteca'}
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight text-balance sm:text-5xl">
            {title}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">{composerLabel(composer)}</p>

          {owned && (
            <div className="mt-4">
              <StatusBadge status={owned.status} />
            </div>
          )}

          <dl className="mt-8 divide-y divide-border rounded-2xl border bg-card">
            {rows.map((r) => (
              <div key={r.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                <dt className="text-sm text-muted-foreground">{r.label}</dt>
                <dd className="text-sm">{r.value}</dd>
              </div>
            ))}
          </dl>

          {owned && (
            <fieldset className="mt-6">
              <legend className="text-sm text-muted-foreground">Status de aprendizado</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={owned.status === s}
                    onClick={() => owned.status !== s && setStatus(owned.id, s)}
                    className={cn(
                      'inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
                      owned.status === s
                        ? cn('ring-1 ring-inset', STATUS_STYLES[s].badge)
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    <span className={cn('size-2 rounded-full', STATUS_STYLES[s].dot)} aria-hidden />
                    {STATUS_LABEL[s]}
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
