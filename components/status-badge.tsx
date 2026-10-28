import { STATUSES, STATUS_LABEL, type Status } from '@/lib/data'
import { cn } from '@/lib/utils'

export const STATUS_STYLES: Record<Status, { badge: string; dot: string; bar: string }> = {
  dominada: {
    badge: 'bg-mastered/12 text-mastered ring-mastered/25',
    dot: 'bg-mastered',
    bar: 'bg-mastered',
  },
  enferrujada: {
    badge: 'bg-rusty/12 text-rusty ring-rusty/25',
    dot: 'bg-rusty',
    bar: 'bg-rusty',
  },
  lendo: {
    badge: 'bg-reading/12 text-reading ring-reading/25',
    dot: 'bg-reading',
    bar: 'bg-reading',
  },
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        STATUS_STYLES[status].badge,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', STATUS_STYLES[status].dot)} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  )
}

export function StatusFilter({
  value,
  onChange,
  counts,
}: {
  value: Status | null
  onChange: (value: Status | null) => void
  counts: Record<Status, number>
}) {
  const total = counts.dominada + counts.enferrujada + counts.lendo
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por status">
      <FilterChip active={value === null} onClick={() => onChange(null)}>
        Todas <span className="text-muted-foreground">{total}</span>
      </FilterChip>
      {STATUSES.map((s) => (
        <FilterChip key={s} active={value === s} onClick={() => onChange(value === s ? null : s)}>
          <span className={cn('size-1.5 rounded-full', STATUS_STYLES[s].dot)} aria-hidden />
          {STATUS_LABEL[s]} <span className="text-muted-foreground">{counts[s]}</span>
        </FilterChip>
      ))}
    </div>
  )
}

function FilterChip({
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
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        active
          ? 'border-foreground/20 bg-foreground/10 text-foreground'
          : 'border-border bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
