'use client'

import { useRouter } from 'next/router'
import { useEffect } from 'react'

export function useEscapeKey(callback: () => void) {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [callback])
}

export function useBackNavigation(callback: () => void) {
  const router = useRouter()

  useEffect(() => {
    const handlePopState = () => {
      callback()
    }

    router.beforePopState(() => {
      callback()
      return false
    })

    return () => {
      router.beforePopState(() => true)
    }
  }, [router, callback])
}
