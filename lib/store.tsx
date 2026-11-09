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
  DEFAULT_STATUSES,
  STATUS_COLORS,
  type ExternalScore,
  type Folder,
  type FolderId,
  type ScoreReference,
  type Score,
  type Status,
  type StudyStatus,
} from './data'
import { deletePdfFile } from './pdf-storage'
import { loadUserLibrary, syncUserLibrary, type UserLibrarySnapshot } from './supabase-data'
import { getSupabaseClient } from './supabase'

export type View =
  | { name: 'home' }
  | { name: 'board' }
  | { name: 'all' }
  | { name: 'folder'; id: FolderId }
  | { name: 'detail'; id: string; external?: boolean }
  | { name: 'compare'; id: string }
  | { name: 'study'; id: string }
  | { name: 'musescore'; score: ScoreReference }
  | { name: 'musescore-selection'; scores: ScoreReference[] }
  | { name: 'pdf-upload' }
  | { name: 'profile' }

type Counts = Record<Status, number>
type LoadState = 'loading' | 'ready' | 'error'

type Persisted = {
  library: Score[]
  folders: Folder[]
  hiddenIds: string[]
  statuses: StudyStatus[]
}

const STORAGE_KEY = 'partitura-dashboard:v2'

type Toast = { id: number; message: string }
export type MuseScoreSubmission = {
  score: ScoreReference
  title: string
  composer: string
  folders: FolderId[]
}

type StoreValue = {
  loadState: LoadState
  retry: () => void
  library: Score[]
  visibleLibrary: Score[]
  folders: Folder[]
  statuses: StudyStatus[]
  hiddenIds: string[]
  derivedCounts: Counts
  view: View
  navigate: (view: View) => void
  syncState: 'loading' | 'ready' | 'syncing' | 'error'
  accountError: string | null
  retryAccountData: () => void
  clearAccountData: (userId: string) => Promise<{
    failedPdfDeletes: number
    cacheClearFailed: boolean
  }>
  configureAuthGuard: (userId: string | null, requestLogin: () => void) => void
  requireAuthentication: () => boolean
  back: () => void
  canGoBack: boolean
  setStatus: (id: string, status: Status) => void
  saveStatuses: (statuses: StudyStatus[]) => Promise<boolean>
  hide: (id: string) => void
  removeScore: (id: string) => Promise<void>
  restoreHidden: () => void
  markStudied: (id: string) => void
  addExternal: (ext: ExternalScore) => void
  addScore: (score: ScoreReference, title: string, composer: string, folders: FolderId[]) => boolean
  addScores: (submissions: MuseScoreSubmission[]) => boolean
  addUploadedPdf: (id: string, title: string, composer: string, folders: FolderId[]) => void
  createFolder: (name: string) => FolderId | null
  renameFolder: (id: FolderId, name: string) => void
  deleteFolder: (id: FolderId) => void
  setScoreFolder: (scoreId: string, folderId: FolderId, included: boolean) => void
  updateScoreComposer: (id: string, composer: string) => void
  addNote: (id: string, content: string) => void
  updateNote: (id: string, noteId: string, content: string) => void
  deleteNote: (id: string, noteId: string) => void
  isInLibrary: (id: string) => boolean
  recentlyAddedId: string | null
  findScore: (id: string) => Score | undefined
  findExternal: (id: string) => ExternalScore | undefined
  toast: Toast | null
  notify: (message: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

function countByStatus(library: Score[], statuses: StudyStatus[]): Counts {
  const counts = Object.fromEntries(statuses.map(({ id }) => [id, 0])) as Counts
  for (const s of library) counts[s.status]++
  return counts
}

function readPersisted(storageKey = STORAGE_KEY): Persisted | null {
  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return null
  const parsed = JSON.parse(raw) as Persisted
  if (!Array.isArray(parsed.library)) throw new Error('invalid')
  parsed.library = parsed.library.map((score) => {
    return {
      ...score,
      notes: Array.isArray(score.notes) ? score.notes : [],
    }
  })
  parsed.statuses = Array.isArray(parsed.statuses) && parsed.statuses.length > 0
    ? parsed.statuses
    : DEFAULT_STATUSES
  return parsed
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [library, setLibrary] = useState<Score[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [statuses, setStatuses] = useState<StudyStatus[]>(DEFAULT_STATUSES)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [history, setHistory] = useState<View[]>([{ name: 'home' }])
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [accountUserId, setAccountUserId] = useState<string | null>(null)
  const [accountReady, setAccountReady] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [accountRetry, setAccountRetry] = useState(0)
  const [syncRetry, setSyncRetry] = useState(0)
  const [syncState, setSyncState] = useState<'loading' | 'ready' | 'syncing' | 'error'>('loading')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const authStatus = useRef(false)
  const requestLogin = useRef<() => void>(() => {})
  const accountUserIdRef = useRef<string | null>(null)
  const accountReadyRef = useRef(false)
  const syncedSnapshot = useRef<{ userId: string; snapshot: UserLibrarySnapshot } | null>(null)
  const lastQueuedSnapshot = useRef<string | null>(null)
  const syncQueue = useRef<Promise<void>>(Promise.resolve())
  const newScoreStatus =
    statuses.find((status) => status.id === 'lendo')?.id ?? statuses[0]?.id ?? DEFAULT_STATUSES[0]!.id

  const configureAuthGuard = useCallback((userId: string | null, onRequestLogin: () => void) => {
    authStatus.current = userId !== null
    requestLogin.current = onRequestLogin
    if (accountUserIdRef.current === userId) return

    accountUserIdRef.current = userId
    accountReadyRef.current = false
    syncedSnapshot.current = null
    lastQueuedSnapshot.current = null
    setAccountUserId(userId)
    setAccountReady(false)
    setAccountError(null)
    setSyncState('loading')
    setLoadState('loading')
    setLibrary([])
    setFolders([])
    setHiddenIds([])
    setStatuses(DEFAULT_STATUSES)
  }, [])

  useEffect(() => {
    let active = true
    accountReadyRef.current = false
    setAccountReady(false)
    setLoadState('loading')
    setAccountError(null)
    setSyncState('loading')

    if (accountUserId === null) {
      try {
        const persisted = readPersisted(`${STORAGE_KEY}:anonymous`)
        if (persisted) {
          setLibrary(persisted.library)
          setFolders(Array.isArray(persisted.folders) ? persisted.folders : [])
          setHiddenIds(persisted.hiddenIds ?? [])
          setStatuses(persisted.statuses)
        } else {
          setLibrary([])
          setFolders([])
          setHiddenIds([])
          setStatuses(DEFAULT_STATUSES)
        }
        accountReadyRef.current = true
        setAccountReady(true)
        setLoadState('ready')
        setSyncState('ready')
      } catch {
        setAccountError('Não foi possível ler os dados locais deste navegador.')
        setLoadState('error')
        setSyncState('error')
      }

      return () => {
        active = false
      }
    }

    void loadUserLibrary(accountUserId).then((snapshot) => {
      if (!active || accountUserIdRef.current !== accountUserId) return
      setLibrary(snapshot.library)
      setFolders(snapshot.folders)
      setHiddenIds(snapshot.hiddenIds)
      setStatuses(snapshot.statuses)
      const librarySnapshot: UserLibrarySnapshot = {
        library: snapshot.library,
        folders: snapshot.folders,
        hiddenIds: snapshot.hiddenIds,
      }
      syncedSnapshot.current = { userId: accountUserId, snapshot: librarySnapshot }
      lastQueuedSnapshot.current = JSON.stringify(librarySnapshot)
      accountReadyRef.current = true
      setAccountReady(true)
      setLoadState('ready')
      setSyncState('ready')
    }).catch((error: unknown) => {
      if (!active || accountUserIdRef.current !== accountUserId) return
      const message = error instanceof Error ? error.message : 'Falha ao carregar os dados da conta.'
      setAccountError(`${message}. Confira se o schema do Supabase está configurado.`)
      setLoadState('error')
      setSyncState('error')
    })

    return () => {
      active = false
    }
  }, [accountUserId, accountRetry])

  useEffect(() => {
    if (loadState !== 'ready' || !accountReady) return
    const storageKey = accountUserId
      ? `${STORAGE_KEY}:user:${accountUserId}`
      : `${STORAGE_KEY}:anonymous`
    const data: Persisted = { library, folders, hiddenIds, statuses }
    window.localStorage.setItem(storageKey, JSON.stringify(data))
  }, [accountUserId, accountReady, library, folders, hiddenIds, statuses, loadState])

  const notify = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), message })
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const retry = useCallback(() => {
    window.localStorage.removeItem(`${STORAGE_KEY}:anonymous`)
    if (accountUserId) {
      setAccountRetry((attempt) => attempt + 1)
      return
    }
    setAccountRetry((attempt) => attempt + 1)
  }, [accountUserId])

  const retryAccountData = useCallback(() => {
    setAccountError(null)
    if (accountUserId && accountReadyRef.current) {
      lastQueuedSnapshot.current = null
      setSyncRetry((attempt) => attempt + 1)
      return
    }
    setAccountRetry((attempt) => attempt + 1)
  }, [accountUserId])

  const clearAccountData = useCallback(async (userId: string) => {
    authStatus.current = false
    accountUserIdRef.current = null
    accountReadyRef.current = false
    setAccountReady(false)
    setLibrary([])
    setFolders([])
    setHiddenIds([])
    setStatuses(DEFAULT_STATUSES)
    setRecentlyAddedId(null)
    setAccountError(null)
    setSyncState('loading')

    let cacheClearFailed = false
    try {
      window.localStorage.removeItem(`${STORAGE_KEY}:user:${userId}`)
    } catch {
      cacheClearFailed = true
    }

    const pdfIds = library
      .map((score) => score.pdfStorageId)
      .filter((id): id is string => Boolean(id))
    const results = await Promise.allSettled(pdfIds.map((id) => deletePdfFile(id)))
    const failedPdfDeletes = results.filter((result) => result.status === 'rejected').length
    syncedSnapshot.current = null
    lastQueuedSnapshot.current = null
    return { failedPdfDeletes, cacheClearFailed }
  }, [library])

  const requireAuthentication = useCallback(() => {
    if (!authStatus.current) {
      requestLogin.current()
      return false
    }
    if (!accountReadyRef.current) {
      notify('Aguarde o carregamento dos dados da sua conta antes de salvar.')
      return false
    }
    return true
  }, [notify])

  useEffect(() => {
    if (!accountUserId || !accountReady || !accountReadyRef.current) return
    const snapshot: UserLibrarySnapshot = { library, folders, hiddenIds }
    const signature = JSON.stringify(snapshot)
    if (signature === lastQueuedSnapshot.current) return

    lastQueuedSnapshot.current = signature
    setSyncState('syncing')
    const userId = accountUserId
    syncQueue.current = syncQueue.current.then(async () => {
      if (accountUserIdRef.current !== userId) return
      const previous = syncedSnapshot.current
      if (!previous || previous.userId !== userId) return

      try {
        await syncUserLibrary(userId, previous.snapshot, snapshot)
        if (accountUserIdRef.current !== userId) return
        syncedSnapshot.current = { userId, snapshot }
        setAccountError(null)
        setSyncState('ready')
      } catch (error) {
        if (accountUserIdRef.current !== userId) return
        const message = error instanceof Error ? error.message : 'Falha ao salvar os dados da conta.'
        setAccountError(`${message}. Os dados locais foram mantidos; tente sincronizar novamente.`)
        setSyncState('error')
        lastQueuedSnapshot.current = null
      }
    })
  }, [accountUserId, accountReady, library, folders, hiddenIds, syncRetry])

  const navigate = useCallback((view: View) => {
    setHistory((h) => {
      const current = h[h.length - 1]
      if (JSON.stringify(current) === JSON.stringify(view)) return h
      const isSection =
        view.name === 'home' ||
        view.name === 'board' ||
        view.name === 'all' ||
        view.name === 'folder' ||
        view.name === 'profile'
      return isSection ? [view] : [...h, view]
    })
    window.scrollTo({ top: 0 })
  }, [])

  const back = useCallback(() => {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))
  }, [])

  const setStatus = useCallback(
    (id: string, status: Status) => {
      if (!requireAuthentication()) return
      setLibrary((lib) => lib.map((s) => (s.id === id ? { ...s, status } : s)))
      notify('Status atualizado localmente; sincronizando com sua conta.')
    },
    [notify, requireAuthentication],
  )

  const saveStatuses = useCallback(
    async (nextStatuses: StudyStatus[]): Promise<boolean> => {
      if (!requireAuthentication()) return false
      if (!accountUserId) return false
      if (nextStatuses.length === 0) {
        notify('Mantenha pelo menos um status de estudo.')
        return false
      }

      const cleanStatuses = nextStatuses.map((status) => ({
        ...status,
        name: status.name.trim(),
      }))
      if (cleanStatuses.some((status) => !status.name || status.name.length > 40)) {
        notify('Cada status precisa ter um título de 1 a 40 caracteres.')
        return false
      }
      if (new Set(cleanStatuses.map((status) => status.id)).size !== cleanStatuses.length) {
        notify('Os status precisam ter identificadores únicos.')
        return false
      }
      if (
        new Set(cleanStatuses.map((status) => status.name.toLocaleLowerCase())).size !==
        cleanStatuses.length
      ) {
        notify('Não use o mesmo título em mais de um status.')
        return false
      }
      if (cleanStatuses.some((status) => !Object.hasOwn(STATUS_COLORS, status.color))) {
        notify('Selecione uma cor disponível para cada status.')
        return false
      }

      const retainedIds = new Set(cleanStatuses.map((status) => status.id))
      const removedIds = statuses
        .filter((status) => !retainedIds.has(status.id))
        .map((status) => status.id)
      const inUse = removedIds.find((id) => library.some((score) => score.status === id))
      if (inUse) {
        notify('Não é possível excluir um status que ainda tem partituras. Mova-as para outro status primeiro.')
        return false
      }

      try {
        const client = getSupabaseClient()
        const { error: saveError } = await client.from('study_statuses').upsert(
          cleanStatuses.map((status, sortOrder) => ({
            user_id: accountUserId,
            id: status.id,
            name: status.name,
            color: status.color,
            sort_order: sortOrder,
          })),
          { onConflict: 'user_id,id' },
        )
        if (saveError) throw saveError

        if (removedIds.length > 0) {
          const { error: deleteError } = await client
            .from('study_statuses')
            .delete()
            .eq('user_id', accountUserId)
            .in('id', removedIds)
          if (deleteError) throw deleteError
        }

        setStatuses(cleanStatuses)
        notify('Seus status de estudo foram salvos.')
        return true
      } catch (error) {
        notify(
          error instanceof Error
            ? `Não foi possível salvar os status: ${error.message}`
            : 'Não foi possível salvar os status.',
        )
        return false
      }
    },
    [accountUserId, library, notify, requireAuthentication, statuses],
  )

  const hide = useCallback(
    (id: string) => {
      if (!requireAuthentication()) return
      setHiddenIds((ids) => (ids.includes(id) ? ids : [...ids, id]))
      notify('Partitura ocultada localmente; sincronizando com sua conta.')
    },
    [notify, requireAuthentication],
  )

  const removeScore = useCallback(
    async (id: string) => {
      if (!requireAuthentication()) return
      const score = library.find((item) => item.id === id)
      if (!score) return
      if (score.pdfStorageId) {
        try {
          await deletePdfFile(score.pdfStorageId)
        } catch {
          notify('Não foi possível excluir o PDF salvo. A partitura foi mantida na biblioteca.')
          return
        }
      }

      setLibrary((items) => items.filter((item) => item.id !== id))
      setHiddenIds((ids) => ids.filter((hiddenId) => hiddenId !== id))
      notify('Partitura removida localmente; sincronizando com sua conta.')
    },
    [library, notify, requireAuthentication],
  )

  const createFolder = useCallback(
    (name: string): FolderId | null => {
      if (!requireAuthentication()) return null
      const savedName = name.trim()
      if (!savedName) {
        notify('Informe um nome para a pasta.')
        return null
      }
      if (folders.some((folder) => folder.name.toLocaleLowerCase() === savedName.toLocaleLowerCase())) {
        notify('Já existe uma pasta com esse nome.')
        return null
      }

      const id = `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setFolders((items) => [...items, { id, name: savedName }])
      notify('Pasta criada localmente; sincronizando com sua conta.')
      return id
    },
    [folders, notify, requireAuthentication],
  )

  const renameFolder = useCallback(
    (id: FolderId, name: string) => {
      if (!requireAuthentication()) return
      const savedName = name.trim()
      if (!savedName) {
        notify('Informe um nome para a pasta.')
        return
      }
      if (
        folders.some(
          (folder) =>
            folder.id !== id && folder.name.toLocaleLowerCase() === savedName.toLocaleLowerCase(),
        )
      ) {
        notify('Já existe uma pasta com esse nome.')
        return
      }
      setFolders((items) =>
        items.map((folder) => (folder.id === id ? { ...folder, name: savedName } : folder)),
      )
      notify('Pasta renomeada localmente; sincronizando com sua conta.')
    },
    [folders, notify, requireAuthentication],
  )

  const deleteFolder = useCallback(
    (id: FolderId) => {
      if (!requireAuthentication()) return
      setFolders((items) => items.filter((folder) => folder.id !== id))
      setLibrary((items) =>
        items.map((score) => ({
          ...score,
          folders: score.folders.filter((folderId) => folderId !== id),
        })),
      )
      notify('Pasta excluída localmente; sincronizando com sua conta.')
    },
    [notify, requireAuthentication],
  )

  const setScoreFolder = useCallback(
    (scoreId: string, folderId: FolderId, included: boolean) => {
      if (!requireAuthentication()) return
      setLibrary((items) =>
        items.map((score) => {
          if (score.id !== scoreId) return score
          const hasFolder = score.folders.includes(folderId)
          if (included === hasFolder) return score
          return {
            ...score,
            folders: included
              ? [...score.folders, folderId]
              : score.folders.filter((id) => id !== folderId),
          }
        }),
      )
      notify('Organização atualizada localmente; sincronizando com sua conta.')
    },
    [notify, requireAuthentication],
  )

  const updateScoreComposer = useCallback(
    (id: string, composer: string) => {
      if (!requireAuthentication()) return
      const value = composer.trim()
      setLibrary((items) =>
        items.map((score) => (score.id === id ? { ...score, composer: value || null } : score)),
      )
      notify('Informações atualizadas localmente; sincronizando com sua conta.')
    },
    [notify, requireAuthentication],
  )

  const markStudied = useCallback((id: string) => {
    if (!authStatus.current) return
    const lastStudiedAt = Date.now()
    setLibrary((lib) =>
      lib.map((score) =>
        score.id === id ? { ...score, lastActivity: 0, lastStudiedAt } : score,
      ),
    )
  }, [])

  const addExternal = useCallback(
    (ext: ExternalScore) => {
      if (!requireAuthentication()) return
      setLibrary((lib) => {
        if (lib.some((s) => s.id === ext.id)) return lib
        return [
          {
            id: ext.id,
            title: ext.title,
            composer: ext.composer,
            cover: ext.cover,
            status: newScoreStatus,
            notes: [],
            lastActivity: null,
            source: ext.source.replace('Descobrir Novas · ', ''),
            folders: [],
            addedAt: Date.now(),
          },
          ...lib,
        ]
      })
      setRecentlyAddedId(ext.id)
      notify('Partitura adicionada localmente; sincronizando com sua conta.')
    },
    [newScoreStatus, notify, requireAuthentication],
  )

  const addScore = useCallback(
    (score: ScoreReference, title: string, composer: string, folderIds: FolderId[]): boolean => {
      if (!requireAuthentication()) return false
      const savedTitle = title.trim()
      if (!savedTitle) {
        notify('Informe um título para adicionar a partitura.')
        return false
      }
      const savedComposer = composer.trim() || null

      setLibrary((lib) => {
        const existing = lib.find((item) => item.id === score.id)
        if (existing) {
          return lib.map((item) =>
            item.id === score.id
              ? {
                  ...item,
                  title: savedTitle,
                  composer: savedComposer,
                  folders: [...new Set(folderIds)],
                  embedUrl: score.embedUrl,
                  source: score.source,
                }
              : item,
          )
        }

        return [
          {
            ...score,
            title: savedTitle,
            composer: savedComposer,
            status: newScoreStatus,
            notes: [],
            lastActivity: null,
            folders: [...new Set(folderIds)],
            addedAt: Date.now(),
          },
          ...lib,
        ]
      })
      setRecentlyAddedId(score.id)
      notify('Partitura adicionada localmente; sincronizando com sua conta.')
      return true
    },
    [newScoreStatus, notify, requireAuthentication],
  )

  const addScores = useCallback(
    (submissions: MuseScoreSubmission[]): boolean => {
      if (!requireAuthentication()) return false
      if (
        submissions.length === 0 ||
        submissions.some((submission) => !submission.title.trim())
      ) {
        notify('Informe o título de cada partitura selecionada.')
        return false
      }

      const uniqueIds = new Set(submissions.map(({ score }) => score.id))
      if (uniqueIds.size !== submissions.length) {
        notify('A seleção contém partituras repetidas. Revise os itens antes de continuar.')
        return false
      }

      setLibrary((current) => {
        let next = current
        for (const { score, title, composer, folders: folderIds } of submissions) {
          const savedTitle = title.trim()
          const savedComposer = composer.trim() || null
          const existingIndex = next.findIndex((item) => item.id === score.id)
          if (existingIndex >= 0) {
            next = next.map((item) =>
              item.id === score.id
                ? {
                    ...item,
                    title: savedTitle,
                    composer: savedComposer,
                    folders: [...new Set(folderIds)],
                    cover: score.cover,
                    embedUrl: score.embedUrl,
                    source: score.source,
                  }
                : item,
            )
          } else {
            next = [
              {
                ...score,
                title: savedTitle,
                composer: savedComposer,
                status: newScoreStatus,
                notes: [],
                lastActivity: null,
                folders: [...new Set(folderIds)],
                addedAt: Date.now(),
              },
              ...next,
            ]
          }
        }
        return next
      })
      setRecentlyAddedId(submissions[0]!.score.id)
      notify(
        `${submissions.length} ${submissions.length === 1 ? 'partitura adicionada' : 'partituras adicionadas'} à biblioteca; sincronizando com sua conta.`,
      )
      return true
    },
    [newScoreStatus, notify, requireAuthentication],
  )

  const addUploadedPdf = useCallback(
    (id: string, title: string, composer: string, folderIds: FolderId[]) => {
      if (!requireAuthentication()) return
      const savedTitle = title.trim()
      if (!savedTitle) {
        notify('Informe um título para adicionar a partitura.')
        return
      }
      const savedComposer = composer.trim() || null

      setLibrary((lib) => {
        const existing = lib.find((item) => item.id === id)
        if (existing) {
          return lib.map((item) =>
            item.id === id
              ? {
                  ...item,
                  title: savedTitle,
                  composer: savedComposer,
                  folders: [...new Set(folderIds)],
                  pdfStorageId: id,
                }
              : item,
          )
        }

        return [
          {
            id,
            title: savedTitle,
            composer: savedComposer,
            cover: null,
            pdfStorageId: id,
            status: newScoreStatus,
            notes: [],
            lastActivity: null,
            source: 'PDF enviado',
            folders: [...new Set(folderIds)],
            addedAt: Date.now(),
          },
          ...lib,
        ]
      })
      setRecentlyAddedId(id)
      notify('Partitura adicionada localmente; sincronizando com sua conta.')
    },
    [newScoreStatus, notify, requireAuthentication],
  )

  const addNote = useCallback(
    (id: string, content: string) => {
      if (!requireAuthentication()) return
      const savedContent = content.trim()
      if (!savedContent) {
        notify('Escreva uma anotação antes de salvar.')
        return
      }

      const note = {
        id: crypto.randomUUID(),
        content: savedContent,
        createdAt: Date.now(),
      }
      setLibrary((lib) =>
        lib.map((score) => (score.id === id ? { ...score, notes: [...score.notes, note] } : score)),
      )
      notify('Anotação salva localmente; sincronizando com sua conta.')
    },
    [notify, requireAuthentication],
  )

  const updateNote = useCallback(
    (id: string, noteId: string, content: string) => {
      if (!requireAuthentication()) return
      const savedContent = content.trim()
      if (!savedContent) {
        notify('A anotação não pode ficar vazia.')
        return
      }

      setLibrary((lib) =>
        lib.map((score) =>
          score.id === id
            ? {
                ...score,
                notes: score.notes.map((note) =>
                  note.id === noteId
                    ? { ...note, content: savedContent, updatedAt: Date.now() }
                    : note,
                ),
              }
            : score,
        ),
      )
      notify('Anotação atualizada localmente; sincronizando com sua conta.')
    },
    [notify, requireAuthentication],
  )

  const deleteNote = useCallback(
    (id: string, noteId: string) => {
      if (!requireAuthentication()) return
      setLibrary((lib) =>
        lib.map((score) =>
          score.id === id
            ? { ...score, notes: score.notes.filter((note) => note.id !== noteId) }
            : score,
        ),
      )
      notify('Anotação excluída localmente; sincronizando com sua conta.')
    },
    [notify, requireAuthentication],
  )

  const value = useMemo<StoreValue>(() => {
    const visibleLibrary = library
      .filter((s) => !hiddenIds.includes(s.id))
      .sort((a, b) => b.addedAt - a.addedAt)
    const derivedCounts = countByStatus(library, statuses)
    return {
      loadState,
      retry,
      syncState,
      accountError,
      retryAccountData,
      clearAccountData,
      library,
      visibleLibrary,
      folders,
      statuses,
      hiddenIds,
      derivedCounts,
      view: history[history.length - 1]!,
      navigate,
      configureAuthGuard,
      requireAuthentication,
      back,
      canGoBack: history.length > 1,
      setStatus,
      saveStatuses,
      hide,
      removeScore,
      restoreHidden: () => {
        if (requireAuthentication()) setHiddenIds([])
      },
      markStudied,
      addExternal,
      addScore,
      addScores,
      addUploadedPdf,
      createFolder,
      renameFolder,
      deleteFolder,
      setScoreFolder,
      updateScoreComposer,
      addNote,
      updateNote,
      deleteNote,
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
    syncState,
    accountError,
    retryAccountData,
    clearAccountData,
    library,
    folders,
    statuses,
    hiddenIds,
    history,
    navigate,
    configureAuthGuard,
    requireAuthentication,
    back,
    setStatus,
    saveStatuses,
    hide,
    removeScore,
    markStudied,
    addExternal,
    addScore,
    addScores,
    addUploadedPdf,
    createFolder,
    renameFolder,
    deleteFolder,
    setScoreFolder,
    updateScoreComposer,
    addNote,
    updateNote,
    deleteNote,
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
