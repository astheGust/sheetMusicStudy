import { createHash } from 'node:crypto'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const MAX_PAGE_COUNT = 200

async function validatePdf(data: Uint8Array): Promise<number> {
  const document = await getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: true,
    stopAtErrors: true,
  }).promise

  try {
    if (document.numPages < 1 || document.numPages > MAX_PAGE_COUNT) {
      throw new Error(`O PDF precisa ter entre 1 e ${MAX_PAGE_COUNT} páginas.`)
    }

    await document.getPage(1)
    return document.numPages
  } finally {
    await document.destroy()
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return Response.json({ error: 'Selecione um arquivo PDF para analisar.' }, { status: 400 })
    }
    if (file.size === 0) {
      return Response.json({ error: 'O arquivo está vazio.' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: 'O arquivo excede o limite de 20 MB.' }, { status: 413 })
    }

    const data = new Uint8Array(await file.arrayBuffer())
    const signature = new TextDecoder().decode(data.subarray(0, 5))
    if (signature !== '%PDF-') {
      return Response.json({ error: 'O arquivo enviado não é um PDF válido.' }, { status: 415 })
    }
    const documentId = createHash('sha256').update(data).digest('hex')

    let pageCount: number
    try {
      pageCount = await validatePdf(data)
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes('precisa ter entre')
          ? error.message
          : 'O PDF está corrompido, protegido por senha ou não pôde ser lido.'
      return Response.json({ error: message }, { status: 422 })
    }

    return Response.json({
      id: `pdf-${documentId}`,
      fileName: file.name.slice(0, 180) || 'partitura.pdf',
      pageCount,
      source: 'PDF enviado',
    })
  } catch (error) {
    console.error('Falha ao analisar PDF enviado:', error)
    return Response.json({ error: 'Não foi possível analisar o arquivo. Tente novamente.' }, { status: 500 })
  }
}
