import type { NextApiRequest, NextApiResponse} from 'next'
import { IncomingForm, File } from 'formidable'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { createImage, updateImage, deleteImage, getImageById } from '@/lib/db'

export const config = {
  api: {
    bodyParser: false,
  },
}

function generateSlug(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check admin authentication
  const authHeader = req.headers.authorization
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  
  if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'POST') {
    // Upload image
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    })

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: 'Upload failed' })
      }

      const file = Array.isArray(files.image) ? files.image[0] : files.image
      
      if (!file) {
        return res.status(400).json({ error: 'No image provided' })
      }

      try {
        const originalPath = file.filepath
        const filename = `${Date.now()}-${file.originalFilename}`
        const finalPath = path.join(uploadDir, filename)
        
        // Move file
        fs.renameSync(originalPath, finalPath)

        // Get image metadata
        const metadata = await sharp(finalPath).metadata()
        
        // Create thumbnail
        const thumbFilename = `thumb-${filename}`
        const thumbPath = path.join(uploadDir, thumbFilename)
        
        await sharp(finalPath)
          .resize(400, 400, { fit: 'cover' })
          .toFile(thumbPath)

        // Get file size
        const stats = fs.statSync(finalPath)

        const title = (Array.isArray(fields.title) ? fields.title[0] : fields.title) || 
                     file.originalFilename?.replace(/\.[^/.]+$/, '') || 'Untitled'
        
        const description = Array.isArray(fields.description) ? fields.description[0] : fields.description
        
        const slug = generateSlug(file.originalFilename || filename)

        const imageData = {
          slug,
          title,
          description: description || null,
          image_url: `/uploads/${filename}`,
          thumbnail_url: `/uploads/${thumbFilename}`,
          width: metadata.width || 0,
          height: metadata.height || 0,
          file_size: stats.size,
          order_index: 0,
        }

        const newImage = createImage(imageData)
        
        return res.status(201).json(newImage)
      } catch (error) {
        console.error('Upload error:', error)
        return res.status(500).json({ error: 'Failed to process image' })
      }
    })
  } else if (req.method === 'PUT') {
    // Update image
    const { id, title, description, order_index } = req.body

    if (!id) {
      return res.status(400).json({ error: 'Image ID required' })
    }

    const updated = updateImage(id, {
      title,
      description,
      order_index,
    })

    if (!updated) {
      return res.status(404).json({ error: 'Image not found' })
    }

    return res.status(200).json(updated)
  } else if (req.method === 'DELETE') {
    // Delete image
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Image ID required' })
    }

    const image = getImageById(parseInt(id))
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' })
    }

    // Delete files
    try {
      const imagePath = path.join(process.cwd(), 'public', image.image_url)
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath)
      }

      if (image.thumbnail_url) {
        const thumbPath = path.join(process.cwd(), 'public', image.thumbnail_url)
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath)
        }
      }
    } catch (error) {
      console.error('File deletion error:', error)
    }

    const deleted = deleteImage(parseInt(id))

    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete image' })
    }

    return res.status(200).json({ message: 'Image deleted successfully' })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
