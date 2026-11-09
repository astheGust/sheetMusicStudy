import { createMuseScoreReference, type MuseScoreImageResult } from '@/lib/data'

export const runtime = 'nodejs'

const MAX_RESULTS = 15
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 30

type GoogleImageResult = {
  link?: unknown
  thumbnail?: unknown
}

type GoogleImagesResponse = {
  error?: unknown
  images_results?: GoogleImageResult[]
}

type RateRecord = { count: number; resetAt: number }
const requestsByClient = new Map<string, RateRecord>()

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor || request.headers.get('x-real-ip') || 'unknown'
}

function enforceRateLimit(request: Request): boolean {
  const now = Date.now()
  for (const [key, record] of requestsByClient) {
    if (record.resetAt <= now) requestsByClient.delete(key)
  }

  const key = getClientKey(request)
  const record = requestsByClient.get(key)
  if (!record || record.resetAt <= now) {
    requestsByClient.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (record.count >= RATE_LIMIT) return false
  record.count += 1
  return true
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  if (!enforceRateLimit(request)) {
    return Response.json(
      { error: 'Muitas buscas em sequência. Aguarde um minuto e tente novamente.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    )
  }

  const query = new URL(request.url).searchParams.get('q')?.trim()
  if (!query || query.length < 3 || query.length > 120) {
    return Response.json(
      { error: 'Digite entre 3 e 120 caracteres para buscar partituras.' },
      { status: 400 },
    )
  }

  const apiKey = process.env.SERP_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'A busca visual não está configurada no servidor. Verifique SERP_API_KEY.' },
      { status: 503 },
    )
  }

  const params = new URLSearchParams({
    engine: 'google_images',
    q: `site:musescore.com ${query} sheet music`,
    safe: 'active',
    hl: 'pt-br',
    gl: 'br',
    google_domain: 'google.com.br',
    api_key: apiKey,
  })

  try {
    const response = await fetch(`https://serpapi.com/search.json?${params}`, {
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 60 },
    })
    if (!response.ok) {
      return Response.json(
        { error: 'O serviço de busca não respondeu. Tente novamente em instantes.' },
        { status: 502 },
      )
    }

    const payload = (await response.json()) as GoogleImagesResponse
    if (payload.error) {
      return Response.json(
        { error: 'Não foi possível concluir a busca no MuseScore. Tente novamente.' },
        { status: 502 },
      )
    }

    const results: MuseScoreImageResult[] = []
    const seenSources = new Set<string>()
    for (const item of payload.images_results ?? []) {
      if (typeof item.link !== 'string' || !isHttpsUrl(item.thumbnail)) continue
      const score = createMuseScoreReference(item.link)
      if (!score || seenSources.has(score.source)) continue
      seenSources.add(score.source)
      results.push({ score, imageUrl: item.thumbnail })
      if (results.length === MAX_RESULTS) break
    }

    return Response.json(
      { results },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    )
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'TimeoutError'
        ? 'A busca demorou mais do que o esperado. Tente novamente.'
        : 'Não foi possível conectar ao serviço de busca. Tente novamente.'
    return Response.json({ error: message }, { status: 502 })
  }
}
