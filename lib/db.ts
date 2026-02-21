import fs from 'fs'
import path from 'path'

const DB_FILE = path.join(process.cwd(), 'database', 'images.json')

interface Database {
  images: ImageData[]
  nextId: number
}

function initDB(): Database {
  const dbDir = path.dirname(DB_FILE)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData: Database = { images: [], nextId: 1 }
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2))
    return initialData
  }

  const data = fs.readFileSync(DB_FILE, 'utf-8')
  return JSON.parse(data)
}

function saveDB(db: Database): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

export interface ImageData {
  id: number
  slug: string
  title: string
  description?: string
  image_url: string
  thumbnail_url?: string
  width: number
  height: number
  file_size?: number
  order_index: number
  created_at: string
  updated_at: string
}

export function getAllImages(): ImageData[] {
  const db = initDB()
  return db.images.sort((a, b) => b.order_index - a.order_index || b.id - a.id)
}

export function getImageBySlug(slug: string): ImageData | null {
  const db = initDB()
  return db.images.find(img => img.slug === slug) || null
}

export function getImageById(id: number): ImageData | null {
  const db = initDB()
  return db.images.find(img => img.id === id) || null
}

export function createImage(data: Omit<ImageData, 'id' | 'created_at' | 'updated_at'>): ImageData {
  const db = initDB()
  
  const now = new Date().toISOString()
  const newImage: ImageData = {
    ...data,
    id: db.nextId++,
    created_at: now,
    updated_at: now,
  }

  db.images.push(newImage)
  saveDB(db)

  return newImage
}

export function updateImage(id: number, data: Partial<ImageData>): ImageData | null {
  const db = initDB()
  
  const index = db.images.findIndex(img => img.id === id)
  if (index === -1) return null

  db.images[index] = {
    ...db.images[index],
    ...data,
    id, // Prevent ID change
    updated_at: new Date().toISOString(),
  }

  saveDB(db)
  return db.images[index]
}

export function deleteImage(id: number): boolean {
  const db = initDB()
  
  const index = db.images.findIndex(img => img.id === id)
  if (index === -1) return false

  db.images.splice(index, 1)
  saveDB(db)

  return true
}
