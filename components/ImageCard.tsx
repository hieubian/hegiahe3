'use client'

import { motion } from 'framer-motion'
import { useState, useCallback, useEffect, memo } from 'react'
import type { ImageData } from '@/lib/images'

interface ImageCardProps {
  image: ImageData
  layoutId: string
  isSelected?: boolean
}

/**
 * ImageCard — yeezy.com extreme minimalism
 * 
 * - Clean hover: subtle scale + fade overlay (desktop only)
 * - Date/time shown below image
 * - "LOCKET" source tag
 * - No rounded corners, no shadows — just the image
 * - Mobile: no hover scale, no layoutId shared element transition
 */
function ImageCard({ image, layoutId, isSelected = false }: ImageCardProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const handleLoad = useCallback(() => setIsLoaded(true), [])

  // Detect mobile — disable shared element transition on mobile
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

  // Format date: "21.02.2026 — 14:30"
  const formattedDate = image.created_at
    ? (() => {
      const d = new Date(image.created_at)
      if (isNaN(d.getTime())) return ''
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      const hours = String(d.getHours()).padStart(2, '0')
      const mins = String(d.getMinutes()).padStart(2, '0')
      return `${day}.${month}.${year} — ${hours}:${mins}`
    })()
    : ''

  return (
    <div className="flex flex-col">
      {/* Image container */}
      <div
        className="relative overflow-hidden cursor-pointer group"
        style={{ aspectRatio: '1 / 1' }}
      >
        {!isSelected && (
          <motion.div
            layoutId={isMobile ? undefined : layoutId}
            className="absolute inset-0"
            transition={{
              layout: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }
            }}
          >
            <img
              src={image.thumbnail_url || image.image_url}
              alt={image.title || ''}
              className={`
                w-full h-full object-cover
                transition-all duration-300 ease-out
                sm:group-hover:scale-[1.02]
                ${isLoaded ? 'opacity-100' : 'opacity-0'}
              `}
              onLoad={handleLoad}
              loading="lazy"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                if (image.image_url && target.src !== image.image_url) {
                  target.src = image.image_url
                }
              }}
            />

            {/* Hover overlay — subtle fade */}
            <div className="absolute inset-0 bg-black/0 sm:group-hover:bg-black/10 transition-all duration-200 ease-out" />
          </motion.div>
        )}

        {/* Video indicator — minimal */}
        {image.video_url && !isSelected && (
          <div className="absolute top-3 left-3 z-10 pointer-events-none opacity-70 sm:group-hover:opacity-100 transition-opacity duration-300">
            <svg className="w-4 h-4 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        )}

        {/* Placeholder */}
        {(!isLoaded || isSelected) && (
          <div className="absolute inset-0 bg-neutral-50" />
        )}
      </div>

      {/* Spacing below image — consistent height regardless of caption */}
      {!isSelected && (
        <div className="pt-1.5 pb-2.5 sm:pt-2.5 sm:pb-4 text-center min-h-[28px] sm:min-h-[36px]">
          {image.caption && (
            <p className="text-[10px] sm:text-[11px] font-medium text-black truncate leading-tight px-0.5">
              {image.overlays?.icon?.data && (
                <span className="mr-1">{image.overlays.icon.data}</span>
              )}
              {image.caption}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(ImageCard)
