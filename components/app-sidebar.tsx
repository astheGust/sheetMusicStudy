'use client'

import { Folder, FolderOpen, House, LibraryBig, Music2, SquareKanban } from 'lucide-react'
import { FOLDERS } from '@/lib/data'
import { useStore, type View } from '@/lib/store'
import { cn } from '@/lib/utils'

const NAV: { label: string; view: View; icon: typeof House }[] = [
  { label: 'Início', view: { name: 'home' }, icon: House },
  { label: 'Quadro de Estudos', view: { name: 'board' }, icon: SquareKanban },
  { label: 'Todas as Partituras', view: { name: 'all' }, icon: LibraryBig },
]

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { view, navigate, library } = useStore()

  const go = (v: View) => {
    navigate(v)
    onNavigate?.()
  }

  return (
    <div className="flex h-full flex-col gap-8 px-4 py-5">
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
          {NAV.map((item) => {
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
          {FOLDERS.map((folder) => {
            const active = view.name === 'folder' && view.id === folder.id
            const count = library.filter((s) => s.folders.includes(folder.id)).length
            const Icon = active ? FolderOpen : Folder
            return (
              <li key={folder.id}>
                <SidebarButton active={active} onClick={() => go({ name: 'folder', id: folder.id })}>
                  <Icon className={cn('size-4', active ? 'text-rusty' : 'text-muted-foreground')} />
                  <span className="truncate">{folder.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">{count}</span>
                </SidebarButton>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-auto rounded-xl border bg-sidebar-accent/50 p-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Seus dados são salvos neste navegador.
        </p>
      </div>
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
