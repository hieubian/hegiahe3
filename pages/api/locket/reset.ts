/**
 * Locket Reset API — Clear database and re-sync all moments from Locket
 * 
 * Flow:
 *   1. Clear database/images.json
 *   2. Fetch ALL current moments from Locket
 *   3. Save fresh data to database
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

interface ResetResponse {
    success: boolean
    syncedCount?: number
    message?: string
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResetResponse>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' })
    }

    try {
        const idToken = req.body?.token || req.headers['x-locket-token'] as string
        const localId = req.body?.localId || req.headers['x-locket-uid'] as string

        if (!idToken || !localId) {
            return res.status(401).json({
                success: false,
                message: 'Chưa đăng nhập Locket.'
            })
        }

        // Step 1: Fetch fresh moments from Locket API
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

        // Step 2: Convert ALL moments to gallery format (fresh, no dedup needed)
        let nextId = 1
        const newImages = momentsResult.data
            .filter((moment: any) => moment.thumbnailUrl || moment.imageUrl)
            .map((moment: any) => {
                const slug = `locket-${moment.id}`
                const dateStr = moment.date || (moment.createTime
                    ? new Date(moment.createTime * 1000).toISOString()
                    : new Date().toISOString())

                return {
                    id: nextId++,
                    slug,
                    title: moment.caption || `Locket ${moment.date || new Date(moment.createTime * 1000).toLocaleDateString('vi-VN')}`,
                    description: moment.videoUrl ? 'Video từ Locket' : 'Ảnh cá nhân từ Locket',
                    image_url: moment.imageUrl || moment.thumbnailUrl,
                    video_url: moment.videoUrl || undefined,
                    thumbnail_url: moment.thumbnailUrl || moment.imageUrl,
                    width: 1080,
                    height: 1080,
                    created_at: dateStr,
                    updated_at: new Date().toISOString(),
                    order_index: nextId - 1,
                    source: 'locket',
                    locket_user_id: localId,
                    caption: moment.caption || undefined,
                    overlays: moment.overlays || undefined,
                }
            })

        // Step 3: Write fresh database (completely replace old data)
        const dbPath = path.join(process.cwd(), 'database', 'images.json')
        const dbDir = path.dirname(dbPath)
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

        fs.writeFileSync(dbPath, JSON.stringify({
            images: newImages,
            nextId,
        }, null, 2))

        return res.status(200).json({
            success: true,
            syncedCount: newImages.length,
            message: `Đã reset và đồng bộ lại ${newImages.length} ảnh/video từ Locket`,
        })

    } catch (error: any) {
        console.error('Reset API error:', error?.message || error)
        return res.status(500).json({
            success: false,
            message: error?.message || 'Lỗi khi reset dữ liệu'
        })
    }
}
