/**
 * Locket Moments API — Fetch personal photos directly from Locket
 * 
 * Uses ONLY the official Locket Firebase callable API (api.locketcamera.com).
 * No third-party proxy (Locket Dio removed).
 * 
 * Reference: locket-main/api.py → getLastMoment()
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const LOCKET_API_URL = process.env.LOCKET_CAMERA_API_URL || 'https://api.locketcamera.com'

// Firebase callable headers — matches Locket iOS app exactly
const LOCKET_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Accept': '*/*',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Connection': 'keep-alive',
  'X-Client-Version': 'iOS/FirebaseSDK/10.23.1/FirebaseCore-iOS',
  'X-Firebase-GMPID': '1:641029076083:ios:cc8eb46290d69b234fa606',
  'X-Ios-Bundle-Identifier': 'com.locket.Locket',
  'User-Agent': 'Locket/1 CFNetwork/1474 Darwin/23.0.0',
}

/**
 * Moment interface
 */
interface LocketMoment {
  id: string
  user: string
  imageUrl: string
  thumbnailUrl: string
  videoUrl: string | null
  caption: string | null
  overlays: any | null
  createTime: number
  date: string
}

interface MomentsResponse {
  success: boolean
  data?: LocketMoment[]
  total?: number
  message?: string
}

/**
 * Fetch moments directly from Locket's Firebase callable API (getLatestMomentV2)
 * This is the official endpoint — same as Locket iOS app uses.
 */
async function fetchLocketMoments(
  idToken: string,
  _localId: string,
): Promise<LocketMoment[]> {
  const res = await fetch(`${LOCKET_API_URL}/getLatestMomentV2`, {
    method: 'POST',
    headers: {
      ...LOCKET_HEADERS,
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      data: {
        excluded_users: [],
        fetch_streak: false,
        should_count_missed_moments: true,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || err?.message || `Locket API error (${res.status})`)
  }

  const result = await res.json()

  // getLatestMomentV2 returns different structures — handle all:
  // { result: { data: {...moments} } } or { result: {...moments} }
  const data = result?.result?.data || result?.result || result?.data

  if (!data || typeof data !== 'object') {
    return []
  }

  // Data could be: array, or object keyed by moment ID
  const momentEntries: any[] = Array.isArray(data)
    ? data
    : Object.values(data).filter((v: any) => v && typeof v === 'object' && (v.canonical_uid || v.id || v.moment_uid))

  return momentEntries
    .map((m: any) => {
      const id = m.canonical_uid || m.id || m.moment_uid || ''
      if (!id) return null

      const thumbnailUrl = m.thumbnail_url || m.thumbnailUrl || ''
      const fullResUrl = m.image_url || m.photo_url || m.imageUrl || m.photoUrl || ''
      const videoUrl = m.video_url || m.videoUrl || null
      const caption = m.caption || null
      const overlays = m.overlays || null

      // Parse creation time — could be timestamp (seconds), ISO string, or Firestore Timestamp
      let createTime = 0
      if (m.created_at) {
        if (typeof m.created_at === 'number') {
          createTime = m.created_at
        } else if (typeof m.created_at === 'object' && m.created_at._seconds) {
          createTime = m.created_at._seconds
        } else if (typeof m.created_at === 'string') {
          createTime = Math.floor(new Date(m.created_at).getTime() / 1000)
        }
      } else if (m.createTime) {
        createTime = typeof m.createTime === 'number' ? m.createTime : 0
      } else if (m.date) {
        createTime = Math.floor(new Date(m.date).getTime() / 1000)
      }

      // Format date string
      const dateStr = createTime
        ? new Date(createTime * 1000).toISOString()
        : ''

      return {
        id,
        user: m.user || m.sender_uid || _localId,
        imageUrl: fullResUrl || thumbnailUrl,
        thumbnailUrl: thumbnailUrl || fullResUrl,
        videoUrl,
        caption,
        overlays,
        createTime,
        date: dateStr,
      }
    })
    .filter((m): m is LocketMoment => m !== null && !!(m.imageUrl || m.thumbnailUrl))
    .sort((a, b) => b.createTime - a.createTime)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MomentsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const idToken = req.headers['x-locket-token'] as string
    const localId = req.headers['x-locket-uid'] as string

    if (!idToken || !localId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập Locket. Vui lòng kết nối tài khoản.'
      })
    }

    const moments = await fetchLocketMoments(idToken, localId)

    return res.status(200).json({
      success: true,
      data: moments,
      total: moments.length,
    })

  } catch (error: any) {
    console.error('Moments API error:', error?.message || error)

    if (error?.message?.includes('401') || error?.message?.toLowerCase?.()?.includes('token')) {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập Locket đã hết hạn. Vui lòng đăng nhập lại.'
      })
    }

    return res.status(500).json({
      success: false,
      message: error?.message || 'Không thể tải ảnh từ Locket'
    })
  }
}