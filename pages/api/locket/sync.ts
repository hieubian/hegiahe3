/**
 * Locket Sync API — Sync personal Locket photos into hegiahe2 gallery
 * Follows hegiahe2 philosophy: personal photos become part of your gallery
 *
 * Flow:
 *   1. Fetch user's personal moments via /api/locket/moments (with auth)
 *   2. Convert to gallery format, dedup by slug
 *   3. Merge into database/images.json
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

interface SyncResponse {
  success: boolean
  syncedCount?: number
  skippedCount?: number
  message?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    // Get Locket credentials from request body or headers
    const idToken = req.body?.token || req.headers['x-locket-token'] as string
    const localId = req.body?.localId || req.headers['x-locket-uid'] as string

    if (!idToken || !localId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập Locket. Vui lòng kết nối tài khoản trước.'
      })
    }

    // Fetch personal moments via our own API
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3000}`
    const momentsResponse = await fetch(`${baseUrl}/api/locket/moments`, {
      headers: {
        'x-locket-token': idToken,
        'x-locket-uid': localId,
      },
    })

    const momentsResult = await momentsResponse.json()

    if (!momentsResult.success || !momentsResult.data) {
      return res.status(400).json({
        success: false,
        message: momentsResult.message || 'Không thể tải ảnh từ Locket'
      })
    }

    // Load existing gallery database
    const dbPath = path.join(process.cwd(), 'database', 'images.json')
    let existingImages: any[] = []
    let nextId = 1

    try {
      const dbData = fs.readFileSync(dbPath, 'utf8')
      const db = JSON.parse(dbData)
      existingImages = Array.isArray(db) ? db : (db.images || [])
      nextId = Array.isArray(db)
        ? Math.max(0, ...existingImages.map((img: any) => parseInt(img.id) || 0)) + 1
        : db.nextId || existingImages.length + 1
    } catch {
      console.log('Creating new database')
    }

    // Convert Locket moments → gallery images
    const existingSlugs = new Set(existingImages.map((img: any) => img.slug))
    let syncedCount = 0
    let skippedCount = 0

    const newImages = momentsResult.data
      .filter((moment: any) => moment.thumbnailUrl || moment.imageUrl) // Must have a valid image URL
      .map((moment: any) => {
        const slug = `locket-${moment.id}`

        // Skip duplicates
        if (existingSlugs.has(slug)) {
          skippedCount++
          return null
        }

        syncedCount++
        existingSlugs.add(slug)

        const dateStr = moment.date || (moment.createTime
          ? new Date(moment.createTime * 1000).toISOString()
          : new Date().toISOString())

        return {
          id: nextId++,
          slug,
          title: moment.caption || `Locket ${moment.date || new Date(moment.createTime * 1000).toLocaleDateString('vi-VN')}`,
          description: moment.videoUrl ? 'Video từ Locket' : 'Ảnh cá nhân từ Locket',
          image_url: moment.imageUrl || moment.thumbnailUrl,      // Full-res for display
          video_url: moment.videoUrl || undefined,
          thumbnail_url: moment.thumbnailUrl || moment.imageUrl,  // Thumbnail for grid
          width: 1080,
          height: 1080,
          created_at: dateStr,
          updated_at: new Date().toISOString(),
          order_index: existingImages.length + syncedCount,
          source: 'locket',
          locket_user_id: localId,
        }
      })
      .filter(Boolean) // Remove nulls (skipped duplicates)

    if (newImages.length === 0) {
      return res.status(200).json({
        success: true,
        syncedCount: 0,
        skippedCount,
        message: skippedCount > 0
          ? `Tất cả ${skippedCount} ảnh đã được đồng bộ trước đó`
          : 'Không có ảnh mới để đồng bộ'
      })
    }

    // Merge and save
    const updatedImages = [...existingImages, ...newImages]
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

    fs.writeFileSync(dbPath, JSON.stringify({
      images: updatedImages,
      nextId,
    }, null, 2))

    return res.status(200).json({
      success: true,
      syncedCount: newImages.length,
      skippedCount,
      message: `Đã đồng bộ ${newImages.length} ảnh cá nhân vào gallery`,
    })

  } catch (error: any) {
    console.error('Sync API error:', error?.message || error)
    return res.status(500).json({
      success: false,
      message: error?.message || 'Lỗi khi đồng bộ ảnh'
    })
  }
}