'use client'

import { useEffect, useState } from 'react'
import { Timer, MapPin, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { Staff, getStaffByUserId } from '@/lib/staff'
import { ClockEvent, GeoCoords, clockIn, clockOut, getLatestClockEvent } from '@/lib/staffClock'

type GeoStatus = 'idle' | 'getting' | 'got' | 'denied' | 'error'

export default function ClockPage() {
  const [staff, setStaff] = useState<Staff | null>(null)
  const [latest, setLatest] = useState<ClockEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [coords, setCoords] = useState<GeoCoords | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const s = await getStaffByUserId(session.user.id)
      setStaff(s)
      if (s) setLatest(await getLatestClockEvent(s.id))
      setLoading(false)
    }
    init()
  }, [])

  function captureGPS(): Promise<GeoCoords | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return }
      setGeoStatus('getting')
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c: GeoCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }
          setCoords(c)
          setGeoStatus('got')
          resolve(c)
        },
        () => { setGeoStatus('denied'); resolve(null) },
        { timeout: 10000, enableHighAccuracy: true },
      )
    })
  }

  async function handleClock() {
    if (!staff) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const gps = await captureGPS()
      const isClockedIn = latest?.type === 'in'
      if (isClockedIn) {
        await clockOut(staff.id, gps ?? undefined)
        setMessage('Clocked out successfully.')
      } else {
        await clockIn(staff.id, gps ?? undefined)
        setMessage('Clocked in successfully.')
      }
      setLatest(await getLatestClockEvent(staff.id))
    } catch (err) {
      setError((err as Error).message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-text-subtle text-sm">Loading…</p>
      </div>
    )
  }

  if (!staff) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm px-6">
          <AlertCircle size={32} className="mx-auto text-text-faint mb-3" />
          <p className="text-text text-sm font-medium mb-1">No staff profile linked</p>
          <p className="text-text-subtle text-xs">
            Your login isn&apos;t linked to a staff member. Ask an admin to set this up in Settings → Staff.
          </p>
        </div>
      </div>
    )
  }

  const isClockedIn = latest?.type === 'in'
  const lastTime = latest ? new Date(latest.created_at) : null

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center select-none">
      {/* Avatar */}
      <div
        className="w-16 h-16 rounded-full border-4 border-black/10 mb-4 shrink-0"
        style={{ backgroundColor: staff.colour || '#94a3b8' }}
      />
      <h1 className="text-2xl font-semibold text-text">{staff.display_name}</h1>
      <p className="text-text-muted text-sm mt-1">{staff.role || 'Staff'}</p>

      {/* Status badge */}
      <div className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${
        isClockedIn
          ? 'bg-success-bg text-success border-success-border'
          : 'bg-surface-muted text-text-muted border-border'
      }`}>
        <Timer size={14} />
        {isClockedIn ? 'Clocked In' : 'Clocked Out'}
      </div>

      {lastTime && (
        <p className="text-text-faint text-xs mt-2">
          {isClockedIn ? 'Since' : 'Last clocked out'}{' '}
          {lastTime.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
          {' on '}
          {lastTime.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
        </p>
      )}

      {/* GPS indicator */}
      <div className="mt-4 flex items-center gap-1.5 text-xs text-text-faint">
        <MapPin size={12} />
        {geoStatus === 'idle'    && 'GPS will be captured when you clock'}
        {geoStatus === 'getting' && 'Getting your location…'}
        {geoStatus === 'got'     && `Location captured (±${Math.round(coords!.accuracy)}m)`}
        {geoStatus === 'denied'  && 'Location unavailable — clocking without GPS'}
        {geoStatus === 'error'   && 'Location error — clocking without GPS'}
      </div>

      {/* Clock button */}
      <button
        onClick={handleClock}
        disabled={busy}
        className={`mt-10 w-44 h-44 rounded-full text-xl font-bold shadow-xl transition-all active:scale-95 disabled:opacity-50 ${
          isClockedIn
            ? 'bg-danger text-white hover:opacity-90'
            : 'bg-success text-white hover:opacity-90'
        }`}
      >
        {busy ? '…' : isClockedIn ? 'Clock Out' : 'Clock In'}
      </button>

      {message && <p className="mt-8 text-success text-sm font-medium">{message}</p>}
      {error   && <p className="mt-8 text-danger text-sm">{error}</p>}
    </div>
  )
}
