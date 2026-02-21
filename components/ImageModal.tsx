'use client'

import { motion, AnimatePresence, useMotionValue, useTransform, animate as motionAnimate } from 'framer-motion'
import { useEffect, useCallback, useRef, useState } from 'react'
import type { ImageData } from '@/lib/images'

interface ImageModalProps {
  image: ImageData | null
  onClose: () => void
  images?: ImageData[]
  onNavigate?: (image: ImageData) => void
}

/**
 * Format a date string / ISO / timestamp into "21.02.2026 — 14:30"
 */
function formatDateTime(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year} — ${hours}:${mins}`
}

/**
 * ImageModal — Apple-inspired fullscreen viewer
 * 
 * PC: yeezy.com extreme minimalism with shared element transitions.
 * Mobile: iOS Photos-grade experience — no zoom, fluid translation gestures,
 *         rubber-band horizontal swipe, drag-to-dismiss with opacity fade,
 *         44pt touch targets, premium typography.
 */
export default function ImageModal({
  image,
  onClose,
  images = [],
  onNavigate,
}: ImageModalProps) {
  const isOpen = image !== null

  const lastImageRef = useRef<ImageData | null>(null)
  if (image) lastImageRef.current = image
  const displayImage = image ?? lastImageRef.current

  const idx = displayImage ? images.findIndex((i) => i.id === displayImage.id) : -1
  const hasPrev = idx > 0
  const hasNext = idx >= 0 && idx < images.length - 1

  const goPrev = useCallback(() => {
    if (hasPrev && onNavigate) onNavigate(images[idx - 1])
  }, [hasPrev, onNavigate, images, idx])

  const goNext = useCallback(() => {
    if (hasNext && onNavigate) onNavigate(images[idx + 1])
  }, [hasNext, onNavigate, images, idx])

  // ── Motion values ──
  const dragY = useMotionValue(0)
  const dragX = useMotionValue(0)

  // ── Detect mobile ──
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Derived motion ──
  // Mobile: pure opacity fade on drag, NO scale
  // Desktop: keep subtle scale for visual polish
  const backdropOpacity = useTransform(dragY, [-300, 0, 300], [0, 1, 0])
  const desktopImageScale = useTransform(dragY, [-300, 0, 300], [0.92, 1, 0.92])

  // ── Preload adjacent images for instant navigation ──
  useEffect(() => {
    if (!isOpen || idx < 0) return
    const preload = (url: string) => { const img = new window.Image(); img.src = url }
    if (idx > 0) {
      preload(images[idx - 1].image_url)
      if (images[idx - 1].thumbnail_url) preload(images[idx - 1].thumbnail_url!)
    }
    if (idx < images.length - 1) {
      preload(images[idx + 1].image_url)
      if (images[idx + 1].thumbnail_url) preload(images[idx + 1].thumbnail_url!)
    }
  }, [isOpen, idx, images])

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return
    const sw = window.innerWidth - document.documentElement.clientWidth
    const prev = { ov: document.body.style.overflow, pr: document.body.style.paddingRight }
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${sw}px`
    return () => {
      document.body.style.overflow = prev.ov
      document.body.style.paddingRight = prev.pr
    }
  }, [isOpen])

  // Keyboard — with throttle for rapid key repeat
  useEffect(() => {
    if (!isOpen) return
    let lastNav = 0
    const NAV_COOLDOWN = 150

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }

      const now = Date.now()
      if (now - lastNav < NAV_COOLDOWN) return
      lastNav = now

      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose, goPrev, goNext])

  // ── Touch gestures ──
  const touchRef = useRef<{
    x: number; y: number; t: number
    direction: 'none' | 'h' | 'v'
  } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now(), direction: 'none' }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchRef.current.x
    const dy = touch.clientY - touchRef.current.y

    // Lock direction after 8px movement
    if (touchRef.current.direction === 'none' && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      touchRef.current.direction = Math.abs(dy) >= Math.abs(dx) ? 'v' : 'h'
    }

    // Vertical — translate only, backdrop fades (NO scale on mobile)
    if (touchRef.current.direction === 'v') {
      dragY.set(dy)
    }

    // Horizontal — rubber-band follow with edge resistance
    if (touchRef.current.direction === 'h') {
      const atEdge = (!hasPrev && dx > 0) || (!hasNext && dx < 0)
      const resistance = atEdge ? 0.25 : 0.85
      dragX.set(dx * resistance)
    }
  }, [dragY, dragX, hasPrev, hasNext])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchRef.current.x
    const dy = touch.clientY - touchRef.current.y
    const dt = Math.max(Date.now() - touchRef.current.t, 1)
    const dir = touchRef.current.direction
    touchRef.current = null

    if (dir === 'v') {
      const vy = Math.abs(dy / dt) * 1000
      if (Math.abs(dy) > 80 || vy > 600) {
        // Dismiss — slide out in drag direction, fade backdrop
        motionAnimate(dragY, dy > 0 ? 600 : -600, { duration: 0.25, ease: [0.32, 0.72, 0, 1] })
        setTimeout(onClose, 180)
      } else {
        // Spring back
        motionAnimate(dragY, 0, { type: 'spring', stiffness: 400, damping: 30 })
      }
      return
    }

    if (dir === 'h') {
      const vx = Math.abs(dx / dt) * 1000
      if (Math.abs(dx) > 40 || vx > 400) {
        if (dx < 0) goNext()
        else goPrev()
      }
      // Spring back horizontal
      motionAnimate(dragX, 0, { type: 'spring', stiffness: 400, damping: 30 })
    }
  }, [dragY, dragX, goNext, goPrev, onClose])

  const handleExitComplete = useCallback(() => {
    lastImageRef.current = null
    dragY.set(0)
    dragX.set(0)
  }, [dragY, dragX])

  const dateTime = displayImage ? formatDateTime(displayImage.created_at) : ''
  const counter = idx >= 0 ? `${idx + 1} / ${images.length}` : ''

  // ── Apple-style spring curves ──
  const appleEase = [0.25, 0.1, 0.25, 1] as const

  return (
    <>
      {/* LAYER 1: Shared element image */}
      <AnimatePresence>
        {image && (
          <motion.div
            key={`modal-media-${image.id}`}
            className="fixed inset-0 z-[55] flex items-center justify-center pointer-events-none"
            style={{
              padding: isMobile
                ? 'max(44px, env(safe-area-inset-top, 8px)) 0px max(64px, env(safe-area-inset-bottom, 8px))'
                : 'max(60px, env(safe-area-inset-top, 16px)) 12px max(100px, env(safe-area-inset-bottom, 16px))'
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              // Desktop: subtle scale exit. Mobile: pure fade, no zoom
              ...(isMobile ? {} : { scale: 0.95 }),
              transition: { duration: 0.3, ease: appleEase }
            }}
          >
            <motion.div
              layoutId={isMobile ? undefined : `image-${image.id}`}
              className="relative w-full max-w-5xl pointer-events-auto"
              style={{
                aspectRatio: '1 / 1',
                maxHeight: isMobile ? 'calc(100dvh - 110px)' : 'calc(100dvh - 180px)',
                y: dragY,
                x: dragX,
                // Mobile: NO scale transform — pure translation only
                ...(isMobile ? {} : { scale: desktopImageScale }),
              }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              transition={{
                layout: { duration: 0.4, ease: appleEase }
              }}
            >
              {image.video_url ? (
                <video
                  key={image.video_url}
                  src={image.video_url}
                  poster={image.image_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controlsList="nodownload nofullscreen noremoteplayback"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : (
                <img
                  src={image.image_url}
                  alt={image.title || ''}
                  className="absolute inset-0 w-full h-full object-contain"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    if (image.thumbnail_url && target.src !== image.thumbnail_url) {
                      target.src = image.thumbnail_url
                    }
                  }}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LAYER 2: Overlay — backdrop, controls, info */}
      <AnimatePresence onExitComplete={handleExitComplete}>
        {isOpen && displayImage && (
          <motion.div
            key="modal-overlay"
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: appleEase }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* White backdrop — fades with vertical drag */}
            <motion.div
              className="absolute inset-0 bg-white"
              style={{ opacity: backdropOpacity }}
              onClick={onClose}
            />

            {/* ═══ TOP BAR ═══ */}
            <div
              className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 sm:px-5"
              style={{
                paddingTop: 'env(safe-area-inset-top, 0px)',
                height: isMobile ? '44px' : '64px',
              }}
            >
              {/* Close button — 44pt Apple HIG minimum */}
              <button
                onClick={onClose}
                className="flex items-center justify-center text-black/80 active:opacity-40 transition-opacity duration-150"
                style={{ minWidth: 44, minHeight: 44 }}
                aria-label="Close"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-7 sm:h-7">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              {/* Counter — desktop: text, mobile: dot indicators */}
              {counter && (
                <span className="hidden sm:inline text-[10px] tracking-[0.2em] text-neutral-400 font-light tabular-nums">
                  {counter}
                </span>
              )}

              {idx >= 0 && images.length > 1 && (
                <div className="flex sm:hidden items-center gap-[6px] pr-1">
                  {images.length <= 9 ? (
                    images.map((_, i) => (
                      <div
                        key={i}
                        className="rounded-full transition-all duration-300 ease-out"
                        style={{
                          width: i === idx ? 6 : 5,
                          height: i === idx ? 6 : 5,
                          backgroundColor: i === idx ? '#000' : '#d4d4d4',
                          opacity: i === idx ? 1 : 0.6,
                        }}
                      />
                    ))
                  ) : (
                    <>
                      <span className="text-[10px] tracking-[0.15em] text-neutral-400 font-light tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="text-[8px] text-neutral-300 font-light">/</span>
                      <span className="text-[10px] tracking-[0.15em] text-neutral-300 font-light tabular-nums">
                        {images.length}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ═══ NAVIGATION ARROWS — desktop only ═══ */}
            {hasPrev && (
              <button
                onClick={goPrev}
                className="hidden sm:flex absolute top-1/2 -translate-y-1/2 left-4 sm:left-6 z-10 w-14 h-14 items-center justify-center text-black/50 hover:text-black transition-colors duration-200"
                aria-label="Previous"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}

            {hasNext && (
              <button
                onClick={goNext}
                className="hidden sm:flex absolute top-1/2 -translate-y-1/2 right-4 sm:right-6 z-10 w-14 h-14 items-center justify-center text-black/50 hover:text-black transition-colors duration-200"
                aria-label="Next"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}

            {/* ═══ BOTTOM INFO ═══ */}
            <div
              className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
              style={{
                paddingBottom: isMobile
                  ? 'max(16px, env(safe-area-inset-bottom, 12px))'
                  : 'max(28px, env(safe-area-inset-bottom, 24px))',
              }}
            >
              <div className="flex flex-col items-center gap-1 sm:gap-1.5 px-6 sm:px-4">
                {/* Caption */}
                {displayImage.caption && (
                  <p className="text-[13px] sm:text-[12px] font-normal text-black tracking-wide text-center max-w-sm sm:max-w-md leading-relaxed">
                    {displayImage.overlays?.icon?.data && (
                      <span className="mr-1.5">{displayImage.overlays.icon.data}</span>
                    )}
                    {displayImage.caption}
                  </p>
                )}

                {/* Date & time */}
                {dateTime && (
                  <p className="text-[10px] sm:text-[10px] text-neutral-400 tracking-[0.15em] font-light tabular-nums">
                    {dateTime}
                  </p>
                )}

                {/* Source tag */}
                {displayImage.source === 'locket' && (
                  <p className="text-[8px] sm:text-[9px] tracking-[0.2em] text-neutral-300 uppercase font-medium mt-0.5 sm:mt-1">
                    synced from locket
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
