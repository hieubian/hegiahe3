'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Admin Dashboard — now redirects to Locket dashboard
 * since all content comes from Locket only.
 */
export default function AdminDashboard() {
  const router = useRouter()

  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token')
    if (!storedToken) {
      router.push('/admin')
      return
    }
    // Redirect to Locket admin which is the real dashboard now
    router.replace('/admin/locket')
  }, [router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
