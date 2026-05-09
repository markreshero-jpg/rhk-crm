'use client'
import { useEffect } from 'react'

export default function NumberInputInit() {
  useEffect(() => {
    function handleFocus(e: FocusEvent) {
      const el = e.target as HTMLElement
      if (el instanceof HTMLInputElement && el.type === 'number') {
        el.select()
      }
    }
    document.addEventListener('focusin', handleFocus)
    return () => document.removeEventListener('focusin', handleFocus)
  }, [])
  return null
}
