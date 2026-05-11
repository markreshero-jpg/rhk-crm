'use client'

import { useState, useRef } from 'react'
import type { CalendarEvent } from '@/lib/calendar'
import { eventColour, toISO, fmtTime, fmtTradeType } from '@/lib/calendar'

const HOUR_HEIGHT = 64
const TIME_START  = 7
const TIME_END    = 20
const HOURS = Array.from({ length: TIME_END - TIME_START }, (_, i) => TIME_START + i)
const TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT

type OnEventMove = (
  eventId: string,
  newDate: string,
  newStaffId?: string | null,
  newStartTime?: string | null,
) => void

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

// Assign lane columns to overlapping events
function computeLayout(events: CalendarEvent[]): Map<string, { col: number; numCols: number }> {
  const sorted = [...events].sort((a, b) => (timeToMinutes(a.start_time) ?? 0) - (timeToMinutes(b.start_time) ?? 0))
  const lanes: number[] = [] // stores end minute of last event in each lane
  const eventLane = new Map<string, number>()

  for (const ev of sorted) {
    const startMins = timeToMinutes(ev.start_time) ?? 0
    const endMins   = startMins + (ev.estimated_hours ?? 1) * 60
    let lane = lanes.findIndex((end) => end <= startMins)
    if (lane === -1) { lane = lanes.length; lanes.push(endMins) } else { lanes[lane] = endMins }
    eventLane.set(ev.id, lane)
  }

  const result = new Map<string, { col: number; numCols: number }>()
  for (const ev of sorted) {
    const evStart = timeToMinutes(ev.start_time) ?? 0
    const evEnd   = evStart + (ev.estimated_hours ?? 1) * 60
    const col     = eventLane.get(ev.id)!
    let maxCol    = col
    for (const other of sorted) {
      if (other.id === ev.id) continue
      const oStart = timeToMinutes(other.start_time) ?? 0
      const oEnd   = oStart + (other.estimated_hours ?? 1) * 60
      if (oStart < evEnd && oEnd > evStart) maxCol = Math.max(maxCol, eventLane.get(other.id)!)
    }
    result.set(ev.id, { col, numCols: maxCol + 1 })
  }
  return result
}

export default function DayView({
  events,
  date,
  onEventClick,
  onEventMove,
}: {
  events: CalendarEvent[]
  date: Date
  onEventClick: (e: CalendarEvent) => void
  onEventMove: OnEventMove
}) {
  const iso   = toISO(date)
  const today = toISO(new Date())
  const isToday = iso === today

  const gridRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropLineY, setDropLineY]   = useState<number | null>(null)

  const dayEvents = events.filter((e) => e.scheduled_date === iso)
  const timed  = dayEvents.filter((e) => timeToMinutes(e.start_time) !== null)
  const allDay = dayEvents.filter((e) => timeToMinutes(e.start_time) === null)
  const layout = computeLayout(timed)

  function getDropInfo(e: React.DragEvent): { timeStr: string; lineY: number } {
    const gridEl = gridRef.current
    if (!gridEl) return { timeStr: '08:00', lineY: 0 }
    const rect = gridEl.getBoundingClientRect()
    const relY = e.clientY - rect.top + gridEl.scrollTop
    const totalMins = TIME_START * 60 + (relY / HOUR_HEIGHT) * 60
    return { timeStr: minutesToTime(totalMins), lineY: relY }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Day header */}
      <div className="flex border-b border-border bg-surface shrink-0 px-4 py-3 items-center gap-3">
        <div className={`w-10 h-10 flex items-center justify-center rounded-full text-lg font-semibold shrink-0 ${isToday ? 'bg-accent text-accent-text' : 'text-text-muted'}`}>
          {date.getDate()}
        </div>
        <div>
          <p className="text-sm font-semibold text-text leading-tight">
            {date.toLocaleDateString('en-AU', { weekday: 'long' })}
          </p>
          <p className="text-xs text-text-muted">
            {date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {timed.length + allDay.length > 0 && (
          <span className="ml-auto text-xs text-text-faint">
            {timed.length + allDay.length} event{timed.length + allDay.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* All-day events */}
      {allDay.length > 0 && (
        <div className="flex border-b border-border shrink-0 bg-surface-muted/40">
          <div className="w-16 shrink-0 flex items-center justify-end pr-3">
            <span className="text-[9px] uppercase text-text-faint">all day</span>
          </div>
          <div className="flex-1 px-2 py-1.5 flex flex-wrap gap-1">
            {allDay.map((e) => {
              const colour = eventColour(e)
              return (
                <div
                  key={e.id}
                  draggable
                  onDragStart={(ev) => { ev.dataTransfer.setData('eventId', e.id); setDraggingId(e.id) }}
                  onDragEnd={() => setDraggingId(null)}
                  onClick={() => onEventClick(e)}
                  className={`px-2 py-0.5 rounded text-[11px] cursor-grab active:cursor-grabbing transition-opacity hover:opacity-70 ${draggingId === e.id ? 'opacity-30' : ''}`}
                  style={{ backgroundColor: colour + '22', color: colour, borderLeft: `2px solid ${colour}` }}
                >
                  <span className="font-semibold">{e.job_number ?? ''}</span>
                  {e.job_number && e.client_name ? ' · ' : ''}
                  {e.client_name ?? e.title}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Scrollable time grid */}
      <div
        ref={gridRef}
        className="flex-1 overflow-y-auto"
        onDragOver={(e) => { e.preventDefault(); const { lineY } = getDropInfo(e); setDropLineY(lineY) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropLineY(null) }}
        onDrop={(e) => {
          e.preventDefault()
          const eventId = e.dataTransfer.getData('eventId')
          if (eventId) { const { timeStr } = getDropInfo(e); onEventMove(eventId, iso, undefined, timeStr) }
          setDropLineY(null); setDraggingId(null)
        }}
      >
        <div className={`flex relative transition-colors ${isToday ? 'bg-accent/[0.015]' : ''}`} style={{ height: TOTAL_HEIGHT }}>

          {/* Hour labels */}
          <div className="w-16 shrink-0 relative select-none">
            {HOURS.map((h, i) => (
              <div key={h} className="absolute right-3 text-[10px] text-text-faint -translate-y-2.5" style={{ top: i * HOUR_HEIGHT }}>
                {fmtHour(h)}
              </div>
            ))}
          </div>

          {/* Grid lines + events */}
          <div className="flex-1 relative border-l border-border">
            {/* Hour lines */}
            {HOURS.map((_, i) => (
              <div key={i} className="absolute left-0 right-0 border-t border-border" style={{ top: i * HOUR_HEIGHT }} />
            ))}
            {HOURS.map((_, i) => (
              <div key={`h-${i}`} className="absolute left-0 right-0 border-t border-border/30" style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
            ))}

            {/* Drop indicator */}
            {dropLineY !== null && (
              <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: dropLineY }}>
                <div className="w-2.5 h-2.5 rounded-full bg-accent -ml-1.5 shrink-0" />
                <div className="flex-1 h-0.5 bg-accent" />
              </div>
            )}

            {/* Timed events */}
            {timed.map((e) => {
              const startMins    = timeToMinutes(e.start_time)!
              const durationMins = (e.estimated_hours ?? 1) * 60
              const top    = ((startMins - TIME_START * 60) / 60) * HOUR_HEIGHT
              const height = Math.max((durationMins / 60) * HOUR_HEIGHT, 28)
              const colour = eventColour(e)
              const { col, numCols } = layout.get(e.id) ?? { col: 0, numCols: 1 }
              const widthPct = 100 / numCols
              const leftPct  = col * widthPct

              return (
                <div
                  key={e.id}
                  draggable
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData('eventId', e.id)
                    ev.dataTransfer.effectAllowed = 'move'
                    setDraggingId(e.id)
                  }}
                  onDragEnd={() => { setDraggingId(null); setDropLineY(null) }}
                  onClick={() => onEventClick(e)}
                  className={`absolute rounded px-2 py-1 overflow-hidden cursor-grab active:cursor-grabbing hover:brightness-95 transition-opacity z-10 ${draggingId === e.id ? 'opacity-30' : ''}`}
                  style={{
                    top,
                    height,
                    left:  `calc(${leftPct}% + 2px)`,
                    width: `calc(${widthPct}% - 4px)`,
                    backgroundColor: colour + '20',
                    color: colour,
                    borderLeft: `3px solid ${colour}`,
                  }}
                >
                  <div className="text-[12px] font-semibold leading-tight truncate">
                    {e.job_number && <span>{e.job_number}</span>}
                    {e.job_number && e.client_name && <span> · </span>}
                    {e.client_name ?? (!e.job_number ? e.title : null)}
                  </div>
                  {height > 36 && e.start_time && (
                    <div className="text-[10px] opacity-75 mt-0.5">
                      {fmtTime(e.start_time)}
                      {e.estimated_hours ? ` — ${fmtTime(minutesToTime(timeToMinutes(e.start_time)! + e.estimated_hours * 60))}` : ''}
                    </div>
                  )}
                  {height > 52 && (e.staff_name || e.trade_type) && (
                    <div className="text-[10px] opacity-60 mt-0.5 truncate">
                      {[e.staff_name, e.trade_type ? fmtTradeType(e.trade_type) : null].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
