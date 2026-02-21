/**
 * Direct-access page for /p/[slug]
 * 
 * When user visits /p/[momentId] directly (bookmark, refresh, share link)
 * this page loads and fetches the specific moment from Locket.
 * When navigating from the grid, index.tsx handles it via shallow routing.
 * 
 * Design: yeezy.com extreme minimalism — white backdrop, thin icons,
 * full date/time, "synced from locket" tag.
 */
import { useRouter } from 'next/router'
import Head from 'next/head'
import { motion } from 'framer-motion'
import { useState, useEffect, useCallback, useRef } from 'react'

interface LocketMoment {
  id: string
  user: string
  imageUrl: string       // Full-resolution image
  thumbnailUrl: string   // Compressed thumbnail
  videoUrl: string | null
  caption: string | null
  overlays: {
    background?: { colors?: string[] }
    textColor?: string
    icon?: { type?: string; data?: string }
  } | null
  createTime: number
  date: string
}

/**
 * Format timestamp → "21.02.2026 — 14:30"
 */
function formatDateTime(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year} — ${hours}:${mins}`
}

export default function MomentPage() {
  const router = useRouter()
  const { slug } = router.query

  const [moment, setMoment] = useState<LocketMoment | null>(null)
  const [allMoments, setAllMoments] = useState<LocketMoment[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return

    const token = localStorage.getItem('locket_token')
    const localId = localStorage.getItem('locket_local_id')

    if (!token || !localId) {
      setNotFound(true)
      setLoading(false)
      return
    }

    fetchMoments(token, localId, slug as string)
  }, [slug])

  const fetchMoments = async (token: string, localId: string, momentId: string) => {
    try {
      const res = await fetch('/api/locket/moments', {
        headers: {
          'x-locket-token': token,
          'x-locket-uid': localId,
        },
      })
      const result = await res.json()

      if (res.ok && result.success) {
        const sorted = (result.data || []).sort(
          (a: LocketMoment, b: LocketMoment) => b.createTime - a.createTime
        )
        setAllMoments(sorted)

        const found = sorted.find((m: LocketMoment) => m.id === momentId)
        if (found) {
          setMoment(found)
        } else {
          setNotFound(true)
        }
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  const currentIdx = moment ? allMoments.findIndex(m => m.id === moment.id) : -1
  const hasPrev = currentIdx > 0
  const hasNext = currentIdx >= 0 && currentIdx < allMoments.length - 1
  const counter = currentIdx >= 0 ? `${currentIdx + 1} / ${allMoments.length}` : ''

  const handleBack = useCallback(() => router.push('/'), [router])
  const goPrev = useCallback(() => {
    if (hasPrev) router.push(`/p/${allMoments[currentIdx - 1].id}`)
  }, [hasPrev, allMoments, currentIdx, router])
  const goNext = useCallback(() => {
    if (hasNext) router.push(`/p/${allMoments[currentIdx + 1].id}`)
  }, [hasNext, allMoments, currentIdx, router])

  // Keyboard navigation
  useEffect(() => {
    if (!moment) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleBack()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moment, handleBack, goPrev, goNext])

  // Touch swipe — horizontal for nav, vertical down to go back
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y
    const dt = Date.now() - touchStartRef.current.t
    touchStartRef.current = null

    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    const minSwipe = 50
    const maxTime = 400

    if (dt > maxTime) return

    if (absDx > absDy && absDx > minSwipe) {
      if (dx < 0) goNext()
      else goPrev()
      return
    }

    if (absDy > absDx && dy > minSwipe) {
      handleBack()
    }
  }, [goNext, goPrev, handleBack])

  // Lock body scroll
  useEffect(() => {
    const sw = window.innerWidth - document.documentElement.clientWidth
    const prev = { ov: document.body.style.overflow, pr: document.body.style.paddingRight }
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${sw}px`
    return () => {
      document.body.style.overflow = prev.ov
      document.body.style.paddingRight = prev.pr
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-5 h-5 border border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !moment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-6">
        <p className="text-[10px] tracking-[0.4em] text-neutral-300 uppercase">not found</p>
        <button
          onClick={handleBack}
          className="px-8 py-3 bg-black text-white text-[10px] tracking-[0.25em] uppercase hover:bg-neutral-800 transition-colors duration-300"
        >
          back
        </button>
      </div>
    )
  }

  const dateTime = formatDateTime(moment.createTime)

  return (
    <>
      <Head>
        <title>{moment.caption || 'Locket Moment'} — HEGIAHE</title>
        <meta property="og:image" content={moment.imageUrl || moment.thumbnailUrl} />
        <meta property="og:title" content={moment.caption || 'HEGIAHE'} />
      </Head>

      <div
        className="fixed inset-0 bg-white"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top bar — close + counter */}
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 sm:px-5 h-12 sm:h-16"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <button
            onClick={handleBack}
            className="text-black hover:opacity-50 active:opacity-40 transition-opacity duration-200 p-2 -ml-2"
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-7 sm:h-7">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

          {counter && (
            <span className="text-[10px] tracking-[0.2em] text-neutral-400 font-light tabular-nums">
              {counter}
            </span>
          )}
        </div>

        {/* Navigation arrows — hidden on mobile, visible on sm+ */}
        {hasPrev && (
          <button
            onClick={goPrev}
            className="hidden sm:flex absolute top-1/2 -translate-y-1/2 left-4 sm:left-6 z-10 w-12 h-12 items-center justify-center text-black hover:opacity-50 transition-opacity duration-200"
            aria-label="Previous"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        )}

        {hasNext && (
          <button
            onClick={goNext}
            className="hidden sm:flex absolute top-1/2 -translate-y-1/2 right-4 sm:right-6 z-10 w-12 h-12 items-center justify-center text-black hover:opacity-50 transition-opacity duration-200"
            aria-label="Next"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        )}

        {/* Media — centered */}
        <div
          className="h-full flex items-center justify-center px-3 sm:px-6"
          style={{ padding: 'max(56px, env(safe-area-inset-top, 56px)) 12px max(90px, env(safe-area-inset-bottom, 90px))' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
            className="relative w-full max-w-5xl"
            style={{
              aspectRatio: '1 / 1',
              maxHeight: 'calc(100dvh - 180px)',
            }}
          >
            {moment.videoUrl ? (
              <video
                key={moment.videoUrl}
                src={moment.videoUrl}
                poster={moment.imageUrl || moment.thumbnailUrl}
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
                src={moment.imageUrl || moment.thumbnailUrl}
                alt={moment.caption || ''}
                className="absolute inset-0 w-full h-full object-contain"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  if (moment.thumbnailUrl && target.src !== moment.thumbnailUrl) {
                    target.src = moment.thumbnailUrl
                  }
                }}
              />
            )}
          </motion.div>
        </div>

        {/* Bottom info — caption, datetime, source */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.25 }}
          className="absolute bottom-0 left-0 right-0 pb-6 sm:pb-8 pointer-events-none"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}
        >
          <div className="flex flex-col items-center gap-1 sm:gap-1.5 px-4">
            {/* Caption */}
            {moment.caption && (
              <p className="text-[11px] sm:text-[12px] font-normal text-black tracking-wide text-center max-w-md">
                {moment.overlays?.icon?.data && (
                  <span className="mr-1.5">{moment.overlays.icon.data}</span>
                )}
                {moment.caption}
              </p>
            )}

            {/* Date & time */}
            {dateTime && (
              <p className="text-[9px] sm:text-[10px] text-neutral-400 tracking-[0.15em] font-light tabular-nums">
                {dateTime}
              </p>
            )}

            {/* Source tag */}
            <p className="text-[8px] sm:text-[9px] tracking-[0.2em] text-neutral-300 uppercase font-medium mt-0.5 sm:mt-1">
              synced from locket
            </p>
          </div>
        </motion.div>
      </div>
    </>
  )
}
