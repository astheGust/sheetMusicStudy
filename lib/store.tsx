'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  EXTERNAL_CATALOG,
  STATUSES,
  type ExternalScore,
  type FolderId,
  type MuseScoreReference,
  type Score,
  type Status,
  type UploadedPdfReference,
} from './data'

export type View =
  | { name: 'home' }
  | { name: 'board' }
  | { name: 'all' }
  | { name: 'folder'; id: FolderId }
  | { name: 'detail'; id: string; external?: boolean }
  | { name: 'compare'; id: string }
  | { name: 'study'; id: string }
  | { name: 'musescore'; score: MuseScoreReference }
  | { name: 'pdf-upload' }

export type Focus = 'study' | 'organize'
export type Counts = Record<Status, number>
type LoadState = 'loading' | 'ready' | 'error'

type Persisted = {
  library: Score[]
  summary: Counts | null
  hiddenIds: string[]
}

const STORAGE_KEY = 'partitura-dashboard:v2'

type Toast = { id: number; message: string }

type StoreValue = {
  loadState: LoadState
  retry: () => void
  library: Score[]
  visibleLibrary: Score[]
  hiddenIds: string[]
  counts: Counts
  derivedCounts: Counts
  summaryEdited: boolean
  setSummary: (counts: Counts) => void
  resetSummary: () => void
  view: View
  navigate: (view: View) => void
  back: () => void
  canGoBack: boolean
  focus: Focus
  setFocus: (focus: Focus) => void
  setStatus: (id: string, status: Status) => void
  hide: (id: string) => void
  restoreHidden: () => void
  markStudied: (id: string) => void
  addExternal: (ext: ExternalScore) => void
  addMuseScore: (score: MuseScoreReference, title: string) => void
  addUploadedPdf: (pdf: UploadedPdfReference, title: string) => void
  isInLibrary: (id: string) => boolean
  recentlyAddedId: string | null
  findScore: (id: string) => Score | undefined
  findExternal: (id: string) => ExternalScore | undefined
  toast: Toast | null
  notify: (message: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

function countByStatus(library: Score[]): Counts {
  const counts: Counts = { dominada: 0, enferrujada: 0, lendo: 0 }
  for (const s of library) counts[s.status]++
  return counts
}

function readPersisted(): Persisted | null {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  const parsed = JSON.parse(raw) as Persisted
  if (!Array.isArray(parsed.library)) throw new Error('invalid')
  return parsed
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [library, setLibrary] = useState<Score[]>([])
  const [summary, setSummaryState] = useState<Counts | null>(null)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [history, setHistory] = useState<View[]>([{ name: 'home' }])
  const [focus, setFocus] = useState<Focus>('study')
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [attempt, setAttempt] = useState(0)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLoadState('loading')
    try {
      const persisted = readPersisted()
      if (persisted) {
        setLibrary(persisted.library)
        setSummaryState(persisted.summary)
        setHiddenIds(persisted.hiddenIds ?? [])
      }
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }, [attempt])

  useEffect(() => {
    if (loadState !== 'ready') return
    const data: Persisted = { library, summary, hiddenIds }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [library, summary, hiddenIds, loadState])

  const notify = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), message })
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const retry = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY)
    setAttempt((a) => a + 1)
  }, [])

  const navigate = useCallback((view: View) => {
    setHistory((h) => {
      const current = h[h.length - 1]
      if (JSON.stringify(current) === JSON.stringify(view)) return h
      const isSection =
        view.name === 'home' ||
        view.name === 'board' ||
        view.name === 'all' ||
        view.name === 'folder'
      return isSection ? [view] : [...h, view]
    })
    window.scrollTo({ top: 0 })
  }, [])

  const back = useCallback(() => {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))
  }, [])

  const setStatus = useCallback(
    (id: string, status: Status) => {
      setLibrary((lib) => lib.map((s) => (s.id === id ? { ...s, status } : s)))
      setSummaryState(null)
      notify('Status atualizado.')
    },
    [notify],
  )

  const hide = useCallback(
    (id: string) => {
      setHiddenIds((ids) => (ids.includes(id) ? ids : [...ids, id]))
      notify('Partitura removida da visualização.')
    },
    [notify],
  )

  const markStudied = useCallback((id: string) => {
    setLibrary((lib) => lib.map((s) => (s.id === id ? { ...s, lastActivity: 0 } : s)))
  }, [])

  const addExternal = useCallback(
    (ext: ExternalScore) => {
      setLibrary((lib) => {
        if (lib.some((s) => s.id === ext.id)) return lib
        const maxAdded = Math.max(0, ...lib.map((s) => s.addedAt))
        return [
          {
            id: ext.id,
            title: ext.title,
            composer: ext.composer,
            cover: ext.cover,
            status: 'lendo',
            lastActivity: null,
            source: ext.source.replace('Descobrir Novas · ', ''),
            folders: [],
            addedAt: maxAdded + 1,
          },
          ...lib,
        ]
      })
      setSummaryState(null)
      setRecentlyAddedId(ext.id)
      notify(`${ext.title} entrou na sua biblioteca.`)
    },
    [notify],
  )

  const addMuseScore = useCallback(
    (score: MuseScoreReference, title: string) => {
      const savedTitle = title.trim()
      if (!savedTitle) {
        notify('Informe um título para adicionar a partitura.')
        return
      }

      setLibrary((lib) => {
        const existing = lib.find((item) => item.id === score.id)
        if (existing) {
          return lib.map((item) =>
            item.id === score.id ? { ...item, title: savedTitle } : item,
          )
        }

        const maxAdded = Math.max(0, ...lib.map((item) => item.addedAt))
        return [
          {
            ...score,
            title: savedTitle,
            status: 'lendo',
            lastActivity: null,
            folders: [],
            addedAt: maxAdded + 1,
          },
          ...lib,
        ]
      })
      setSummaryState(null)
      setRecentlyAddedId(score.id)
      notify(`${savedTitle} foi salvo no seu catálogo.`)
    },
    [notify],
  )

  const addUploadedPdf = useCallback(
    (pdf: UploadedPdfReference, title: string) => {
      const savedTitle = title.trim()
      if (!savedTitle) {
        notify('Informe um título para adicionar a partitura.')
        return
      }

      setLibrary((lib) => {
        const existing = lib.find((item) => item.id === pdf.id)
        if (existing) {
          return lib.map((item) =>
            item.id === pdf.id
              ? {
                  ...item,
                  title: savedTitle,
                  pdfStorageId: pdf.id,
                  pdfFileName: pdf.fileName,
                  pdfPageCount: pdf.pageCount,
                }
              : item,
          )
        }

        const maxAdded = Math.max(0, ...lib.map((item) => item.addedAt))
        return [
          {
            id: pdf.id,
            title: savedTitle,
            composer: null,
            cover: null,
            pdfStorageId: pdf.id,
            pdfFileName: pdf.fileName,
            pdfPageCount: pdf.pageCount,
            status: 'lendo',
            lastActivity: null,
            source: pdf.source,
            folders: [],
            addedAt: maxAdded + 1,
          },
          ...lib,
        ]
      })
      setSummaryState(null)
      setRecentlyAddedId(pdf.id)
      notify(`${savedTitle} foi salvo no seu catálogo.`)
    },
    [notify],
  )

  const value = useMemo<StoreValue>(() => {
    const visibleLibrary = library
      .filter((s) => !hiddenIds.includes(s.id))
      .sort((a, b) => b.addedAt - a.addedAt)
    const derivedCounts = countByStatus(library)
    return {
      loadState,
      retry,
      library,
      visibleLibrary,
      hiddenIds,
      counts: summary ?? derivedCounts,
      derivedCounts,
      summaryEdited: summary !== null,
      setSummary: (c) => {
        setSummaryState(c)
        notify('Contagens atualizadas.')
      },
      resetSummary: () => setSummaryState(null),
      view: history[history.length - 1]!,
      navigate,
      back,
      canGoBack: history.length > 1,
      focus,
      setFocus,
      setStatus,
      hide,
      restoreHidden: () => setHiddenIds([]),
      markStudied,
      addExternal,
      addMuseScore,
      addUploadedPdf,
      isInLibrary: (id) => library.some((s) => s.id === id),
      recentlyAddedId,
      findScore: (id) => library.find((s) => s.id === id),
      findExternal: (id) => EXTERNAL_CATALOG.find((e) => e.id === id),
      toast,
      notify,
    }
  }, [
    loadState,
    retry,
    library,
    hiddenIds,
    summary,
    history,
    navigate,
    back,
    focus,
    setStatus,
    hide,
    markStudied,
    addExternal,
    addMuseScore,
    addUploadedPdf,
    recentlyAddedId,
    toast,
    notify,
  ])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export { STATUSES }
