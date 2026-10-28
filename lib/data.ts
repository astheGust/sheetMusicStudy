export type Status = 'dominada' | 'enferrujada' | 'lendo'

export const STATUSES: Status[] = ['dominada', 'enferrujada', 'lendo']

export const STATUS_LABEL: Record<Status, string> = {
  dominada: 'Dominada',
  enferrujada: 'Enferrujada',
  lendo: 'Lendo',
}

export type FolderId = string

export type Folder = { id: FolderId; name: string }

export const FOLDERS: Folder[] = []

export type Score = {
  id: string
  title: string
  composer: string | null
  cover: string | null
  embedUrl?: string
  pdfStorageId?: string
  pdfFileName?: string
  pdfPageCount?: number
  status: Status
  /** dias desde a última atividade; null = ainda não estudada */
  lastActivity: number | null
  source: string
  folders: FolderId[]
  addedAt: number
}

export type MuseScoreReference = {
  id: string
  title: string
  composer: null
  cover: null
  source: string
  embedUrl: string
}

export type UploadedPdfReference = {
  id: string
  fileName: string
  pageCount: number
  source: string
}

export function createMuseScoreReference(input: string): MuseScoreReference | null {
  const value = input.trim()
  if (!value) return null

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
  } catch {
    return null
  }

  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    (url.hostname.toLowerCase() !== 'musescore.com' &&
      url.hostname.toLowerCase() !== 'www.musescore.com') ||
    url.username ||
    url.password ||
    url.port
  ) {
    return null
  }

  const match = url.pathname.match(/^\/user\/(\d+)\/scores\/(\d+)(?:\/embed)?\/?$/i)
  if (!match) return null

  const [, userId, scoreId] = match
  const source = `https://musescore.com/user/${userId}/scores/${scoreId}`
  return {
    id: `musescore-${scoreId}`,
    title: `Partitura MuseScore ${scoreId}`,
    composer: null,
    cover: null,
    source,
    embedUrl: `${source}/embed`,
  }
}

export type ExternalScore = {
  id: string
  title: string
  composer: string | null
  cover: string | null
  source: string
  keywords: string
}

export const EXTERNAL_CATALOG: ExternalScore[] = [
{
    id: 'ext-001',
    title: 'Dearly Beloved',
    composer: 'Yoko Shimomura',
    cover: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=200',
    source: 'Descobrir Novas · Musescore',
    keywords: 'kingdom hearts kh rpg piano tema menu',
  },{
    id: 'ext-003',
    title: 'grace note',
    composer: 'Aimer',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200',
    source: 'Descobrir Novas · Anime OST',
    keywords: 'jpop anime cantora vocal',
  },
  {
    id: 'ext-004',
    title: 'Clair de Lune',
    composer: 'Claude Debussy',
    cover: null,
    source: 'Descobrir Novas · IMSLP (Domínio Público)',
    keywords: 'classica impressionismo dificil arpejos',
  }
]

export function formatActivity(days: number | null) {
  if (days === null) return 'Ainda não estudada'
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  return `Há ${days} dias`
}

export function composerLabel(composer: string | null) {
  return composer ?? 'Compositor não informado'
}

export function initials(title: string) {
  return title
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
