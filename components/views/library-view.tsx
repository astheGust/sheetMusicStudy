'use client'

import { Check, Folder, FolderOpen, FolderPlus, Pencil, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { FolderId, Status } from '@/lib/data'
import { useStore } from '@/lib/store'
import { Button } from '../ui/button'
import { ScoreCardSkeleton } from '../score-card'
import { ScoreGrid } from '../score-grid'
import { StatusFilter } from '../status-badge'
import { PageHeader } from './page-parts'

export function LibraryView({ folderId }: { folderId?: FolderId }) {
  const {
    visibleLibrary,
    loadState,
    navigate,
    hiddenIds,
    restoreHidden,
    folders,
    createFolder,
    renameFolder,
    deleteFolder,
    statuses,
  } = useStore()
  const [filter, setFilter] = useState<Status | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState<FolderId | null>(null)
  const [folderDraft, setFolderDraft] = useState('')
  const folder = folderId ? folders.find((f) => f.id === folderId) : undefined
  const scores = folderId
    ? visibleLibrary.filter((s) => s.folders.includes(folderId))
    : visibleLibrary

  const counts = Object.fromEntries(statuses.map(({ id }) => [id, 0])) as Record<Status, number>
  for (const s of scores) counts[s.status]++

  const submitNewFolder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newFolderName.trim()) return
    createFolder(newFolderName)
    setNewFolderName('')
  }

  const submitRenameFolder = (event: FormEvent<HTMLFormElement>, id: FolderId) => {
    event.preventDefault()
    if (!folderDraft.trim()) return
    renameFolder(id, folderDraft)
    setEditingFolderId(null)
    setFolderDraft('')
  }

  const confirmDeleteFolder = (id: FolderId, name: string) => {
    if (!window.confirm(`Excluir a pasta "${name}"? As partituras continuarão em Todas as Partituras.`)) {
      return
    }
    deleteFolder(id)
    if (folderId === id) navigate({ name: 'all' })
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={folder ? 'Pasta' : 'Biblioteca'}
        title={folder ? folder.name : 'Todas as Partituras'}
        description={`${scores.length} ${scores.length === 1 ? 'partitura' : 'partituras'}${
          hiddenIds.length > 0 ? ` · ${hiddenIds.length} oculta${hiddenIds.length > 1 ? 's' : ''}` : ''
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {folder && editingFolderId !== folder.id && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingFolderId(folder.id)
                  setFolderDraft(folder.name)
                }}
              >
                <Pencil /> Renomear pasta
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => confirmDeleteFolder(folder.id, folder.name)}
              >
                <Trash2 /> Excluir pasta
              </Button>
            </>
          )}
          {scores.length > 0 && (
            <StatusFilter value={filter} onChange={setFilter} counts={counts} statuses={statuses} />
          )}
        </div>
      </PageHeader>

      {folder && editingFolderId === folder.id && (
        <form
          onSubmit={(event) => submitRenameFolder(event, folder.id)}
          className="-mt-4 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3"
        >
          <label htmlFor="rename-folder" className="sr-only">Nome da pasta</label>
          <input
            id="rename-folder"
            autoFocus
            value={folderDraft}
            onChange={(event) => setFolderDraft(event.target.value)}
            maxLength={80}
            className="h-10 min-w-48 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/25"
          />
          <Button type="submit" disabled={!folderDraft.trim()}><Check /> Salvar</Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setEditingFolderId(null)
              setFolderDraft('')
            }}
          >
            <X /> Cancelar
          </Button>
        </form>
      )}

      {!folderId && (
        <section aria-labelledby="folders-title" className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-1">
            <h2 id="folders-title" className="text-sm font-medium">Pastas da biblioteca</h2>
            <p className="text-xs text-muted-foreground">
              Organize suas partituras sem removê-las da biblioteca.
            </p>
          </div>
          <form onSubmit={submitNewFolder} className="mt-4 flex flex-wrap gap-2">
            <label htmlFor="new-folder-name" className="sr-only">Nome da nova pasta</label>
            <input
              id="new-folder-name"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="Ex.: Repertório para recital"
              maxLength={80}
              className="h-10 min-w-48 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/25"
            />
            <Button type="submit" disabled={!newFolderName.trim()}>
              <FolderPlus /> Criar pasta
            </Button>
          </form>
          {folders.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {folders.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-2">
                  {editingFolderId === item.id ? (
                    <form
                      onSubmit={(event) => submitRenameFolder(event, item.id)}
                      className="flex min-w-0 flex-1 flex-wrap gap-2"
                    >
                      <label htmlFor={`rename-folder-${item.id}`} className="sr-only">
                        Renomear {item.name}
                      </label>
                      <input
                        id={`rename-folder-${item.id}`}
                        autoFocus
                        value={folderDraft}
                        onChange={(event) => setFolderDraft(event.target.value)}
                        maxLength={80}
                        className="h-9 min-w-40 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/25"
                      />
                      <Button type="submit" size="sm" disabled={!folderDraft.trim()}>
                        <Check /> Salvar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingFolderId(null)
                          setFolderDraft('')
                        }}
                      >
                        <X /> Cancelar
                      </Button>
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate({ name: 'folder', id: item.id })}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium hover:underline"
                      >
                        <Folder className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{item.name}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {visibleLibrary.filter((score) => score.folders.includes(item.id)).length}
                        </span>
                      </button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Renomear ${item.name}`}
                        onClick={() => {
                          setEditingFolderId(item.id)
                          setFolderDraft(item.name)
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Excluir ${item.name}`}
                        onClick={() => confirmDeleteFolder(item.id, item.name)}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {hiddenIds.length > 0 && (
        <p className="-mt-4 text-xs text-muted-foreground">
          <button type="button" onClick={restoreHidden} className="font-medium text-foreground/80 hover:underline">
            Mostrar partituras ocultas
          </button>
        </p>
      )}

      {loadState === 'loading' ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <ScoreCardSkeleton key={i} />
          ))}
        </div>
      ) : scores.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed px-6 py-16 text-center">
          <FolderOpen className="size-7 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {folder ? 'Esta pasta ainda não tem partituras.' : 'Sua biblioteca está vazia.'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {folder
                ? 'Quando você organizar partituras aqui, elas aparecerão nesta pasta.'
                : 'Use a busca para encontrar e adicionar sua primeira partitura.'}
            </p>
          </div>
          {folder && (
            <Button variant="outline" onClick={() => navigate({ name: 'all' })}>
              Ver todas as partituras
            </Button>
          )}
        </div>
      ) : (
        <ScoreGrid
          scores={scores}
          statuses={statuses}
          filter={filter}
          onClearFilter={() => setFilter(null)}
          folderId={folderId}
          allowDelete={!folderId}
        />
      )}

      {folder && scores.length > 0 && (
        <div>
          <Button variant="ghost" className="text-muted-foreground" onClick={() => navigate({ name: 'all' })}>
            Voltar para Todas as Partituras
          </Button>
        </div>
      )}
    </div>
  )
}
