'use client'

import { Check, Plus } from 'lucide-react'
import { composerLabel, normalize, type ExternalScore, type Score } from '@/lib/data'
import { useStore } from '@/lib/store'
import { Button } from '../ui/button'
import { ScoreCover } from '../score-cover'
import { BackButton } from './page-parts'

export function CompareView({ id }: { id: string }) {
  const { findExternal, library, isInLibrary, addExternal, navigate, back } = useStore()
  const ext = findExternal(id)

  if (!ext) return null

  const alreadyAdded = isInLibrary(ext.id)
  const match = library.find(
    (s) => s.id !== ext.id && normalize(s.title) === normalize(ext.title),
  )

  const confirm = () => {
    addExternal(ext)
    navigate({ name: 'all' })
  }

  return (
    <div className="flex flex-col gap-8">
      <BackButton />
      <div>
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Comparar partitura</p>
        <h1 className="mt-1 font-serif text-4xl tracking-tight text-balance">Confira antes de adicionar</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Veja título, compositor, capa e origem lado a lado para ter certeza de que é a versão que você procura.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CompareColumn label="Opção externa" tone="new" item={ext} />
        {match ? (
          <CompareColumn label="Já na sua biblioteca" tone="owned" item={match} />
        ) : (
          <div className="flex flex-col justify-center rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Nenhuma versão semelhante na biblioteca</p>
            <p className="mt-1">Esta será sua primeira partitura com esse título.</p>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="ghost" size="lg" className="h-11 rounded-full px-5" onClick={back}>
          Cancelar
        </Button>
        {alreadyAdded ? (
          <Button size="lg" className="h-11 rounded-full px-6" disabled>
            <Check /> Já está na sua biblioteca
          </Button>
        ) : (
          <Button size="lg" className="h-11 rounded-full px-6" onClick={confirm}>
            <Plus /> Confirmar inclusão
          </Button>
        )}
      </div>
    </div>
  )
}

function CompareColumn({
  label,
  tone,
  item,
}: {
  label: string
  tone: 'new' | 'owned'
  item: ExternalScore | Score
}) {
  return (
    <section
      aria-label={label}
      className={
        tone === 'new'
          ? 'rounded-3xl border border-primary/25 bg-card p-5'
          : 'rounded-3xl border bg-card p-5'
      }
    >
      <p className={tone === 'new' ? 'text-xs font-medium text-primary' : 'text-xs font-medium text-muted-foreground'}>
        {label}
      </p>
      <div className="mt-4 flex gap-4">
        <ScoreCover src={item.cover} title={item.title} sizes="128px" className="size-28 shrink-0 rounded-xl sm:size-32" textClassName="text-2xl" />
        <dl className="min-w-0 space-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Título</dt>
            <dd className="font-medium text-pretty">{item.title}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Compositor</dt>
            <dd>{composerLabel(item.composer)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Origem</dt>
            <dd className="text-pretty">{item.source.replace('Descobrir Novas · ', '') || 'Não informado'}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
