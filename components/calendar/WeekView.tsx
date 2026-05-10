'use client'

import { useState, useRef } from 'react'
import type { CalendarEvent } from '@/lib/calendar'
import { eventColour, addDays, toISO, fmtTime } from '@/lib/calendar'

const HOUR_HEIGHT = 56
const TIME_START  = 7
const TIME_END    = 19
const HOURS = Array.from({ length: TIME_END - TIME_START }, (_, i) => TIME_START + i)
const TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function timeToMinutes(t: string | null): number | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

function fmtHour(h: number): string {
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

function minutesToTime(mins: number): string {
  const clamped = Math.max(TIME_START * 60, Math.min((TIME_END - 1) * 60 + 45, mins))
  const rounded = Math.round(clamped / 15) * 15
  const h = Math.floor(rounded / 60)
  const m = rounded % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function WeekView({
  events,
  weekStart,
  onEventClick,
  onEventMove,
}: {
  events: CalendarEvent[]
  weekStart: Date
  onEventClick: (e: CalendarEvent) => void
  onEventMove: (eventId: string, newDate: string, newStaffId?: string | null, newStartTime?: string | null) => void
}) {
  const today = toISO(new Date())
  const days  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const gridRef = useRef<HTMLDivElement>(null)

  const [draggingId, setDraggingId] = useState<string | null>(null)
  // dropTarget: { date, lineY } — lineY is pixels from top of scrollable content
  const [dropTarget, setDropTarget] = useState<{ date: string; lineY: number } | null>(null)

  function getDropInfo(e: React.DragEvent): { timeStr: string; lineY: number } {
    const gridEl = gridRef.current
    if (!gridEl) return { timeStr: '08:00', lineY: 0 }
    const gridRect = gridEl.getBoundingClientRect()
    const relY = e.clientY - gridRect.top + gridEl.scrollTop
    const totalMins = TIME_START * 60 + (relY / HOUR_HEIGHT) * 60
    return { timeStr: minutesToTime(totalMins), lineY: relY }
  }

  // Bucket events per day
  const byDay = new Map<string, { timed: CalendarEvent[]; allDay: CalendarEvent[] }>()
  for (const d of days) byDay.set(toISO(d), { timed: [], allDay: [] })
  for (const e of events) {
    if (!e.scheduled_date) continue
    const bucket = byDay.get(e.scheduled_date)
    if (!bucket) continue
    if (timeToMinutes(e.start_time) !== null) bucket.timed.push(e)
    else bucket.allDay.push(e)
  }

  const hasAllDay = days.some((d) => (byDay.get(toISO(d))?.allDay.length ?? 0) > 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day headers */}
      <div className="flex border-b border-border bg-surface shrink-0">
        <div className="w-14 shrink-0" />
        {days.map((d, i) => {
          const iso = toISO(d)
          const isToday = iso === today
          return (
            <div key={iso} className="flex-1 text-center py-2 border-l border-border">
              <p className="text-[10px] uppercase tracking-widest text-text-faint">{WEEKDAYS[i]}</p>
              <div className={`text-sm font-semibold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full mx-auto ${isToday ? 'bg-accent text-accent-text' : 'text-text-muted'}`}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* All-day strip */}
      {hasAllDay && (
        <div className="flex border-b border-border shrink-0 bg-surface-muted/40">
          <div className="w-14 shrink-0 flex items-center justify-end pr-2 py-1">
            <span className="text-[9px] uppercase text-text-faint">all day</span>
          </div>
          {days.map((d) => {
            const iso = toISO(d)
            const allDay = byDay.get(iso)?.allDay ?? []
            return (
              <div key={iso} className="flex-1 border-l border-border px-1 py-1 min-h-[28px]">
                {allDay.map((e) => {
                  const colour = eventColour(e)
                  return (
                    <div
                      key={e.id}
                      draggable
                      onDragStart={(ev) => {
                        ev.dataTransfer.setData('eventId', e.id)
                        ev.dataTransfer.effectAllowed = 'move'
                        setDraggingId(e.id)
                      }}
                      onDragEnd={() => { setDraggingId(null); setDropTarget(null) }}
                      onClick={() => onEventClick(e)}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate mb-0.5 cursor-grab active:cursor-grabbing transition-opacity hover:opacity-70 ${draggingId === e.id ? 'opacity-30' : ''}`}
                      style={{ backgroundColor: colour + '22', color: colour, borderLeft: `2px solid ${colour}` }}
                    >
                      {e.job_number ? `${e.job_number} · ` : ''}{e.client_name ?? e.title}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={gridRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: TOTAL_HEIGHT }}>
          {/* Hour labels */}
          <div className="w-14 shrink-0 relative select-none">
            {HOURS.map((h, i) => (
              <div key={h} className="absolute right-2 text-[10px] text-text-faint -translate-y-2" style={{ top: i * HOUR_HEIGHT }}>
                {fmtHour(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => {
            const iso = toISO(d)
            const timedEvents = byDay.get(iso)?.timed ?? []
            const isToday = iso === today
            const isDropTarget = dropTarget?.date === iso

            return (
              <div
                key={iso}
                className={`flex-1 border-l border-border relative transition-colors ${isToday ? 'bg-accent/[0.02]' : ''} ${isDropTarget ? 'bg-accent/[0.06]' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  const { lineY } = getDropInfo(e)
                  setDropTarget({ date: iso, lineY })
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const eventId = e.dataTransfer.getData('eventId')
                  if (eventId) {
                    const { timeStr } = getDropInfo(e)
                    onEventMove(eventId, iso, undefined, timeStr)
                  }
                  setDropTarget(null)
                  setDraggingId(null)
                }}
              >
                {/* Hour grid lines */}
                {HOURS.map((_, i) => (
                  <div key={i} className="absolute left-0 right-0 border-t border-border" style={{ top: i * HOUR_HEIGHT }} />
                ))}
                {HOURS.map((_, i) => (
                  <div key={`h-${i}`} className="absolute left-0 right-0 border-t border-border/30" style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                ))}

                {/* Drop time indicator line */}
                {isDropTarget && dropTarget && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                    style={{ top: dropTarget.lineY }}
                  >
                    <div className="w-2 h-2 rounded-full bg-accent -ml-1 shrink-0" />
                    <div className="flex-1 h-0.5 bg-accent" />
                  </div>
                )}

                {/* Events */}
                {timedEvents.map((e) => {
                  const startMins  = timeToMinutes(e.start_time)!
                  const durationMins = (e.estimated_hours ?? 1) * 60
                  const topMins  = startMins - TIME_START * 60
                  const top      = (topMins / 60) * HOUR_HEIGHT
                  const height   = Math.max((durationMins / 60) * HOUR_HEIGHT, 22)
                  const colour   = eventColour(e)

                  return (
                    <div
                      key={e.id}
                      draggable
                      onDragStart={(ev) => {
                        ev.dataTransfer.setData('eventId', e.id)
                        ev.dataTransfer.effectAllowed = 'move'
                        setDraggingId(e.id)
                      }}
                      onDragEnd={() => { setDraggingId(null); setDropTarget(null) }}
                      onClick={() => onEventClick(e)}
                      className={`absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 overflow-hidden cursor-grab active:cursor-grabbing transition-opacity hover:opacity-75 z-10 ${draggingId === e.id ? 'opacity-30' : ''}`}
                      style={{ top, height, backgroundColor: colour + '25', color: colour, borderLeft: `3px solid ${colour}` }}
                    >
                      <div className="text-[11px] font-semibold leading-tight truncate">
                        {e.job_number ?? ''}{e.job_number && e.client_name ? ' · ' : ''}{e.client_name ?? e.title}
                      </div>
                      {height > 32 && (
                        <div className="text-[10px] opacity-75 truncate">
                          {fmtTime(e.start_time)}{e.start_time && e.title ? ` · ${e.title}` : e.title}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
