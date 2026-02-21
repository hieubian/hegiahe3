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
 * Architecture:
 * - Single touch handler layer (overlay, z-50) — prevents conflicts
 * - Native event listener with { passive: false } for proper preventDefault
 * - touch-action: none on modal root — stops browser gesture interference
 * - Body scroll fully locked on mobile via position:fixed trick
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
  const backdropOpacity = useTransform(dragY, [-300, 0, 300], [0, 1, 0])
  const desktopImageScale = useTransform(dragY, [-300, 0, 300], [0.92, 1, 0.92])

  // ── Refs for native event listener ──
  const overlayRef = useRef<HTMLDivElement>(null)
  const hasPrevRef = useRef(hasPrev)
  const hasNextRef = useRef(hasNext)
  const goPrevRef = useRef(goPrev)
  const goNextRef = useRef(goNext)
  const onCloseRef = useRef(onClose)

  hasPrevRef.current = hasPrev
  hasNextRef.current = hasNext
  goPrevRef.current = goPrev
  goNextRef.current = goNext
  onCloseRef.current = onClose

  // ── Preload adjacent images ──
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

  // ── Lock body scroll — position:fixed trick for iOS Safari ──
  useEffect(() => {
    if (!isOpen) return

    const scrollY = window.scrollY
    const body = document.body
    const html = document.documentElement

    // Desktop: simple overflow hidden
    const sw = window.innerWidth - html.clientWidth
    const prevStyles = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
    }

    body.style.overflow = 'hidden'
    body.style.paddingRight = `${sw}px`

    // Mobile: position:fixed trick — the ONLY reliable way on iOS Safari
    if (window.innerWidth < 640) {
      body.style.position = 'fixed'
      body.style.top = `-${scrollY}px`
      body.style.left = '0'
      body.style.right = '0'
      body.style.width = '100%'
    }

    return () => {
      body.style.overflow = prevStyles.overflow
      body.style.position = prevStyles.position
      body.style.top = prevStyles.top
      body.style.left = prevStyles.left
      body.style.right = prevStyles.right
      body.style.width = prevStyles.width
      body.style.paddingRight = prevStyles.paddingRight
      // Restore scroll position after position:fixed
      if (window.innerWidth < 640) {
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])

  // Keyboard
  useEffect(() => {
    if (!isOpen) return
    let lastNav = 0
    const NAV_COOLDOWN = 150

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCloseRef.current(); return }
      const now = Date.now()
      if (now - lastNav < NAV_COOLDOWN) return
      lastNav = now
      if (e.key === 'ArrowLeft') goPrevRef.current()
      else if (e.key === 'ArrowRight') goNextRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  // ── Native touch handler — { passive: false } for proper preventDefault ──
  // This is the SINGLE touch handler for the entire modal.
  // Using native addEventListener because React synthetic events can't reliably preventDefault.
  useEffect(() => {
    if (!isOpen) return
    const el = overlayRef.current
    if (!el) return

    let touch: { x: number; y: number; t: number; dir: 'none' | 'h' | 'v' } | null = null

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      touch = { x: t.clientX, y: t.clientY, t: Date.now(), dir: 'none' }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!touch) return
      const t = e.touches[0]
      const dx = t.clientX - touch.x
      const dy = t.clientY - touch.y

      // Lock direction
      if (touch.dir === 'none' && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        touch.dir = Math.abs(dy) >= Math.abs(dx) ? 'v' : 'h'
      }

      // CRITICAL: prevent browser scroll/pull-to-refresh
      if (touch.dir !== 'none') {
        e.preventDefault()
      }

      if (touch.dir === 'v') {
        dragY.set(dy)
      }

      if (touch.dir === 'h') {
        const atEdge = (!hasPrevRef.current && dx > 0) || (!hasNextRef.current && dx < 0)
        dragX.set(dx * (atEdge ? 0.2 : 0.85))
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!touch) return
      const t = e.changedTouches[0]
      const dx = t.clientX - touch.x
      const dy = t.clientY - touch.y
      const dt = Math.max(Date.now() - touch.t, 1)
      const dir = touch.dir
      touch = null

      if (dir === 'v') {
        const vy = Math.abs(dy / dt) * 1000
        if (Math.abs(dy) > 70 || vy > 500) {
          // Dismiss
          motionAnimate(dragY, dy > 0 ? 500 : -500, {
            duration: 0.22,
            ease: [0.32, 0.72, 0, 1],
          })
          setTimeout(() => onCloseRef.current(), 160)
        } else {
          // Spring back
          motionAnimate(dragY, 0, { type: 'spring', stiffness: 300, damping: 28 })
        }
        return
      }

      if (dir === 'h') {
        const vx = Math.abs(dx / dt) * 1000
        if (Math.abs(dx) > 35 || vx > 350) {
          if (dx < 0) goNextRef.current()
          else goPrevRef.current()
        }
        motionAnimate(dragX, 0, { type: 'spring', stiffness: 300, damping: 28 })
      }
    }

    // { passive: false } is ESSENTIAL — allows preventDefault() to work
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [isOpen, dragY, dragX])

  const handleExitComplete = useCallback(() => {
    lastImageRef.current = null
    dragY.set(0)
    dragX.set(0)
  }, [dragY, dragX])

  const dateTime = displayImage ? formatDateTime(displayImage.created_at) : ''
  const counter = idx >= 0 ? `${idx + 1} / ${images.length}` : ''
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
            initial={{ opacity: isMobile ? 0 : 1 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              ...(isMobile ? {} : { scale: 0.95 }),
              transition: { duration: 0.3, ease: appleEase }
            }}
          >
            <motion.div
              layoutId={isMobile ? undefined : `image-${image.id}`}
              className="relative w-full max-w-5xl pointer-events-none"
              style={{
                aspectRatio: '1 / 1',
                maxHeight: isMobile ? 'calc(100dvh - 110px)' : 'calc(100dvh - 180px)',
                y: dragY,
                x: dragX,
                ...(isMobile ? {} : { scale: desktopImageScale }),
                willChange: 'transform',
              }}
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

      {/* LAYER 2: Overlay — backdrop, controls, ALL touch handling */}
      <AnimatePresence onExitComplete={handleExitComplete}>
        {isOpen && displayImage && (
          <motion.div
            ref={overlayRef}
            key="modal-overlay"
            className="fixed inset-0 z-50"
            style={{ touchAction: 'none' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: appleEase }}
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

            {/* ═══ NAVIGATION ARROWS ═══ */}
            {/* Mobile: smaller, lower position for thumb reach */}
            {/* Desktop: larger, vertically centered — yeezy.com style */}
            {hasPrev && (
              <button
                onClick={goPrev}
                className="absolute z-10 flex items-center justify-center active:opacity-40 transition-opacity duration-150
                  top-[60%] -translate-y-1/2 left-1 w-11 h-11
                  sm:top-1/2 sm:left-6 sm:w-14 sm:h-14
                  text-black/30 sm:text-black/50 sm:hover:text-black"
                aria-label="Previous"
              >
                <svg className="w-[18px] h-[18px] sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}

            {hasNext && (
              <button
                onClick={goNext}
                className="absolute z-10 flex items-center justify-center active:opacity-40 transition-opacity duration-150
                  top-[60%] -translate-y-1/2 right-1 w-11 h-11
                  sm:top-1/2 sm:right-6 sm:w-14 sm:h-14
                  text-black/30 sm:text-black/50 sm:hover:text-black"
                aria-label="Next"
              >
                <svg className="w-[18px] h-[18px] sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                {displayImage.caption && (
                  <p className="text-[13px] sm:text-[12px] font-normal text-black tracking-wide text-center max-w-sm sm:max-w-md leading-relaxed">
                    {displayImage.overlays?.icon?.data && (
                      <span className="mr-1.5">{displayImage.overlays.icon.data}</span>
                    )}
                    {displayImage.caption}
                  </p>
                )}

                {dateTime && (
                  <p className="text-[10px] sm:text-[10px] text-neutral-400 tracking-[0.15em] font-light tabular-nums">
                    {dateTime}
                  </p>
                )}

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
