'use client'

import { Folder, FolderOpen, House, LibraryBig, Music2, SquareKanban, UserRound } from 'lucide-react'
import { getStatusName, type Folder as UserFolder, type Score, type StudyStatus } from '@/lib/data'
import { useStore, type View } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ScoreCover } from './score-cover'

const NAV: { label: string; view: View; icon: typeof House }[] = [
  { label: 'Início', view: { name: 'home' }, icon: House },
  { label: 'Quadro de Estudos', view: { name: 'board' }, icon: SquareKanban },
  { label: 'Todas as Partituras', view: { name: 'all' }, icon: LibraryBig },
  { label: 'Perfil', view: { name: 'profile' }, icon: UserRound },
]

export function AppSidebar({
  onNavigate,
  showProfile = true,
}: {
  onNavigate?: () => void
  showProfile?: boolean
}) {
  const { view, navigate, library, visibleLibrary, folders, statuses } = useStore()

  const go = (v: View) => {
    navigate(v)
    onNavigate?.()
  }

  return (
    <div className="flex h-full flex-col gap-8 overflow-y-auto overscroll-contain px-4 py-5">
      <div className="flex items-center gap-2.5 px-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25 ring-inset">
          <Music2 className="size-4" />
        </div>
        <span className="font-serif text-xl tracking-tight">Cadenza</span>
      </div>

      <nav aria-labelledby="nav-principal">
        <h2
          id="nav-principal"
          className="px-2 pb-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase"
        >
          Navegação Principal
        </h2>
        <ul className="flex flex-col gap-0.5">
          {NAV.filter((item) => showProfile || item.view.name !== 'profile').map((item) => {
            const active = view.name === item.view.name
            const Icon = item.icon
            return (
              <li key={item.label}>
                <SidebarButton active={active} onClick={() => go(item.view)}>
                  <Icon className="size-4" />
                  {item.label}
                </SidebarButton>
              </li>
            )
          })}
        </ul>
      </nav>

      <nav aria-labelledby="nav-pastas">
        <h2
          id="nav-pastas"
          className="px-2 pb-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase"
        >
          Minhas Pastas
        </h2>
        <ul className="flex flex-col gap-0.5">
          {folders.map((folder) => {
            const active = view.name === 'folder' && view.id === folder.id
            const count = library.filter((s) => s.folders.includes(folder.id)).length
            const previewScores = visibleLibrary
              .filter((score) => score.folders.includes(folder.id))
              .slice(0, 5)
            const Icon = active ? FolderOpen : Folder
            return (
              <li key={folder.id} className="group/folder">
                <SidebarButton active={active} onClick={() => go({ name: 'folder', id: folder.id })}>
                  <Icon className={cn('size-4', active ? 'text-rusty' : 'text-muted-foreground')} />
                  <span className="truncate">{folder.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">{count}</span>
                </SidebarButton>
                <div
                  className="invisible grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200 group-hover/folder:visible group-hover/folder:grid-rows-[1fr] group-hover/folder:opacity-100 group-focus-within/folder:visible group-focus-within/folder:grid-rows-[1fr] group-focus-within/folder:opacity-100"
                >
                  <div className="min-h-0 overflow-hidden">
                    <FolderPreview
                      folder={folder}
                      scores={previewScores}
                      statuses={statuses}
                      onOpen={(score) => go({ name: 'detail', id: score.id })}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-auto rounded-xl border bg-sidebar-accent/50 p-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {showProfile
            ? 'Partituras e anotações sincronizadas com sua conta. PDFs ficam neste navegador.'
            : 'Entre para salvar partituras, pastas e anotações na sua conta.'}
        </p>
      </div>
    </div>
  )
}

function FolderPreview({
  folder,
  scores,
  statuses,
  onOpen,
}: {
  folder: UserFolder
  scores: Score[]
  statuses: StudyStatus[]
  onOpen: (score: Score) => void
}) {
  return (
    <div
      role="region"
      className="ml-5 mt-1 border-l border-sidebar-border py-1 pl-2.5"
      aria-label={`Partituras na pasta ${folder.name}`}
    >
      {scores.length === 0 ? (
        <p className="px-2 py-2 text-xs text-sidebar-foreground/45">
          Nenhuma partitura nesta pasta.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {scores.map((score) => (
            <li key={score.id}>
              <button
                type="button"
                onClick={() => onOpen(score)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/85 focus-visible:bg-sidebar-accent/50 focus-visible:text-sidebar-foreground/85 focus-visible:outline-none"
              >
                <ScoreCover
                  src={score.cover}
                  title={score.title}
                  status={score.status}
                  statuses={statuses}
                  sizes="32px"
                  className="size-7 shrink-0 rounded-md opacity-75"
                  textClassName="text-[10px]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{score.title}</span>
                  <span className="block truncate text-[10px] text-sidebar-foreground/40">
                    {getStatusName(statuses, score.status)}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {scores.length === 5 && (
            <li className="px-2 pt-1 text-[10px] text-sidebar-foreground/40">
              Até 5 partituras
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function SidebarButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        active
          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
      )}
    >
      {children}
    </button>
  )
}
