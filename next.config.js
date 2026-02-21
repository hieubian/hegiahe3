/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    domains: [
      'localhost',
      'images.unsplash.com',
      'picsum.photos',
      // Locket image domains
      'firebasestorage.googleapis.com',
      'storage.googleapis.com',
      'cdn.locket-dio.com',
      'lh3.googleusercontent.com',
    ],
    remotePatterns: [
      { protocol: 'https', hostname: '**.locket-dio.com' },
      { protocol: 'https', hostname: '**.googleapis.com' },
      { protocol: 'https', hostname: '**.locketcamera.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.firebaseapp.com' },
    ],
    unoptimized: true,
  },
}

module.exports = nextConfig
