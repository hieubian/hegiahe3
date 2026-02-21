const fs = require('fs')
const path = require('path')

const DB_FILE = path.join(__dirname, '..', 'database', 'images.json')

const sampleImages = [
  {
    slug: 'yeezy-boost-350',
    title: 'YEEZY BOOST 350',
    description: 'Iconic minimalist sneaker design',
    image_url: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800',
    width: 800,
    height: 1000,
    order_index: 0,
  },
  {
    slug: 'minimal-architecture',
    title: 'MINIMAL SPACE',
    description: 'Clean architectural lines',
    image_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    width: 1200,
    height: 800,
    order_index: 1,
  },
  {
    slug: 'desert-tones',
    title: 'EARTH TONES',
    description: 'Natural color palette',
    image_url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800',
    width: 800,
    height: 1200,
    order_index: 2,
  },
  {
    slug: 'concrete-texture',
    title: 'CONCRETE',
    description: 'Industrial aesthetic',
    image_url: 'https://images.unsplash.com/photo-1604328471151-b52226907017?w=800',
    width: 900,
    height: 900,
    order_index: 3,
  },
]

const dbDir = path.dirname(DB_FILE)

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
  console.log('✓ Created database directory')
}

const now = new Date().toISOString()
const images = sampleImages.map((img, index) => ({
  ...img,
  id: index + 1,
  created_at: now,
  updated_at: now,
}))

const db = {
  images,
  nextId: images.length + 1,
}

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))

console.log(`✅ Seeded ${images.length} sample images`)
