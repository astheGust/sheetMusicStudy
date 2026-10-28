'use client'

import { CircleCheck, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { AppSidebar } from './app-sidebar'
import { SearchBar } from './search-bar'
import { BoardView } from './views/board-view'
import { CompareView } from './views/compare-view'
import { DetailView } from './views/detail-view'
import { HomeView } from './views/home-view'
import { LibraryView } from './views/library-view'
import { MuseScoreView } from './views/musescore-view'
import { PdfUploadView } from './views/pdf-upload-view'
import { StudyView } from './views/study-view'

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        <AppSidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          />
          <div className="relative h-full w-72 animate-in border-r border-sidebar-border bg-sidebar slide-in-from-left">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-5 right-4 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
            >
              <X className="size-4" />
              <span className="sr-only">Fechar menu</span>
            </button>
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-xl">
          <div className="flex h-20 items-center gap-3 px-4 sm:px-6 lg:px-10">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border text-muted-foreground hover:text-foreground lg:hidden"
            >
              <Menu className="size-4" />
              <span className="sr-only">Abrir menu</span>
            </button>
            <div className="hidden flex-1 lg:block" />
            <div className="flex flex-[2] justify-center">
              <SearchBar />
            </div>
            <div className="flex-1" />
          </div>
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-10">
          <CurrentView />
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-10">
          <p>Cadenza · Sua biblioteca de partituras de piano</p>
        </footer>
      </div>

      <ToastViewport />
    </div>
  )
}

function CurrentView() {
  const { view } = useStore()
  const key = JSON.stringify(view)
  return (
    <div key={key} className="mx-auto max-w-[1400px] animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      {view.name === 'home' && <HomeView />}
      {view.name === 'board' && <BoardView />}
      {view.name === 'all' && <LibraryView />}
      {view.name === 'folder' && <LibraryView folderId={view.id} />}
      {view.name === 'detail' && <DetailView id={view.id} external={view.external} />}
      {view.name === 'compare' && <CompareView id={view.id} />}
      {view.name === 'study' && <StudyView id={view.id} />}
      {view.name === 'musescore' && <MuseScoreView score={view.score} />}
      {view.name === 'pdf-upload' && <PdfUploadView />}
    </div>
  )
}

function ToastViewport() {
  const { toast } = useStore()
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
      {toast && (
        <div
          key={toast.id}
          className="flex animate-in items-center gap-2.5 rounded-xl border bg-popover px-4 py-3 text-sm shadow-2xl shadow-black/60 fade-in-0 slide-in-from-bottom-2"
        >
          <CircleCheck className="size-4 text-mastered" />
          {toast.message}
        </div>
      )}
    </div>
  )
}
