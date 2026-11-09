'use client'

import Image from 'next/image'
import { useState } from 'react'
import { getStatusColor, initials, type Status, type StudyStatus } from '@/lib/data'
import { cn } from '@/lib/utils'

export function ScoreCover({
  src,
  title,
  className,
  sizes = '(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 50vw',
  priority,
  textClassName,
  status,
  statuses,
}: {
  src: string | null
  title: string
  className?: string
  sizes?: string
  priority?: boolean
  textClassName?: string
  status?: Status
  statuses?: StudyStatus[]
}) {
  const [failed, setFailed] = useState(false)
  const showImage = src && !failed
  const statusColor =
    status && statuses ? getStatusColor(statuses, status) : undefined

  return (
    <div
      className={cn(
        'relative aspect-square overflow-hidden rounded-lg bg-secondary',
        className,
      )}
    >
      {showImage ? (
        <Image
          src={src}
          alt={`Capa de ${title}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="relative flex size-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,oklch(0.27_0.01_260),oklch(0.19_0.008_260))]"
          aria-label={`Capa indisponível de ${title}`}
          role="img"
        >
          {statusColor && (
            <span
              className="pointer-events-none absolute inset-0"
              aria-hidden
              style={{
                background: `radial-gradient(circle at center, color-mix(in srgb, ${statusColor} 17%, transparent) 0%, color-mix(in srgb, ${statusColor} 8%, transparent) 24%, transparent 62%)`,
              }}
            />
          )}
          <span
            className={cn(
              'relative font-serif text-4xl tracking-wide text-muted-foreground',
              textClassName,
            )}
            style={
              statusColor
                ? { textShadow: `0 0 12px color-mix(in srgb, ${statusColor} 42%, transparent)` }
                : undefined
            }
          >
            {initials(title)}
          </span>
        </div>
      )}
    </div>
  )
}
