'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const IDLE_MS = 30 * 60 * 1000 // 30 minutes

export default function IdleTimeout() {
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function reset() {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
      }, IDLE_MS)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      if (timer.current) clearTimeout(timer.current)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [router])

  return null
}
