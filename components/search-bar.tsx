'use client'

import { Check, ChevronRight, FileUp, LoaderCircle, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  EXTERNAL_CATALOG,
  composerLabel,
  createMuseScoreReference,
  formatActivity,
  normalize,
} from '@/lib/data'
import { useStore } from '@/lib/store'
import { ScoreCover } from './score-cover'
import { StatusBadge } from './status-badge'

export function SearchBar() {
  const { library, navigate, isInLibrary, loadState } = useStore()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const containerRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 280)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const term = normalize(debounced.trim())
  const isLoading = query !== debounced || loadState === 'loading'
  const results = useMemo(() => {
    if (!term) return { mine: [], external: [] }
    const words = term.split(/\s+/)
    const matches = (text: string) => words.every((w) => normalize(text).includes(w))
    const mine = library.filter((s) => matches(`${s.title} ${s.composer ?? ''}`))
    const external = EXTERNAL_CATALOG.filter((e) =>
      matches(`${e.title} ${e.composer ?? ''} ${e.keywords}`),
    )
    return { mine, external }
  }, [term, library])

  const showDropdown = open && query.trim().length > 0
  const empty = results.mine.length === 0 && results.external.length === 0

  const close = () => setOpen(false)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = query.trim()
    const isUrl = /^(https?:\/\/|www\.)/i.test(value) || value.includes('/') || /musescore\.com/i.test(value)
    if (!isUrl) return

    const score = createMuseScoreReference(value)
    if (!score) {
      setUrlError('Link inválido. Cole a URL de uma partitura do MuseScore.')
      setOpen(true)
      return
    }

    setUrlError(null)
    navigate({ name: 'musescore', score })
    close()
  }

  return (
    <form ref={containerRef} onSubmit={submit} className="relative w-full max-w-2xl">
      <label htmlFor="search" className="sr-only">
        Buscar na biblioteca ou colar uma URL do MuseScore
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          id="search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setUrlError(null)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close()
          }}
          aria-expanded={showDropdown}
          aria-controls="search-results"
          placeholder="Buscar na biblioteca ou colar URL do MuseScore"
          className="h-12 w-full rounded-full border bg-surface pr-36 pl-11 text-[15px] shadow-inner shadow-black/20 transition-colors outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-3 focus:ring-ring/25 [&::-webkit-search-cancel-button]:hidden"
        />
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              close()
              navigate({ name: 'pdf-upload' })
            }}
            title="Enviar partitura em PDF"
            aria-label="Enviar partitura em PDF"
            className="flex h-8 items-center justify-center gap-1.5 rounded-full border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <FileUp className="size-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setUrlError(null)
                inputRef.current?.focus()
              }}
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
              <span className="sr-only">Limpar busca</span>
            </button>
          )}
          <kbd className="hidden rounded-md border bg-secondary px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </div>
      </div>

      {showDropdown && (
        <div
          id="search-results"
          role="region"
          aria-label="Resultados da busca"
          aria-live="polite"
          className="absolute inset-x-0 top-full z-40 mt-2 max-h-[min(70vh,560px)] animate-in overflow-y-auto rounded-2xl border bg-popover p-2 shadow-2xl shadow-black/60 fade-in-0 slide-in-from-top-1"
        >
          {urlError ? (
            <p role="alert" className="px-3 py-6 text-sm text-destructive">
              {urlError}
            </p>
          ) : isLoading ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Buscando partituras…
            </div>
          ) : empty ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              Nenhuma partitura encontrada para essa busca.
            </p>
          ) : (
            <>
              <section aria-labelledby="sr-mine">
                <h3
                  id="sr-mine"
                  className="flex items-center justify-between px-3 pt-2 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase"
                >
                  Na sua biblioteca
                  <span className="tabular-nums">{results.mine.length}</span>
                </h3>
                {results.mine.length === 0 ? (
                  <p className="px-3 pb-2 text-sm text-muted-foreground">
                    Nenhuma partitura sua corresponde a essa busca.
                  </p>
                ) : (
                  <ul>
                    {results.mine.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => {
                            navigate({ name: 'detail', id: s.id })
                            close()
                          }}
                          className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                        >
                          <ScoreCover
                            src={s.cover}
                            title={s.title}
                            className="size-11 shrink-0 rounded-md"
                            sizes="44px"
                            textClassName="text-sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{s.title}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {composerLabel(s.composer)} · {formatActivity(s.lastActivity)}
                            </p>
                          </div>
                          <StatusBadge status={s.status} />
                          <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {results.external.length > 0 && (
                <>
                  <div className="mx-3 my-2 h-px bg-border" />
                  <section aria-labelledby="sr-external">
                    <h3
                      id="sr-external"
                      className="flex items-center justify-between px-3 pt-1 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase"
                    >
                      Descobrir Novas
                      <span className="tabular-nums">{results.external.length}</span>
                    </h3>
                    <ul>
                      {results.external.map((e) => {
                        const added = isInLibrary(e.id)
                        return (
                          <li key={e.id} className="flex items-center gap-1 rounded-xl hover:bg-accent">
                            <button
                              type="button"
                              onClick={() => {
                                navigate({ name: 'detail', id: e.id, external: true })
                                close()
                              }}
                              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left focus-visible:bg-accent focus-visible:outline-none"
                            >
                              <ScoreCover
                                src={e.cover}
                                title={e.title}
                                className="size-11 shrink-0 rounded-md"
                                sizes="44px"
                                textClassName="text-sm"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{e.title}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {composerLabel(e.composer)} ·{' '}
                                  {e.source.replace('Descobrir Novas · ', '')}
                                </p>
                              </div>
                            </button>
                            {added ? (
                              <span className="mr-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-mastered">
                                <Check className="size-3.5" /> Adicionada
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  navigate({ name: 'compare', id: e.id })
                                  close()
                                }}
                                className="mr-2 flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                              >
                                <Plus className="size-4" />
                                <span className="sr-only">Adicionar {e.title} à biblioteca</span>
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      )}
    </form>
  )
}
