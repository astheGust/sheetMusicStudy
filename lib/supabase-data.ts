import { getSupabaseClient } from './supabase'
import { STATUS_COLORS, type Folder, type Score, type Status, type StatusColor, type StudyNote, type StudyStatus } from './data'

export type UserLibrarySnapshot = {
  library: Score[]
  folders: Folder[]
  hiddenIds: string[]
}

type UserLibraryLoadResult = UserLibrarySnapshot & { statuses: StudyStatus[] }

type ScoreRow = {
  user_id: string
  id: string
  title: string
  composer: string | null
  cover_url: string | null
  source: string
  source_url: string | null
  embed_url: string | null
  pdf_storage_id: string | null
  status: string
  last_studied_at: string | null
  added_at: string
  is_hidden: boolean
}

type FolderRow = {
  user_id: string
  id: string
  name: string
}

type ScoreFolderRow = {
  user_id: string
  score_id: string
  folder_id: string
}

type StudyNoteRow = {
  user_id: string
  id: string
  score_id: string
  session_id: string | null
  content: string
  created_at: string
  updated_at: string
}

type StudyStatusRow = {
  id: string
  name: string
  color: string
  sort_order: number
}

const DAY_MS = 24 * 60 * 60 * 1000

function throwOnError(error: { message: string } | null, operation: string): void {
  if (error) throw new Error(`${operation}: ${error.message}`)
}

function parseDate(value: string | null): number | null {
  if (value === null) return null
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) throw new Error(`Data inválida recebida do Supabase: ${value}`)
  return timestamp
}

function daysSince(timestamp: number | null): number | null {
  if (timestamp === null) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((today.getTime() - date.getTime()) / DAY_MS))
}

export async function loadUserLibrary(userId: string): Promise<UserLibraryLoadResult> {
  const client = getSupabaseClient()
  const [scoresResult, foldersResult, scoreFoldersResult, notesResult, statusesResult] = await Promise.all([
    client.from('scores').select('*').eq('user_id', userId).order('added_at', { ascending: false }),
    client.from('folders').select('*').eq('user_id', userId).order('created_at'),
    client.from('score_folders').select('*').eq('user_id', userId),
    client.from('study_notes').select('*').eq('user_id', userId).order('created_at'),
    client.from('study_statuses').select('id,name,color,sort_order').eq('user_id', userId).order('sort_order'),
  ])

  throwOnError(scoresResult.error, 'Não foi possível carregar as partituras')
  throwOnError(foldersResult.error, 'Não foi possível carregar as pastas')
  throwOnError(scoreFoldersResult.error, 'Não foi possível carregar as pastas das partituras')
  throwOnError(notesResult.error, 'Não foi possível carregar as anotações')
  throwOnError(statusesResult.error, 'Não foi possível carregar os status de estudo')

  const statuses = ((statusesResult.data ?? []) as StudyStatusRow[]).map((row): StudyStatus => {
    if (!Object.hasOwn(STATUS_COLORS, row.color)) {
      throw new Error(`Cor inválida recebida para o status ${row.id}.`)
    }
    return { id: row.id, name: row.name, color: row.color as StatusColor }
  })
  if (statuses.length === 0) {
    throw new Error('Sua conta ainda não tem status de estudo. Confira a configuração do Supabase.')
  }

  const folders = (foldersResult.data ?? []) as FolderRow[]
  const folderIdsByScore = new Map<string, string[]>()
  for (const row of (scoreFoldersResult.data ?? []) as ScoreFolderRow[]) {
    const ids = folderIdsByScore.get(row.score_id) ?? []
    ids.push(row.folder_id)
    folderIdsByScore.set(row.score_id, ids)
  }

  const notesByScore = new Map<string, StudyNote[]>()
  for (const row of (notesResult.data ?? []) as StudyNoteRow[]) {
    const createdAt = parseDate(row.created_at)
    const updatedAt = parseDate(row.updated_at)
    if (createdAt === null || updatedAt === null) {
      throw new Error(`Anotação ${row.id} não possui datas válidas.`)
    }
    const note: StudyNote = {
      id: row.id,
      content: row.content,
      createdAt,
      ...(updatedAt !== null && updatedAt !== createdAt ? { updatedAt } : {}),
    }
    const notes = notesByScore.get(row.score_id) ?? []
    notes.push(note)
    notesByScore.set(row.score_id, notes)
  }

  const library = ((scoresResult.data ?? []) as ScoreRow[]).map((row): Score => {
    const lastStudiedAt = parseDate(row.last_studied_at)
    if (!statuses.some((status) => status.id === row.status)) {
      throw new Error(`A partitura ${row.id} usa um status que não existe mais.`)
    }
    const addedAt = parseDate(row.added_at)
    if (addedAt === null) throw new Error(`A partitura ${row.id} não possui data de inclusão válida.`)

    return {
      id: row.id,
      title: row.title,
      composer: row.composer,
      cover: row.cover_url,
      ...(row.embed_url ? { embedUrl: row.embed_url } : {}),
      ...(row.pdf_storage_id ? { pdfStorageId: row.pdf_storage_id } : {}),
      status: row.status as Status,
      notes: notesByScore.get(row.id) ?? [],
      lastActivity: daysSince(lastStudiedAt),
      lastStudiedAt,
      source: row.source_url ?? row.source,
      folders: folderIdsByScore.get(row.id) ?? [],
      addedAt,
    }
  })

  const snapshot: UserLibrarySnapshot = {
    library,
    folders: folders.map(({ id, name }) => ({ id, name })),
    hiddenIds: ((scoresResult.data ?? []) as ScoreRow[])
      .filter((row) => row.is_hidden)
      .map((row) => row.id),
  }
  return { ...snapshot, statuses }
}

function scoreRow(userId: string, score: Score, hiddenIds: string[]): ScoreRow {
  const addedAt = score.addedAt > 100_000_000_000 ? score.addedAt : Date.now()
  return {
    user_id: userId,
    id: score.id,
    title: score.title,
    composer: score.composer,
    cover_url: score.cover,
    source: score.source,
    source_url: /^https?:\/\//i.test(score.source) ? score.source : null,
    embed_url: score.embedUrl ?? null,
    pdf_storage_id: score.pdfStorageId ?? null,
    status: score.status,
    last_studied_at:
      score.lastStudiedAt !== undefined
        ? score.lastStudiedAt === null
          ? null
          : new Date(score.lastStudiedAt).toISOString()
        : score.lastActivity === 0
          ? new Date().toISOString()
          : null,
    added_at: new Date(addedAt).toISOString(),
    is_hidden: hiddenIds.includes(score.id),
  }
}

function folderRow(userId: string, folder: Folder): FolderRow {
  return { user_id: userId, id: folder.id, name: folder.name }
}

function noteRows(userId: string, score: Score): StudyNoteRow[] {
  return score.notes.map((note) => ({
    user_id: userId,
    id: note.id,
    score_id: score.id,
    session_id: null,
    content: note.content,
    created_at: new Date(note.createdAt).toISOString(),
    updated_at: new Date(note.updatedAt ?? note.createdAt).toISOString(),
  }))
}

function scoreFolderRows(userId: string, library: Score[]): ScoreFolderRow[] {
  return library.flatMap((score) =>
    score.folders.map((folderId) => ({
      user_id: userId,
      score_id: score.id,
      folder_id: folderId,
    })),
  )
}

function sameRows<T>(left: T, right: T): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]))
}

async function deleteIds(
  table: 'scores' | 'folders' | 'study_notes',
  userId: string,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return
  const { error } = await getSupabaseClient()
    .from(table)
    .delete()
    .eq('user_id', userId)
    .in('id', ids)
  throwOnError(error, `Não foi possível excluir registros de ${table}`)
}

export async function syncUserLibrary(
  userId: string,
  previous: UserLibrarySnapshot,
  next: UserLibrarySnapshot,
): Promise<void> {
  const client = getSupabaseClient()
  const previousFolders = indexById(previous.folders.map((folder) => folderRow(userId, folder)))
  const nextFolders = indexById(next.folders.map((folder) => folderRow(userId, folder)))
  const changedFolders = [...nextFolders.values()].filter(
    (row) => !sameRows(previousFolders.get(row.id), row),
  )
  if (changedFolders.length > 0) {
    const { error } = await client.from('folders').upsert(changedFolders, { onConflict: 'user_id,id' })
    throwOnError(error, 'Não foi possível salvar as pastas')
  }

  const previousScores = indexById(
    previous.library.map((score) => scoreRow(userId, score, previous.hiddenIds)),
  )
  const nextScores = indexById(next.library.map((score) => scoreRow(userId, score, next.hiddenIds)))
  const changedScores = [...nextScores.values()].filter(
    (row) => !sameRows(previousScores.get(row.id), row),
  )
  if (changedScores.length > 0) {
    const { error } = await client.from('scores').upsert(changedScores, { onConflict: 'user_id,id' })
    throwOnError(error, 'Não foi possível salvar as partituras')
  }

  const previousNotes = indexById(previous.library.flatMap((score) => noteRows(userId, score)))
  const nextNotes = indexById(next.library.flatMap((score) => noteRows(userId, score)))
  const changedNotes = [...nextNotes.values()].filter(
    (row) => !sameRows(previousNotes.get(row.id), row),
  )
  if (changedNotes.length > 0) {
    const { error } = await client.from('study_notes').upsert(changedNotes, { onConflict: 'id' })
    throwOnError(error, 'Não foi possível salvar as anotações')
  }

  const previousLinks = new Map(
    scoreFolderRows(userId, previous.library).map((row) => [
      `${row.score_id}\u0000${row.folder_id}`,
      row,
    ]),
  )
  const nextLinks = new Map(
    scoreFolderRows(userId, next.library).map((row) => [
      `${row.score_id}\u0000${row.folder_id}`,
      row,
    ]),
  )
  const addedLinks = [...nextLinks.entries()]
    .filter(([key]) => !previousLinks.has(key))
    .map(([, row]) => row)
  if (addedLinks.length > 0) {
    const { error } = await client
      .from('score_folders')
      .upsert(addedLinks, { onConflict: 'user_id,score_id,folder_id' })
    throwOnError(error, 'Não foi possível vincular partituras às pastas')
  }

  for (const [key, row] of previousLinks) {
    if (nextLinks.has(key)) continue
    const { error } = await client
      .from('score_folders')
      .delete()
      .eq('user_id', userId)
      .eq('score_id', row.score_id)
      .eq('folder_id', row.folder_id)
    throwOnError(error, 'Não foi possível remover partituras das pastas')
  }

  await deleteIds(
    'study_notes',
    userId,
    [...previousNotes.keys()].filter((id) => !nextNotes.has(id)),
  )
  await deleteIds(
    'scores',
    userId,
    [...previousScores.keys()].filter((id) => !nextScores.has(id)),
  )
  await deleteIds(
    'folders',
    userId,
    [...previousFolders.keys()].filter((id) => !nextFolders.has(id)),
  )
}
