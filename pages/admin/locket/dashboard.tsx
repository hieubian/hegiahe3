'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Moment interface — matches ACTUAL API response from getMomentV2 (camelCase)
 * Reference: Client-Locket-Dio-main/src/stores/useMomentsStoreV2.js
 */
interface LocketMoment {
  id: string
  user: string
  imageUrl: string       // Full-resolution image
  thumbnailUrl: string   // Compressed thumbnail
  videoUrl: string | null
  caption: string | null
  overlays: {
    background?: { colors?: string[]; material_blur?: string }
    textColor?: string
    icon?: { type?: string; data?: string }
  } | null
  createTime: number
  date: string
}

export default function LocketDashboard() {
  const router = useRouter()
  const [moments, setMoments] = useState<LocketMoment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [syncResult, setSyncResult] = useState<string>('')
  const [selectedMoment, setSelectedMoment] = useState<LocketMoment | null>(null)

  const getLocketCredentials = useCallback(() => {
    return {
      token: localStorage.getItem('locket_token') || '',
      localId: localStorage.getItem('locket_local_id') || '',
    }
  }, [])

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token')
    const locketToken = localStorage.getItem('locket_token')
    const locketUser = localStorage.getItem('locket_user')

    if (!adminToken) { router.push('/admin'); return }
    if (!locketToken) { router.push('/admin/locket'); return }
    if (locketUser) { try { setUser(JSON.parse(locketUser)) } catch { } }

    fetchLocketMoments()
  }, [router])

  const fetchLocketMoments = async () => {
    try {
      setLoading(true)
      setError('')
      const { token, localId } = getLocketCredentials()

      const response = await fetch('/api/locket/moments', {
        headers: {
          'x-locket-token': token,
          'x-locket-uid': localId,
        },
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Sort by createTime descending (newest first)
        const sorted = (result.data || []).sort((a: LocketMoment, b: LocketMoment) => b.createTime - a.createTime)
        setMoments(sorted)
      } else if (response.status === 401) {
        setError(result.message || 'Phiên đăng nhập hết hạn')
        logout()
        return
      } else {
        setError(result.message || 'Không thể tải ảnh')
      }
    } catch (err) {
      setError('Lỗi kết nối')
      console.error('Fetch moments error:', err)
    } finally {
      setLoading(false)
    }
  }

  const syncToGallery = async () => {
    try {
      setSyncing(true)
      setSyncResult('')
      const { token, localId } = getLocketCredentials()

      const response = await fetch('/api/locket/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-locket-token': token,
          'x-locket-uid': localId,
        },
        body: JSON.stringify({ token, localId }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSyncResult(result.message || `Đã đồng bộ ${result.syncedCount} ảnh`)
      } else {
        setSyncResult(result.message || 'Đồng bộ thất bại')
      }
    } catch (err) {
      setSyncResult('Lỗi khi đồng bộ')
      console.error('Sync error:', err)
    } finally {
      setSyncing(false)
    }
  }

  const resetAndSync = async () => {
    if (!confirm('Reset sẽ xoá toàn bộ dữ liệu cũ và đồng bộ lại từ Locket. Tiếp tục?')) return
    try {
      setResetting(true)
      setSyncResult('')
      const { token, localId } = getLocketCredentials()

      const response = await fetch('/api/locket/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-locket-token': token,
          'x-locket-uid': localId,
        },
        body: JSON.stringify({ token, localId }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSyncResult(`✅ ${result.message}`)
      } else {
        setSyncResult(`❌ ${result.message || 'Reset thất bại'}`)
      }
    } catch (err) {
      setSyncResult('❌ Lỗi khi reset')
      console.error('Reset error:', err)
    } finally {
      setResetting(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('locket_token')
    localStorage.removeItem('locket_refresh_token')
    localStorage.removeItem('locket_local_id')
    localStorage.removeItem('locket_user')
    router.push('/admin/locket')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-yeezy-sand">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-8 h-8 border-2 border-yeezy-black border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-sm text-yeezy-clay">Đang tải ảnh cá nhân từ Locket...</p>
        </motion.div>
      </div>
    )
  }

  const photos = moments.filter(m => !m.videoUrl)
  const videos = moments.filter(m => !!m.videoUrl)

  return (
    <div className="min-h-screen bg-yeezy-sand">
      {/* Header */}
      <div className="border-b border-yeezy-clay/20 bg-white/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-medium text-yeezy-black tracking-wider">ẢNH CÁ NHÂN</h1>
              {user && (
                <p className="text-sm text-yeezy-clay mt-1">
                  {user.displayName || user.email || 'Locket User'}
                  {user.photoURL && (
                    <img src={user.photoURL} alt="" className="inline w-5 h-5 rounded-full ml-2 -mt-0.5" />
                  )}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={syncToGallery}
                disabled={syncing || resetting || moments.length === 0}
                className={`px-4 py-2 text-xs font-medium tracking-wider transition-all ${syncing || resetting || moments.length === 0
                    ? 'bg-yeezy-clay/50 text-yeezy-sand cursor-not-allowed'
                    : 'bg-yeezy-black text-yeezy-sand hover:bg-yeezy-clay'
                  }`}
              >
                {syncing ? 'ĐANG ĐỒNG BỘ...' : `ĐỒNG BỘ ${moments.length} ẢNH`}
              </button>

              <button
                onClick={resetAndSync}
                disabled={resetting || syncing || moments.length === 0}
                className={`px-4 py-2 text-xs font-medium tracking-wider transition-all ${resetting || syncing || moments.length === 0
                    ? 'bg-orange-300/50 text-white cursor-not-allowed'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
              >
                {resetting ? 'ĐANG RESET...' : 'RESET & ĐỒNG BỘ LẠI'}
              </button>

              <button
                onClick={() => router.push('/admin/dashboard')}
                className="px-3 py-2 text-xs font-medium text-yeezy-clay hover:text-yeezy-black border border-yeezy-clay/30 hover:border-yeezy-black transition-all"
              >
                ADMIN
              </button>

              <button
                onClick={logout}
                className="px-3 py-2 text-xs font-medium text-red-600 hover:text-red-800 border border-red-300 hover:border-red-600 transition-all"
              >
                NGẮT KẾT NỐI
              </button>
            </div>
          </div>

          {syncResult && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-yeezy-clay mt-2 bg-white/50 px-3 py-2 rounded"
            >
              {syncResult}
            </motion.p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
            <p className="text-red-600 mb-4 text-sm">{error}</p>
            <button
              onClick={fetchLocketMoments}
              className="px-4 py-2 bg-yeezy-black text-yeezy-sand text-sm font-medium tracking-wider hover:bg-yeezy-clay transition-all"
            >
              THỬ LẠI
            </button>
          </motion.div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/50 p-4 text-center">
                <h3 className="text-2xl font-bold text-yeezy-black">{moments.length}</h3>
                <p className="text-xs text-yeezy-clay">Tổng</p>
              </div>
              <div className="bg-white/50 p-4 text-center">
                <h3 className="text-2xl font-bold text-yeezy-black">{photos.length}</h3>
                <p className="text-xs text-yeezy-clay">Ảnh</p>
              </div>
              <div className="bg-white/50 p-4 text-center">
                <h3 className="text-2xl font-bold text-yeezy-black">{videos.length}</h3>
                <p className="text-xs text-yeezy-clay">Video</p>
              </div>
            </div>

            {/* Moments Grid */}
            {moments.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
              >
                {moments.map((moment, index) => (
                  <motion.div
                    key={moment.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 1) }}
                    className="group relative aspect-square bg-white/30 rounded overflow-hidden cursor-pointer"
                    onClick={() => setSelectedMoment(moment)}
                  >
                    {/* Grid: use thumbnailUrl for fast load, fallback to imageUrl */}
                    <img
                      src={moment.thumbnailUrl || moment.imageUrl}
                      alt={moment.caption || 'Ảnh cá nhân'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        // Fallback: try imageUrl if thumbnailUrl failed
                        if (moment.imageUrl && target.src !== moment.imageUrl) {
                          target.src = moment.imageUrl
                        } else {
                          target.style.display = 'none'
                        }
                      }}
                    />

                    {/* Hover overlay with caption & date */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-end">
                      <div className="w-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {moment.caption && (
                          <p className="text-xs text-white font-medium truncate">
                            {moment.overlays?.icon?.data && (
                              <span className="mr-1">{moment.overlays.icon.data}</span>
                            )}
                            {moment.caption}
                          </p>
                        )}
                        <p className="text-[10px] text-white/70">
                          {moment.date || (moment.createTime
                            ? new Date(moment.createTime * 1000).toLocaleDateString('vi-VN')
                            : '')}
                        </p>
                      </div>
                    </div>

                    {/* Video badge */}
                    {moment.videoUrl && (
                      <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Caption overlay styling (gradient background from Locket) */}
                    {moment.caption && moment.overlays?.background?.colors && (
                      <div className="absolute bottom-0 left-0 right-0 h-1"
                        style={{
                          background: `linear-gradient(to right, ${moment.overlays.background.colors.join(', ')})`
                        }}
                      />
                    )}
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <p className="text-yeezy-clay mb-4 text-sm">Không tìm thấy ảnh cá nhân</p>
                <button
                  onClick={fetchLocketMoments}
                  className="px-4 py-2 bg-yeezy-black text-yeezy-sand text-sm font-medium tracking-wider hover:bg-yeezy-clay transition-all"
                >
                  TẢI LẠI
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Lightbox / Full Preview */}
      <AnimatePresence>
        {selectedMoment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedMoment(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] w-full"
              onClick={e => e.stopPropagation()}
            >
              {/* Lightbox: use full-res imageUrl, fallback to thumbnailUrl */}
              {selectedMoment.videoUrl ? (
                <video
                  src={selectedMoment.videoUrl}
                  poster={selectedMoment.imageUrl || selectedMoment.thumbnailUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full max-h-[80vh] object-contain rounded"
                />
              ) : (
                <img
                  src={selectedMoment.imageUrl || selectedMoment.thumbnailUrl}
                  alt={selectedMoment.caption || 'Ảnh cá nhân'}
                  className="w-full max-h-[80vh] object-contain rounded"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    if (selectedMoment.thumbnailUrl && target.src !== selectedMoment.thumbnailUrl) {
                      target.src = selectedMoment.thumbnailUrl
                    }
                  }}
                />
              )}

              {/* Caption & overlays */}
              <div className="mt-3 text-center">
                {selectedMoment.caption && (
                  <div
                    className="inline-block px-4 py-2 rounded-lg mb-2"
                    style={selectedMoment.overlays?.background?.colors ? {
                      background: `linear-gradient(135deg, ${selectedMoment.overlays.background.colors.join(', ')})`,
                      color: selectedMoment.overlays?.textColor || '#fff',
                    } : { color: '#fff' }}
                  >
                    {selectedMoment.overlays?.icon?.data && (
                      <span className="mr-2 text-lg">{selectedMoment.overlays.icon.data}</span>
                    )}
                    <span className="text-sm font-medium">{selectedMoment.caption}</span>
                  </div>
                )}
                <p className="text-xs text-white/50 mt-1">
                  {selectedMoment.date || (selectedMoment.createTime
                    ? new Date(selectedMoment.createTime * 1000).toLocaleDateString('vi-VN', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })
                    : '')}
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={() => setSelectedMoment(null)}
                className="absolute top-2 right-2 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}