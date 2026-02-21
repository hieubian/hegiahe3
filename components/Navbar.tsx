'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'

/**
 * Navbar — yeezy.com extreme minimalism
 * Just the brand name, nothing else. Fades on scroll.
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogoClick = (e: React.MouseEvent) => {
    if (router.pathname === '/') {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <nav
      className={`
        fixed top-0 left-0 right-0 z-40
        transition-all duration-200 ease-out
        ${scrolled
          ? 'bg-white/90 backdrop-blur-xl'
          : 'bg-transparent'
        }
      `}
    >
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-12 sm:h-14 flex items-center justify-center">
        <Link href="/" onClick={handleLogoClick} className="flex items-center gap-1.5 cursor-pointer">
          <Image
            src="/logohegia.png"
            alt="hegiahe"
            width={120}
            height={40}
            quality={100}
            priority
            className="h-7 sm:h-8 w-auto select-none translate-y-[-1px]"
            draggable={false}
            style={{ imageRendering: 'auto' }}
          />
          <span className="text-[10px] sm:text-[11px] tracking-[0.4em] text-black font-medium select-none uppercase leading-none pl-0.5">
            hegiahe
          </span>
        </Link>
      </div>
    </nav>
  )
}
