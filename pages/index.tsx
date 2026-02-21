'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/router'
import { LayoutGroup } from 'framer-motion'
import type { ImageData } from '@/lib/images'
import Navbar from '@/components/Navbar'
import ImageCard from '@/components/ImageCard'
import ImageModal from '@/components/ImageModal'

/**
 * Moment data from Locket API
 */
interface LocketMoment {
  id: string
  user: string
  imageUrl: string
  thumbnailUrl: string
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
 * Convert Locket moment → ImageData
 */
function momentToImageData(m: LocketMoment): ImageData {
  return {
    id: m.id,
    slug: m.id,
    image_url: m.imageUrl || m.thumbnailUrl,
    thumbnail_url: m.thumbnailUrl,
    video_url: m.videoUrl || undefined,
    title: m.caption || '',
    caption: m.caption || undefined,
    width: 1,
    height: 1,
    created_at: m.createTime
      ? new Date(m.createTime * 1000).toISOString()
      : new Date().toISOString(),
    order_index: 0,
    source: 'locket',
    overlays: m.overlays,
  }
}

/**
 * Home — yeezy.com extreme minimalism
 * 
 * Clean grid, Inter font, no clutter. Each image shows date below.
 * Click → full-screen modal with shared element transition.
 */
export default function Home() {
  const router = useRouter()
  const [images, setImages] = useState<ImageData[]>([])
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const lastViewedRef = useRef<string | null>(null)
  const IMAGES_PER_PAGE = 24

  useEffect(() => {
    const token = localStorage.getItem('locket_token')
    const localId = localStorage.getItem('locket_local_id')

    if (!token || !localId) {
      setIsConnected(false)
      setLoading(false)
      return
    }

    setIsConnected(true)
    fetchMoments(token, localId)
  }, [])

  const fetchMoments = async (token: string, localId: string) => {
    try {
      setLoading(true)
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
        setImages(sorted.map(momentToImageData))
      }
    } catch (err) {
      console.error('Failed to fetch moments:', err)
    } finally {
      setLoading(false)
    }
  }

  // Sync modal state with URL
  useEffect(() => {
    const slug = router.query.slug as string | undefined
    if (slug) {
      const found = images.find(img => img.slug === slug)
      if (found && found.slug !== selectedImage?.slug) {
        // Auto-jump to the page containing this image
        const imgIdx = images.findIndex(img => img.slug === slug)
        if (imgIdx >= 0) {
          const targetPage = Math.floor(imgIdx / IMAGES_PER_PAGE) + 1
          if (targetPage !== currentPage) setCurrentPage(targetPage)
        }
        setSelectedImage(found)
      }
    } else if (selectedImage) {
      setSelectedImage(null)
    }
  }, [router.query.slug, images]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pagination
  const totalPages = Math.max(1, Math.ceil(images.length / IMAGES_PER_PAGE))
  const paginatedImages = useMemo(() => {
    const start = (currentPage - 1) * IMAGES_PER_PAGE
    return images.slice(start, start + IMAGES_PER_PAGE)
  }, [images, currentPage])

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Scroll to last viewed image when modal closes
  useEffect(() => {
    if (!selectedImage && lastViewedRef.current) {
      const slug = lastViewedRef.current
      lastViewedRef.current = null
      requestAnimationFrame(() => {
        const el = document.querySelector(`a[href="/p/${slug}"]`)
        if (el) el.scrollIntoView({ block: 'center' })
      })
    }
  }, [selectedImage])

  // Open modal
  const handleImageClick = useCallback((e: React.MouseEvent, image: ImageData) => {
    e.preventDefault()
    setSelectedImage(image)
    router.push(
      { pathname: '/', query: { slug: image.slug } },
      `/p/${image.slug}`,
      { shallow: true, scroll: false }
    )
  }, [router])

  // Close modal
  const handleCloseModal = useCallback(() => {
    lastViewedRef.current = selectedImage?.slug ?? null
    setSelectedImage(null)
    router.push('/', '/', { shallow: true, scroll: false })
  }, [router, selectedImage])

  // Navigate inside modal — sync page
  const handleNavigate = useCallback((image: ImageData) => {
    const imgIdx = images.findIndex(img => img.id === image.id)
    if (imgIdx >= 0) {
      setCurrentPage(Math.floor(imgIdx / IMAGES_PER_PAGE) + 1)
    }
    setSelectedImage(image)
    router.push(
      { pathname: '/', query: { slug: image.slug } },
      `/p/${image.slug}`,
      { shallow: true, scroll: false }
    )
  }, [router, images])

  return (
    <LayoutGroup>
      <Navbar />

      <main className="min-h-screen pt-14 sm:pt-20 pb-8 sm:pb-16 px-2.5 sm:px-8 md:px-12 lg:px-16">
        <div className="max-w-[1400px] mx-auto">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-2 gap-y-0 sm:gap-x-4 sm:gap-y-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col">
                  <div className="skeleton" style={{ aspectRatio: '1 / 1' }} />
                  <div className="pt-1.5 pb-2.5 sm:pt-2.5 sm:pb-4 flex justify-center min-h-[28px] sm:min-h-[36px]">
                    <div className="skeleton h-2 w-20 rounded-sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : !isConnected ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
              <p className="text-[10px] tracking-[0.4em] text-neutral-300 mb-10 uppercase">
                no connection
              </p>
              <button
                onClick={() => router.push('/admin')}
                className="px-8 py-3 bg-black text-white text-[10px] tracking-[0.25em] uppercase hover:bg-neutral-800 transition-colors duration-300"
              >
                connect locket
              </button>
            </div>
          ) : images.length > 0 ? (
            <>
              {/* Grid — uniform columns, no masonry */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-2 gap-y-0 sm:gap-x-4 sm:gap-y-1">
                {paginatedImages.map((image) => (
                  <a
                    key={image.id}
                    href={`/p/${image.slug}`}
                    onClick={(e) => handleImageClick(e, image)}
                  >
                    <ImageCard
                      image={image}
                      layoutId={`image-${image.id}`}
                      isSelected={selectedImage?.id === image.id}
                    />
                  </a>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-12 mb-8">
                  {/* Prev */}
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-9 h-9 flex items-center justify-center text-neutral-400 hover:text-black disabled:opacity-20 disabled:cursor-default active:scale-90 transition-all duration-150"
                    aria-label="Previous page"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6"/>
                    </svg>
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`
                        w-9 h-9 flex items-center justify-center text-[11px] tracking-wide
                        active:scale-90 transition-all duration-150
                        ${page === currentPage
                          ? 'text-black font-medium'
                          : 'text-neutral-300 hover:text-neutral-600'
                        }
                      `}
                    >
                      {page}
                    </button>
                  ))}

                  {/* Next */}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-9 h-9 flex items-center justify-center text-neutral-400 hover:text-black disabled:opacity-20 disabled:cursor-default active:scale-90 transition-all duration-150"
                    aria-label="Next page"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Footer spacer */}
              <div className="mt-8 mb-8" />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
              <p className="text-[10px] tracking-[0.4em] text-neutral-300 uppercase">
                no moments yet
              </p>
            </div>
          )}
        </div>
      </main>

      <ImageModal
        image={selectedImage}
        onClose={handleCloseModal}
        images={images}
        onNavigate={handleNavigate}
      />
    </LayoutGroup>
  )
}
