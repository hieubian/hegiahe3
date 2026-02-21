import fs from 'fs'
import path from 'path'

/**
 * ImageData — unified format for hegiahe2 gallery
 * Source: Locket moments synced via /api/locket/sync
 */
export type ImageData = {
  id: string
  slug: string
  image_url: string          // Full-resolution image URL
  thumbnail_url?: string     // Compressed thumbnail URL (for grid loading)
  video_url?: string
  title: string
  description?: string
  caption?: string
  width: number
  height: number
  created_at: string
  order_index: number
  source?: string
  overlays?: {
    background?: { colors?: string[] }
    textColor?: string
    icon?: { type?: string; data?: string }
  } | null
}

/**
 * Get all images from database (Locket-synced only)
 */
export function getAllImages(): ImageData[] {
  const dbPath = path.join(process.cwd(), 'database', 'images.json')

  try {
    if (fs.existsSync(dbPath)) {
      const dbData = fs.readFileSync(dbPath, 'utf8')
      const db = JSON.parse(dbData)
      const images = Array.isArray(db) ? db : (db.images || [])

      return images
        .map((img: any) => ({
          id: String(img.id || img.slug || ''),
          slug: img.slug || '',
          image_url: img.image_url || img.thumbnailUrl || '',
          thumbnail_url: img.thumbnail_url || img.thumbnailUrl || img.image_url || '',
          video_url: img.video_url || img.videoUrl || undefined,
          title: img.title || img.caption || '',
          description: img.description || '',
          caption: img.caption || img.title || '',
          width: img.width || 800,
          height: img.height || 800,
          created_at: img.created_at || new Date().toISOString(),
          order_index: img.order_index || 0,
          source: img.source || 'locket',
          overlays: img.overlays || null,
        }))
        .filter((img: ImageData) => img.image_url) // Must have valid URL
        .sort((a: ImageData, b: ImageData) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
    }
  } catch (error) {
    console.log('Error reading database:', error)
  }

  return []
}

export function getImageBySlug(slug: string): ImageData | null {
  const images = getAllImages()
  return images.find(img => img.slug === slug) || null
}
