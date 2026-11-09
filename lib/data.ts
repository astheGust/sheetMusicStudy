export type Status = string
export type StatusColor =
  | 'mint'
  | 'amber'
  | 'blue'
  | 'rose'
  | 'violet'
  | 'cyan'
  | 'pink'
  | 'orange'
  | 'slate'

export type StudyStatus = { id: Status; name: string; color: StatusColor }

export const STATUS_COLORS: Record<StatusColor, string> = {
  mint: '#34d399',
  amber: '#fbbf24',
  blue: '#60a5fa',
  rose: '#fb7185',
  violet: '#c084fc',
  cyan: '#22d3ee',
  pink: '#f472b6',
  orange: '#fb923c',
  slate: '#a1a1aa',
}

export const DEFAULT_STATUSES: StudyStatus[] = [
  { id: 'dominada', name: 'Dominado', color: 'mint' },
  { id: 'enferrujada', name: 'Enferrujada', color: 'amber' },
  { id: 'lendo', name: 'Lendo', color: 'blue' },
]

export const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  DEFAULT_STATUSES.map(({ id, name }) => [id, name]),
)

export function getStatusName(statuses: StudyStatus[], id: Status): string {
  return statuses.find((status) => status.id === id)?.name ?? STATUS_LABEL[id] ?? id
}

export function getStatusColor(statuses: StudyStatus[], id: Status): string {
  const color = statuses.find((status) => status.id === id)?.color
  return STATUS_COLORS[color ?? 'slate']
}

export type FolderId = string

export type Folder = { id: FolderId; name: string }

export type Score = {
  id: string
  title: string
  composer: string | null
  cover: string | null
  embedUrl?: string
  pdfStorageId?: string
  status: Status
  notes: StudyNote[]
  /** dias desde a última atividade; null = ainda não estudada */
  lastActivity: number | null
  lastStudiedAt?: number | null
  source: string
  folders: FolderId[]
  addedAt: number
}

export type StudyNote = {
  id: string
  content: string
  createdAt: number
  updatedAt?: number
}

export type ScoreReference = {
  id: string
  title: string
  composer: null
  cover: string | null
  source: string
  embedUrl: string
}

export type MuseScoreReference = ScoreReference
export type MuseScoreImageResult = {
  score: MuseScoreReference
  imageUrl: string
}

export function createMuseScoreReference(input: string): ScoreReference | null {
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

  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.at(-1)?.toLowerCase() === 'embed') segments.pop()

  let sourcePath: string
  let id: string
  let title: string
  if (
    segments.length === 4 &&
    segments[0]?.toLowerCase() === 'user' &&
    /^\d+$/.test(segments[1] ?? '') &&
    segments[2]?.toLowerCase() === 'scores' &&
    /^\d+$/.test(segments[3] ?? '')
  ) {
    const userId = segments[1]!
    const scoreId = segments[3]!
    sourcePath = `/user/${userId}/scores/${scoreId}`
    id = `musescore-${scoreId}`
    title = `Partitura MuseScore ${scoreId}`
  } else if (segments.length === 2) {
    let decodedSegments: string[]
    try {
      decodedSegments = segments.map((segment) => decodeURIComponent(segment))
    } catch {
      return null
    }
    if (decodedSegments.some((segment) => !segment || segment.includes('/'))) return null

    sourcePath = `/${decodedSegments.map((segment) => encodeURIComponent(segment.toLowerCase())).join('/')}`
    id = `musescore-path:${sourcePath.slice(1)}`
    title = decodedSegments[1]!
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase())
  } else {
    return null
  }

  const source = `https://musescore.com${sourcePath}`
  return {
    id,
    title,
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
