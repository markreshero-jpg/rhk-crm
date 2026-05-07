'use client'

import { useEffect, useRef } from 'react'

type AddressResult = {
  address_line_1: string
  suburb: string
  postcode: string
}

type Props = {
  value: string
  onChange: (value: string) => void
  onAddressSelect: (result: AddressResult) => void
  className?: string
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.maps?.places) { resolve(); return }
    const existing = document.getElementById('google-maps-script')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(script)
  })
}

export default function AddressAutocomplete({ value, onChange, onAddressSelect, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const onAddressSelectRef = useRef(onAddressSelect)
  const onChangeRef = useRef(onChange)
  onAddressSelectRef.current = onAddressSelect
  onChangeRef.current = onChange

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY
    if (!apiKey || !inputRef.current) return

    let listener: google.maps.MapsEventListener | null = null

    loadGoogleMapsScript(apiKey).then(() => {
      if (!inputRef.current) return

      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'au' },
        fields: ['address_components'],
        types: ['address'],
      })

      listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (!place.address_components) return

        let streetNumber = ''
        let route = ''
        let suburb = ''
        let postcode = ''

        for (const component of place.address_components) {
          const types = component.types
          if (types.includes('street_number')) streetNumber = component.long_name
          else if (types.includes('route')) route = component.long_name
          else if (types.includes('locality')) suburb = component.long_name
          else if (types.includes('postal_code')) postcode = component.long_name
        }

        const address_line_1 = [streetNumber, route].filter(Boolean).join(' ')
        onChangeRef.current(address_line_1)
        onAddressSelectRef.current({ address_line_1, suburb, postcode })
      })
    }).catch(console.error)

    return () => {
      if (listener) window.google?.maps?.event?.removeListener(listener)
    }
  }, [])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      autoComplete="off"
      placeholder="Start typing an address…"
    />
  )
}
