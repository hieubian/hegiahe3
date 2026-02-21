/**
 * Locket Moments API — Fetch personal photos from Locket
 * 
 * Strategy for HIGH-QUALITY images:
 * 1. Call getMomentV2 via api.locket-dio.com (returns thumbnailUrl + possibly more)
 * 2. Also call getLatestMomentV2 via Locket's Firebase callable (returns full Firestore data with image_url)
 * 3. Merge results: use image_url (full-res) for display, thumbnailUrl for grid thumbnails
 *
 * API format reference: Client-Locket-Dio-main/src/services/LocketDioServices/ActionMoments.js
 */
import type { NextApiRequest, NextApiResponse } from 'next'

const LOCKET_API_URL = process.env.LOCKET_API_URL || 'https://api.locket-dio.com'
const LOCKET_API_KEY = process.env.LOCKET_API_KEY || 'LKD-LOCKETDIO-AB02F55KYM55DD02MM03YY25-LKD'
const LOCKET_FIREBASE_URL = 'https://api.locketcamera.com'

// Shared headers for server-side requests to Locket Dio
const LOCKET_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'x-api-key': LOCKET_API_KEY,
  'x-app-author': 'dio',
  'x-app-name': 'locketdio',
  'x-app-client': 'Beta2.5.5.2.4',
  'x-app-api': 'v2.2.1',
  'x-app-env': 'production',
  'Origin': 'https://locket-dio.com',
  'Referer': 'https://locket-dio.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
}

// Firebase callable headers (same as Locket iOS app)
const FIREBASE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Accept-Language': 'en-US',
  'X-Ios-Bundle-Identifier': 'com.locket.Locket',
  'X-Client-Version': 'iOS/FirebaseSDK/10.23.1/FirebaseCore-iOS',
  'X-Firebase-GMPID': '1:641029076083:ios:cc8eb46290d69b234fa606',
}

/**
 * Moment interface — enriched with both full-res and thumbnail URLs
 */
interface LocketMoment {
  id: string
  user: string
  imageUrl: string       // Full-resolution image (prefer this for display)
  thumbnailUrl: string   // Compressed thumbnail (for grid/loading)
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
 * Fetch moments via Locket Dio API (getMomentV2)
 * Returns moments with thumbnailUrl
 */
async function fetchViaDioApi(
  idToken: string,
  localId: string,
  options: { timestamp?: number | null; limit?: number } = {}
): Promise<any[]> {
  const { timestamp = null, limit = 60 } = options

  const res = await fetch(`${LOCKET_API_URL}/locket/getMomentV2`, {
    method: 'POST',
    headers: {
      ...LOCKET_HEADERS,
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({ timestamp, friendId: localId, limit }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || err?.message || `Failed to fetch moments (${res.status})`)
  }

  const result = await res.json()
  return result?.data || []
}

/**
 * Fetch moments directly from Locket Firebase callable (getLatestMomentV2)
 * This returns Firestore data which includes image_url (full-res) separately
 */
async function fetchViaFirebase(idToken: string): Promise<Record<string, any>> {
  try {
    const res = await fetch(`${LOCKET_FIREBASE_URL}/getLatestMomentV2`, {
      method: 'POST',
      headers: {
        ...FIREBASE_HEADERS,
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        data: {
          excluded_users: [],
          fetch_streak: false,
          should_count_missed_moments: false,
        },
      }),
    })

    if (!res.ok) return {}

    const result = await res.json()
    const data = result?.result?.data || result?.result || result?.data

    // Build a map of momentId → { image_url, thumbnail_url, video_url, ... }
    const momentMap: Record<string, any> = {}

    if (data && typeof data === 'object') {
      // getLatestMomentV2 may return different structures
      // Could be: { moments: [...] } or { data: [...] } or array directly
      const moments = Array.isArray(data) ? data 
        : (data.moments || data.data || Object.values(data))

      if (Array.isArray(moments)) {
        for (const m of moments) {
          const id = m?.canonical_uid || m?.id || m?.moment_uid
          if (id) {
            momentMap[id] = {
              image_url: m.image_url || m.photo_url || m.imageUrl || m.photoUrl || null,
              thumbnail_url: m.thumbnail_url || m.thumbnailUrl || null,
              video_url: m.video_url || m.videoUrl || null,
            }
          }
        }
      }
    }

    return momentMap
  } catch (err) {
    console.log('Firebase callable fallback failed (non-critical):', (err as any)?.message)
    return {}
  }
}

/**
 * Merge Dio API response with Firebase callable data 
 * Prioritize: Firebase image_url (full-res) > Dio imageUrl > Dio thumbnailUrl
 */
function mergeMoments(dioMoments: any[], firebaseMap: Record<string, any>, localId: string): LocketMoment[] {
  return dioMoments.map((m: any) => {
    const id = m.id || ''
    const fb = firebaseMap[id] || {}

    // All possible image URL fields from both sources
    const thumbnailUrl = m.thumbnailUrl || m.thumbnail_url || fb.thumbnail_url || ''
    const fullResUrl = m.imageUrl || m.image_url || m.photo_url || fb.image_url || ''
    const videoUrl = m.videoUrl || m.video_url || fb.video_url || null

    return {
      id,
      user: m.user || localId,
      imageUrl: fullResUrl || thumbnailUrl,    // Best quality available
      thumbnailUrl: thumbnailUrl || fullResUrl, // Thumbnail fallback
      videoUrl,
      caption: m.caption || null,
      overlays: m.overlays || null,
      createTime: m.createTime || 0,
      date: m.date || '',
    }
  })
}

/**
 * Main fetch: combines both API sources for best quality images
 */
async function fetchLocketMoments(
  idToken: string,
  localId: string,
  options: { timestamp?: number | null; limit?: number } = {}
): Promise<LocketMoment[]> {
  // Fetch from both sources in parallel
  const [dioMoments, firebaseMap] = await Promise.all([
    fetchViaDioApi(idToken, localId, options),
    fetchViaFirebase(idToken),
  ])

  return mergeMoments(dioMoments, firebaseMap, localId)
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

    const timestampStr = req.query.timestamp as string
    const timestamp = timestampStr ? parseInt(timestampStr) || null : null
    const limit = parseInt(req.query.limit as string) || 60

    const moments = await fetchLocketMoments(idToken, localId, { timestamp, limit })

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