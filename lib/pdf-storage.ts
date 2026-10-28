const DATABASE_NAME = 'cadenza-pdf-library'
const STORE_NAME = 'pdf-files'
const DATABASE_VERSION = 1

function openPdfDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir o armazenamento de PDFs.'))
  })
}

export async function savePdfFile(id: string, file: Blob): Promise<void> {
  const database = await openPdfDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(file, id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Não foi possível salvar o PDF.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('O salvamento do PDF foi cancelado.'))
  }).finally(() => database.close())
}

export async function getPdfFile(id: string): Promise<Blob | undefined> {
  const database = await openPdfDatabase()
  return new Promise<Blob | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(id) as IDBRequest<Blob | undefined>
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir o PDF salvo.'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('Não foi possível abrir o PDF salvo.'))
    }
  })
}
