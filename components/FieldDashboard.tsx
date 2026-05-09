'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Timer, Play, Square, CheckCircle, MapPin } from 'lucide-react'
import { FieldScheduleEvent, getMyScheduleEvents, updateScheduleEvent, ScheduleEventStatus } from '@/lib/jobSchedule'
import { ClockEvent, GeoCoords, clockIn, clockOut, getLatestClockEvent } from '@/lib/staffClock'
import { JobTimeEntry, getActiveTimeEntry, startTimeEntry, stopTimeEntry } from '@/lib/jobTimeEntries'
import { Staff } from '@/lib/staff'

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const today = todayIso()
  if (iso === today) return 'Today'
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  if (iso === tomorrow.toISOString().slice(0, 10)) return 'Tomorrow'
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })
}

function elapsedLabel(startedAt: string) {
  const ms = Date.now() - new Date(startedAt).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FieldDashboard({ staff }: { staff: Staff }) {
  const [events, setEvents] = useState<FieldScheduleEvent[]>([])
  const [clockEvent, setClockEvent] = useState<ClockEvent | null>(null)
  const [activeEntry, setActiveEntry] = useState<JobTimeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [elapsed, setElapsed] = useState('')
  const [siteClockBusy, setSiteClockBusy] = useState(false)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'getting' | 'got' | 'denied'>('idle')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    const [evts, ce, ae] = await Promise.all([
      getMyScheduleEvents(staff.id),
      getLatestClockEvent(staff.id),
      getActiveTimeEntry(staff.id),
    ])
    setEvents(evts)
    setClockEvent(ce)
    setActiveEntry(ae)
    setLoading(false)
  }, [staff.id])

  useEffect(() => { load() }, [load])

  // Tick elapsed timer when there's an active entry
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!activeEntry) { setElapsed(''); return }
    setElapsed(elapsedLabel(activeEntry.started_at))
    intervalRef.current = setInterval(() => {
      setElapsed(elapsedLabel(activeEntry.started_at))
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [activeEntry])

  async function captureGPS(): Promise<GeoCoords | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return }
      setGeoStatus('getting')
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoStatus('got')
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
        },
        () => { setGeoStatus('denied'); resolve(null) },
        { timeout: 8000, enableHighAccuracy: true },
      )
    })
  }

  async function handleSiteClock() {
    setSiteClockBusy(true)
    try {
      const gps = await captureGPS()
      if (clockEvent?.type === 'in') {
        await clockOut(staff.id, gps ?? undefined)
      } else {
        await clockIn(staff.id, gps ?? undefined)
      }
      setClockEvent(await getLatestClockEvent(staff.id))
    } finally {
      setSiteClockBusy(false)
    }
  }

  async function handleJobClock(event: FieldScheduleEvent) {
    if (activeEntry?.job_schedule_event_id === event.id) {
      await stopTimeEntry(activeEntry.id)
      setActiveEntry(null)
      await load()
    } else {
      // Auto-stop any other running entry first
      if (activeEntry) await stopTimeEntry(activeEntry.id)
      const entry = await startTimeEntry(staff.id, event.id)
      // Auto-set status to In Progress
      if (event.status === 'Scheduled' || event.status === 'Unscheduled') {
        await updateScheduleEvent(event.id, { status: 'In Progress' })
      }
      setActiveEntry(entry)
      await load()
    }
  }

  async function handleMarkDone(event: FieldScheduleEvent) {
    if (activeEntry?.job_schedule_event_id === event.id) {
      await stopTimeEntry(activeEntry.id)
      setActiveEntry(null)
    }
    await updateScheduleEvent(event.id, { status: 'Completed' })
    await load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-text-subtle text-sm">Loading…</p>
      </div>
    )
  }

  const isClockedIn = clockEvent?.type === 'in'
  const today = todayIso()

  // Group events by date
  const byDate = new Map<string, FieldScheduleEvent[]>()
  for (const e of events) {
    const d = e.scheduled_date ?? '__unscheduled__'
    if (!byDate.has(d)) byDate.set(d, [])
    byDate.get(d)!.push(e)
  }
  const sortedDates = [...byDate.keys()].sort()

  return (
    <div className="min-h-screen bg-app-bg pb-10">
      {/* Top bar */}
      <div className="bg-accent text-accent-text px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 shrink-0"
            style={{ backgroundColor: staff.colour || '#94a3b8' }} />
          <div>
            <p className="text-sm font-semibold leading-tight">{staff.display_name}</p>
            <p className="text-[11px] text-accent-text-muted leading-tight">{staff.role || 'Field Staff'}</p>
          </div>
        </div>

        {/* Site clock-in pill */}
        <button
          onClick={handleSiteClock}
          disabled={siteClockBusy}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-50 ${
            isClockedIn
              ? 'bg-success text-white border-transparent'
              : 'bg-accent-hover text-accent-text border-white/20'
          }`}
        >
          <Timer size={13} />
          {siteClockBusy
            ? (geoStatus === 'getting' ? 'Getting GPS…' : '…')
            : isClockedIn
              ? `On site · ${fmtTime(clockEvent!.created_at)}`
              : 'Clock In'}
        </button>
      </div>

      {/* Active job banner */}
      {activeEntry && (
        <div className="bg-warning-bg border-b border-warning-border px-5 py-2.5 flex items-center gap-2">
          <Play size={12} className="text-warning shrink-0" />
          <p className="text-xs text-warning font-medium flex-1 truncate">
            Timer running · {elapsed}
          </p>
        </div>
      )}

      {/* Tasks */}
      <div className="px-4 pt-5 space-y-6 max-w-xl mx-auto">
        {events.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle size={32} className="mx-auto text-text-faint mb-3" />
            <p className="text-text-subtle text-sm">No tasks scheduled for the next 7 days.</p>
          </div>
        ) : (
          sortedDates.map((date) => (
            <section key={date}>
              <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-2 px-1">
                {date === '__unscheduled__' ? 'Unscheduled' : fmtDate(date)}
              </p>
              <div className="space-y-2">
                {byDate.get(date)!.map((evt) => (
                  <TaskCard
                    key={evt.id}
                    event={evt}
                    activeEntry={activeEntry}
                    elapsed={elapsed}
                    isToday={date === today}
                    onJobClock={handleJobClock}
                    onMarkDone={handleMarkDone}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}

// ── Task Card ─────────────────────────────────────────────────────────────────

const statusStyles: Record<ScheduleEventStatus, string> = {
  'Unscheduled': 'bg-surface-muted text-text-muted border-border',
  'Scheduled':   'bg-info-bg text-info border-info-border',
  'In Progress': 'bg-warning-bg text-warning border-warning-border',
  'Completed':   'bg-success-bg text-success border-success-border',
  'Cancelled':   'bg-surface-muted text-text-faint border-border',
}

function TaskCard({
  event,
  activeEntry,
  elapsed,
  isToday,
  onJobClock,
  onMarkDone,
}: {
  event: FieldScheduleEvent
  activeEntry: JobTimeEntry | null
  elapsed: string
  isToday: boolean
  onJobClock: (e: FieldScheduleEvent) => Promise<void>
  onMarkDone: (e: FieldScheduleEvent) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const isRunning = activeEntry?.job_schedule_event_id === event.id
  const otherRunning = !!activeEntry && !isRunning
  const isDone = event.status === 'Completed' || event.status === 'Cancelled'

  async function wrap(fn: () => Promise<void>) {
    setBusy(true)
    try { await fn() } finally { setBusy(false) }
  }

  return (
    <div className={`rounded-xl border bg-surface p-4 space-y-3 transition-all ${
      isRunning ? 'border-warning shadow-sm' : 'border-border'
    } ${isDone ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            {event.trade_type && (
              <span className="text-[10px] font-medium text-text-subtle bg-surface-muted border border-border px-1.5 py-0.5 rounded">
                {event.trade_type}
              </span>
            )}
            {event.job?.job_number && (
              <span className="text-[10px] font-mono text-text-faint">{event.job.job_number}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-text leading-snug">{event.title || 'Untitled task'}</p>
          {event.job && (
            <p className="text-xs text-text-muted mt-0.5 truncate">
              {event.job.title}
              {event.job.client?.name && <span className="text-text-faint"> · {event.job.client.name}</span>}
            </p>
          )}
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap shrink-0 ${statusStyles[event.status]}`}>
          {event.status}
        </span>
      </div>

      {/* Hours + running timer */}
      <div className="flex items-center gap-4 text-xs text-text-muted">
        {event.estimated_hours != null && (
          <span>Est. {event.estimated_hours}h</span>
        )}
        {event.actual_hours != null && event.actual_hours > 0 && (
          <span className="text-text-subtle">Actual {event.actual_hours}h</span>
        )}
        {isRunning && (
          <span className="text-warning font-semibold tabular-nums">{elapsed}</span>
        )}
      </div>

      {/* Buttons */}
      {!isDone && (
        <div className="flex items-center gap-2 pt-1">
          {/* Job clock button */}
          <button
            onClick={() => wrap(() => onJobClock(event))}
            disabled={busy || (otherRunning && !isRunning)}
            title={otherRunning ? 'Stop the current task first' : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${
              isRunning
                ? 'bg-warning text-white hover:opacity-90'
                : 'bg-accent text-accent-text hover:bg-accent-hover'
            }`}
          >
            {isRunning ? <><Square size={11} /> Stop</> : <><Play size={11} /> Start</>}
          </button>

          {/* Mark done */}
          {(isToday || isRunning) && (
            <button
              onClick={() => wrap(() => onMarkDone(event))}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-success border border-success-border hover:bg-success-bg transition-colors disabled:opacity-40"
            >
              <CheckCircle size={11} /> Done
            </button>
          )}
        </div>
      )}
    </div>
  )
}
