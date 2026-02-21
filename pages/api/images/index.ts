import type { NextApiRequest, NextApiResponse } from 'next'
import { getAllImages, getImageBySlug } from '@/lib/db'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { slug } = req.query

    if (slug && typeof slug === 'string') {
      const image = getImageBySlug(slug)
      
      if (!image) {
        return res.status(404).json({ error: 'Image not found' })
      }
      
      return res.status(200).json(image)
    }

    const images = getAllImages()
    return res.status(200).json(images)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
