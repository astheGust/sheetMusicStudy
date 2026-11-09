import { getStatusColor, getStatusName, type Status, type StudyStatus } from '@/lib/data'
import { cn } from '@/lib/utils'

export function statusDotStyle(statuses: StudyStatus[], status: Status) {
  return { backgroundColor: getStatusColor(statuses, status) }
}

export function statusBadgeStyle(statuses: StudyStatus[], status: Status) {
  const color = getStatusColor(statuses, status)
  return {
    color,
    backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 25%, transparent)`,
  }
}

export function StatusBadge({
  status,
  statuses,
  className,
}: {
  status: Status
  statuses: StudyStatus[]
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        className,
      )}
      style={statusBadgeStyle(statuses, status)}
    >
      <span className="size-1.5 rounded-full" style={statusDotStyle(statuses, status)} aria-hidden />
      {getStatusName(statuses, status)}
    </span>
  )
}

export function StatusFilter({
  value,
  onChange,
  counts,
  statuses,
}: {
  value: Status | null
  onChange: (value: Status | null) => void
  counts: Record<Status, number>
  statuses: StudyStatus[]
}) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por status">
      <FilterChip active={value === null} onClick={() => onChange(null)}>
        Todas <span className="text-muted-foreground">{total}</span>
      </FilterChip>
      {statuses.map(({ id, name }) => (
        <FilterChip key={id} active={value === id} onClick={() => onChange(value === id ? null : id)}>
          <span className="size-1.5 rounded-full" style={statusDotStyle(statuses, id)} aria-hidden />
          {name} <span className="text-muted-foreground">{counts[id] ?? 0}</span>
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
