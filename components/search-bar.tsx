'use client'

import { AlertCircle, Check, ChevronRight, ExternalLink, FileUp, LoaderCircle, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  EXTERNAL_CATALOG,
  composerLabel,
  createMuseScoreReference,
  formatActivity,
  normalize,
  type MuseScoreImageResult,
} from '@/lib/data'
import { useStore } from '@/lib/store'
import { ScoreCover } from './score-cover'
import { StatusBadge } from './status-badge'
import { Button } from './ui/button'

export function SearchBar({
  clearToken,
  open,
  onOpenChange,
}: {
  clearToken: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { library, navigate, isInLibrary, loadState, statuses } = useStore()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [imageResults, setImageResults] = useState<MuseScoreImageResult[]>([])
  const [imageSearchLoading, setImageSearchLoading] = useState(false)
  const [imageSearchError, setImageSearchError] = useState<string | null>(null)
  const [selectedMuseScoreIds, setSelectedMuseScoreIds] = useState<string[]>([])
  const containerRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (clearToken === 0) return
    setQuery('')
    setDebounced('')
    setUrlError(null)
    setImageResults([])
    setSelectedMuseScoreIds([])
    onOpenChange(false)
  }, [clearToken, onOpenChange])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 280)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const searchTerm = debounced.trim()
    const queryLooksLikeUrl =
      /^(https?:\/\/|www\.)/i.test(searchTerm) ||
      searchTerm.includes('/') ||
      /musescore\.com/i.test(searchTerm)
    setSelectedMuseScoreIds([])

    if (searchTerm.length < 3 || queryLooksLikeUrl) {
      setImageResults([])
      setImageSearchError(null)
      setImageSearchLoading(false)
      return
    }

    const controller = new AbortController()
    setImageResults([])
    setImageSearchError(null)
    setImageSearchLoading(true)
    void fetch(`/api/musescore-search?q=${encodeURIComponent(searchTerm)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          results?: MuseScoreImageResult[]
          error?: string
        }
        if (!response.ok) throw new Error(payload.error || 'Não foi possível buscar partituras.')
        if (!Array.isArray(payload.results)) throw new Error('Resposta inválida da busca de partituras.')
        setImageResults(payload.results)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setImageSearchError(
          error instanceof Error ? error.message : 'Não foi possível buscar partituras.',
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setImageSearchLoading(false)
      })

    return () => controller.abort()
  }, [debounced])

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) onOpenChange(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        onOpenChange(true)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [onOpenChange])

  const term = normalize(debounced.trim())
  const isLoading = query !== debounced || loadState === 'loading'
  const searchValue = query.trim()
  const isUrl = /^(https?:\/\/|www\.)/i.test(searchValue) || searchValue.includes('/') || /musescore\.com/i.test(searchValue)
  const urlScore = isUrl ? createMuseScoreReference(searchValue) : null
  const existingUrlScore = urlScore ? library.find((score) => score.id === urlScore.id) : undefined
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
  const empty =
    results.mine.length === 0 &&
    results.external.length === 0 &&
    imageResults.length === 0 &&
    !imageSearchLoading &&
    !imageSearchError

  const close = () => onOpenChange(false)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isUrl) return

    if (!urlScore) {
      setUrlError('Link inválido. Cole a URL de uma partitura do MuseScore.')
      onOpenChange(true)
      return
    }

    setUrlError(null)
    if (existingUrlScore) {
      navigate({ name: 'detail', id: existingUrlScore.id })
    } else {
      navigate({ name: 'musescore', score: urlScore })
    }
    close()
  }

  return (
    <form ref={containerRef} onSubmit={submit} className="relative w-full min-w-0 max-w-2xl">
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
            onOpenChange(true)
          }}
          onFocus={() => onOpenChange(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close()
          }}
          aria-expanded={showDropdown}
          aria-controls="search-results"
          placeholder="Pesquisar"
          className="h-10 w-full rounded-full border bg-surface pr-20 pl-10 text-sm shadow-inner shadow-black/20 transition-colors outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-3 focus:ring-ring/25 sm:h-12 sm:pr-24 sm:pl-11 sm:text-[15px] [&::-webkit-search-cancel-button]:hidden"
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
            className="flex h-8 items-center justify-center gap-1.5 rounded-full border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none max-sm:size-9 max-sm:px-0"
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
          className="absolute inset-x-0 top-full z-40 mt-2 max-h-[min(70vh,560px)] animate-in overflow-y-auto rounded-2xl border bg-popover p-2 shadow-2xl shadow-black/60 fade-in-0 slide-in-from-top-1 max-sm:fixed max-sm:inset-x-2 max-sm:top-[4.25rem] max-sm:z-[70] max-sm:mt-0 max-sm:max-h-[calc(100dvh-5rem)]"
        >
          {urlError ? (
            <p role="alert" className="px-3 py-6 text-sm text-destructive">
              {urlError}
            </p>
          ) : isUrl && !isLoading ? (
            <div
              role="status"
              className={
                urlScore
                  ? existingUrlScore
                    ? 'mx-2 mb-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rusty/25 bg-rusty/5 px-3 py-3'
                    : 'mx-2 mb-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mastered/25 bg-mastered/5 px-3 py-3'
                  : 'mx-2 mb-2 flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-3 text-sm text-destructive'
              }
            >
              {urlScore ? (
                <>
                  <p className={existingUrlScore ? 'flex items-center gap-2 text-sm text-rusty' : 'flex items-center gap-2 text-sm text-mastered'}>
                    {existingUrlScore ? <AlertCircle className="size-4 shrink-0" /> : <Check className="size-4 shrink-0" />}
                    {existingUrlScore
                      ? `“${existingUrlScore.title}” já está na sua biblioteca.`
                      : 'Link do MuseScore reconhecido e pronto para adicionar.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (existingUrlScore) {
                        navigate({ name: 'detail', id: existingUrlScore.id })
                      } else {
                        navigate({ name: 'musescore', score: urlScore })
                      }
                      close()
                    }}
                    className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {existingUrlScore ? 'Abrir partitura' : 'Continuar'}
                  </button>
                </>
              ) : (
                <>
                  <AlertCircle className="size-4 shrink-0" />
                  <p>Link não reconhecido. Use uma URL de partitura do MuseScore.</p>
                </>
              )}
            </div>
          ) : isLoading ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Buscando partituras…
            </div>
          ) : (
            <>
              {imageSearchLoading && (
                <div role="status" className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Buscando partituras visuais no MuseScore…
                </div>
              )}
              {imageSearchError && (
                <p role="alert" className="mx-2 my-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {imageSearchError}
                </p>
              )}
              {imageResults.length > 0 && (
                <section aria-labelledby="sr-musescore-images">
                  <h3
                    id="sr-musescore-images"
                    className="flex items-center justify-between px-3 pt-2 pb-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase"
                  >
                    Partituras visuais · MuseScore
                    <span className="tabular-nums">{imageResults.length}</span>
                  </h3>
                  <ul className="grid grid-cols-2 gap-3 p-2 min-[520px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5">
                    {imageResults.map((result) => {
                      const selected = selectedMuseScoreIds.includes(result.score.id)
                      return (
                        <li key={result.score.id} className="min-w-0">
                          <article className={`relative aspect-square overflow-hidden rounded-xl border bg-secondary ${selected ? 'border-primary ring-2 ring-primary/50' : 'border-border'}`}>
                            <a
                              href={result.score.source}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Abrir ${result.score.title} no MuseScore`}
                              className="absolute inset-0"
                            >
                              <img
                                src={result.imageUrl}
                                alt={result.score.title}
                                loading="lazy"
                                className="size-full object-cover"
                              />
                              <span
                                aria-hidden="true"
                                className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/95 via-black/65 to-transparent"
                              />
                              <span className="absolute inset-x-3 bottom-14 line-clamp-2 text-left text-xs leading-4 font-semibold text-white drop-shadow-sm">
                                {result.score.title}
                              </span>
                              <span className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-background/75 text-foreground opacity-70 backdrop-blur transition-opacity hover:opacity-100">
                                <ExternalLink className="size-3.5" />
                              </span>
                            </a>
                            <button
                              type="button"
                              aria-pressed={selected}
                              aria-label={`${selected ? 'Remover' : 'Selecionar'} ${result.score.title}`}
                              onClick={() =>
                                setSelectedMuseScoreIds((current) =>
                                  selected
                                    ? current.filter((id) => id !== result.score.id)
                                    : [...current, result.score.id],
                                )
                              }
                              className={`absolute inset-x-1.5 bottom-1.5 flex h-11 items-center justify-center gap-1.5 rounded-lg border text-xs font-medium backdrop-blur transition-colors ${
                                selected
                                  ? 'border-primary/60 bg-primary/80 text-primary-foreground'
                                  : 'border-white/15 bg-background/65 text-foreground/80 hover:bg-background/90'
                              }`}
                            >
                              {selected && <Check className="size-3.5" />}
                              {selected ? 'Selecionada' : 'Selecionar'}
                            </button>
                          </article>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="mx-3 my-2 h-px bg-border" />
                </section>
              )}
              {imageResults.length > 0 && selectedMuseScoreIds.length > 0 && (
                <div className="sticky bottom-0 z-10 -mx-2 flex justify-end border-y bg-popover/95 px-4 py-2.5 shadow-lg shadow-black/20 backdrop-blur">
                  <Button
                    type="button"
                    className="h-11"
                    onClick={() => {
                      const selectedScores = imageResults
                        .filter((result) => selectedMuseScoreIds.includes(result.score.id))
                        .map(({ score, imageUrl }) => ({ ...score, cover: imageUrl }))
                      navigate({ name: 'musescore-selection', scores: selectedScores })
                      close()
                    }}
                  >
                    Detalhes ({selectedMuseScoreIds.length}) <ChevronRight />
                  </Button>
                </div>
              )}
              {empty && !imageSearchLoading && (
                <p className="px-3 py-6 text-sm text-muted-foreground">
                  Nenhuma partitura encontrada para essa busca.
                </p>
              )}
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
                            status={s.status}
                            statuses={statuses}
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
                          <StatusBadge status={s.status} statuses={statuses} />
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
