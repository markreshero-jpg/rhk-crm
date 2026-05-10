'use client'

import { useState } from 'react'
import type { CalendarEvent } from '@/lib/calendar'
import { eventColour, startOfMonthGrid, addDays, toISO } from '@/lib/calendar'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_VISIBLE = 3

export default function MonthView({
  events,
  year,
  month,
  onEventClick,
  onEventMove,
}: {
  events: CalendarEvent[]
  year: number
  month: number
  onEventClick: (e: CalendarEvent) => void
  onEventMove: (eventId: string, newDate: string) => void
}) {
  const today = toISO(new Date())
  const gridStart = startOfMonthGrid(year, month)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const byDay = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    if (!e.scheduled_date) continue
    const arr = byDay.get(e.scheduled_date) ?? []
    arr.push(e)
    byDay.set(e.scheduled_date, arr)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border bg-surface shrink-0">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[10px] uppercase tracking-widest text-text-faint font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div
        className="grid grid-cols-7 flex-1 overflow-auto"
        style={{ gridTemplateRows: 'repeat(6, minmax(110px, 1fr))' }}
      >
        {cells.map((cell) => {
          const iso = toISO(cell)
          const isCurrentMonth = cell.getMonth() === month
          const isToday = iso === today
          const isDropTarget = dropTarget === iso
          const dayEvents = byDay.get(iso) ?? []
          const visible = dayEvents.slice(0, MAX_VISIBLE)
          const overflow = dayEvents.length - MAX_VISIBLE

          return (
            <div
              key={iso}
              className={`border-r border-b border-border p-1.5 overflow-hidden transition-colors ${
                isDropTarget
                  ? 'bg-accent/10 ring-1 ring-inset ring-accent'
                  : isCurrentMonth
                    ? 'bg-surface'
                    : 'bg-surface-muted/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDropTarget(iso) }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                const eventId = e.dataTransfer.getData('eventId')
                if (eventId) onEventMove(eventId, iso)
                setDropTarget(null)
                setDraggingId(null)
              }}
            >
              {/* Day number */}
              <div className={`text-xs w-6 h-6 flex items-center justify-center rounded-full mb-1 font-medium ${
                isToday
                  ? 'bg-accent text-accent-text'
                  : isCurrentMonth ? 'text-text-muted' : 'text-text-faint'
              }`}>
                {cell.getDate()}
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {visible.map((e) => {
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
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] leading-tight cursor-grab active:cursor-grabbing transition-opacity hover:opacity-70 ${
                        draggingId === e.id ? 'opacity-30' : ''
                      }`}
                      style={{ backgroundColor: colour + '22', color: colour, borderLeft: `2px solid ${colour}` }}
                    >
                      {e.job_number && <span className="font-semibold">{e.job_number}</span>}
                      {e.job_number && e.client_name && ' · '}
                      {e.client_name ?? e.title}
                    </div>
                  )
                })}
                {overflow > 0 && (
                  <p className="text-[10px] text-text-faint pl-1.5 pt-0.5">+{overflow} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
