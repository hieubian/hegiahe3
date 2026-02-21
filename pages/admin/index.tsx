'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'

export default function AdminLogin() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const validPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'
    if (password === validPassword) {
      localStorage.setItem('admin_token', password)
      router.push('/admin/dashboard')
    } else {
      setError('Sai mật khẩu. Mật khẩu mặc định: admin123')
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-yeezy-sand">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm px-6"
      >
        <h1 className="text-2xl font-medium text-center mb-8 tracking-wider text-yeezy-black">
          ADMIN
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-white/50 border-0 text-yeezy-black placeholder-yeezy-clay focus:outline-none focus:ring-1 focus:ring-yeezy-clay transition-all"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-yeezy-black text-white text-sm font-medium tracking-wider hover:bg-yeezy-clay transition-colors"
          >
            ENTER
          </button>
        </form>

        <p className="text-xs text-yeezy-clay/70 text-center mt-6">
          <a href="/" className="hover:text-yeezy-black">← Back to Gallery</a>
        </p>
      </motion.div>
    </div>
  )
}
