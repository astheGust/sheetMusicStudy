'use client'

import Image from 'next/image'
import { useState } from 'react'
import { initials } from '@/lib/data'
import { cn } from '@/lib/utils'

export function ScoreCover({
  src,
  title,
  className,
  sizes = '(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 50vw',
  priority,
  textClassName,
}: {
  src: string | null
  title: string
  className?: string
  sizes?: string
  priority?: boolean
  textClassName?: string
}) {
  const [failed, setFailed] = useState(false)
  const showImage = src && !failed

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
          className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,oklch(0.27_0.01_260),oklch(0.19_0.008_260))]"
          aria-label={`Capa indisponível de ${title}`}
          role="img"
        >
          <span
            className={cn(
              'font-serif text-4xl tracking-wide text-muted-foreground',
              textClassName,
            )}
          >
            {initials(title)}
          </span>
        </div>
      )}
    </div>
  )
}
