'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'

interface LocketAuth {
  email?: string
  phone?: string
  password: string
}

export default function LocketAdmin() {
  const router = useRouter()
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email')
  const [formData, setFormData] = useState<LocketAuth>({
    email: '',
    phone: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token')
    if (!adminToken) { router.push('/admin'); return }
    const locketToken = localStorage.getItem('locket_token')
    if (locketToken) { router.push('/admin/locket/dashboard') }
  }, [router])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/locket/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginMethod, ...formData }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Store all Locket credentials for authenticated API calls
        localStorage.setItem('locket_token', result.token)
        if (result.refreshToken) localStorage.setItem('locket_refresh_token', result.refreshToken)
        if (result.localId) localStorage.setItem('locket_local_id', result.localId)
        localStorage.setItem('locket_user', JSON.stringify(result.user))
        router.push('/admin/locket/dashboard')
      } else {
        setError(result.message || 'Đăng nhập thất bại')
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại.')
      console.error('Locket auth error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof LocketAuth, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-yeezy-sand">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md px-6"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium tracking-wider text-yeezy-black mb-2">
            LOCKET
          </h1>
          <p className="text-sm text-yeezy-clay">
            Kết nối tài khoản Locket để đồng bộ ảnh cá nhân
          </p>
        </div>

        {/* Login Method Tabs */}
        <div className="flex mb-6 bg-white/30 p-1 rounded">
          <button
            type="button"
            onClick={() => setLoginMethod('email')}
            className={`flex-1 py-2 text-sm font-medium transition-all ${
              loginMethod === 'email'
                ? 'bg-white text-yeezy-black shadow-sm'
                : 'text-yeezy-clay'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod('phone')}
            className={`flex-1 py-2 text-sm font-medium transition-all ${
              loginMethod === 'phone'
                ? 'bg-white text-yeezy-black shadow-sm'
                : 'text-yeezy-clay'
            }`}
          >
            Điện thoại
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type={loginMethod === 'email' ? 'email' : 'tel'}
              value={loginMethod === 'email' ? formData.email : formData.phone}
              onChange={(e) => handleInputChange(loginMethod, e.target.value)}
              placeholder={loginMethod === 'email' ? 'Địa chỉ email' : 'Số điện thoại'}
              className="w-full px-4 py-3 bg-white/50 border-0 text-yeezy-black placeholder-yeezy-clay focus:outline-none focus:ring-1 focus:ring-yeezy-clay transition-all"
              required
              autoFocus
            />
          </div>

          <div>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Mật khẩu"
              className="w-full px-4 py-3 bg-white/50 border-0 text-yeezy-black placeholder-yeezy-clay focus:outline-none focus:ring-1 focus:ring-yeezy-clay transition-all"
              required
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 bg-red-100 border-l-4 border-red-500"
            >
              <p className="text-xs text-red-700">{error}</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 text-sm font-medium tracking-wider transition-all ${
              loading
                ? 'bg-yeezy-clay/50 text-yeezy-sand cursor-not-allowed'
                : 'bg-yeezy-black text-yeezy-sand hover:bg-yeezy-clay'
            }`}
          >
            {loading ? 'ĐANG KẾT NỐI...' : 'KẾT NỐI LOCKET'}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="text-xs text-yeezy-clay hover:text-yeezy-black transition-colors"
          >
            ← Quay lại Admin
          </button>
        </div>

        <div className="mt-8 p-4 bg-white/30 rounded">
          <p className="text-xs text-yeezy-clay text-center">
            Đăng nhập tài khoản Locket để lấy ảnh cá nhân của bạn và hiển thị trong gallery.
          </p>
        </div>
      </motion.div>
    </div>
  )
}