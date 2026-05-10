'use client'

import { useState } from 'react'
import type { CalendarEvent } from '@/lib/calendar'
import type { Staff } from '@/lib/staff'
import { eventColour, addDays, toISO, fmtTime } from '@/lib/calendar'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function EventChip({
  event,
  dragging,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  event: CalendarEvent
  dragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onClick: () => void
}) {
  const colour = eventColour(event)
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`w-full text-left px-1.5 py-1 rounded text-[11px] cursor-grab active:cursor-grabbing transition-opacity hover:opacity-70 ${dragging ? 'opacity-30' : ''}`}
      style={{ backgroundColor: colour + '22', color: colour, borderLeft: `2px solid ${colour}` }}
    >
      <div className="font-semibold leading-snug">
        {event.job_number && <span>{event.job_number}</span>}
        {event.job_number && event.client_name && <span> · </span>}
        {event.client_name ?? (!event.job_number ? event.title : null)}
      </div>
      {event.start_time && (
        <div className="text-[10px] opacity-70 mt-0.5">{fmtTime(event.start_time)}</div>
      )}
    </div>
  )
}

export default function ResourceView({
  events,
  staff,
  weekStart,
  staffFilterIds,
  onEventClick,
  onEventMove,
}: {
  events: CalendarEvent[]
  staff: Staff[]
  weekStart: Date
  staffFilterIds: string[]
  onEventClick: (e: CalendarEvent) => void
  onEventMove: (eventId: string, newDate: string, newStaffId?: string | null) => void
}) {
  const today = toISO(new Date())
  const days  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const [draggingId, setDraggingId] = useState<string | null>(null)
  // dropTarget: "date:staffId" or "date:__unassigned__"
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const visibleStaff = staffFilterIds.length > 0
    ? staff.filter((s) => staffFilterIds.includes(s.id))
    : staff

  const lookup = new Map<string, Map<string, CalendarEvent[]>>()
  for (const s of visibleStaff) lookup.set(s.id, new Map())
  const unassignedByDay = new Map<string, CalendarEvent[]>()

  for (const e of events) {
    if (!e.scheduled_date) continue
    if (e.staff_id && lookup.has(e.staff_id)) {
      const staffMap = lookup.get(e.staff_id)!
      const arr = staffMap.get(e.scheduled_date) ?? []
      arr.push(e)
      staffMap.set(e.scheduled_date, arr)
    } else if (!e.staff_id) {
      const arr = unassignedByDay.get(e.scheduled_date) ?? []
      arr.push(e)
      unassignedByDay.set(e.scheduled_date, arr)
    }
  }

  const hasUnassigned = days.some((d) => (unassignedByDay.get(toISO(d))?.length ?? 0) > 0)

  function cellKey(date: string, staffId: string) { return `${date}:${staffId}` }

  function dropProps(date: string, staffId: string) {
    const key = cellKey(date, staffId)
    const isTarget = dropTarget === key
    return {
      onDragOver:  (e: React.DragEvent) => { e.preventDefault(); setDropTarget(key) },
      onDragLeave: (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null)
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault()
        const eventId = e.dataTransfer.getData('eventId')
        if (eventId) onEventMove(eventId, date, staffId === '__unassigned__' ? null : staffId)
        setDropTarget(null)
        setDraggingId(null)
      },
      isTarget,
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="table-fixed border-collapse w-full" style={{ minWidth: 700 }}>
        <colgroup>
          <col className="w-36" />
          {days.map((d) => <col key={toISO(d)} />)}
        </colgroup>

        <thead className="sticky top-0 z-10">
          <tr>
            <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-text-faint font-medium border-b border-r border-border bg-surface">
              Staff
            </th>
            {days.map((d, i) => {
              const iso = toISO(d)
              const isToday = iso === today
              return (
                <th key={iso} className="px-3 py-3 border-b border-r border-border bg-surface font-normal">
                  <p className="text-[10px] uppercase tracking-widest text-text-faint">{WEEKDAYS[i]}</p>
                  <p className={`text-sm font-semibold mt-0.5 ${isToday ? 'text-accent' : 'text-text-muted'}`}>
                    {d.getDate()} {d.toLocaleDateString('en-AU', { month: 'short' })}
                  </p>
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {visibleStaff.map((s) => (
            <tr key={s.id} className="border-b border-border">
              <td className="px-4 py-3 border-r border-border bg-surface-muted/30 align-top">
                <div className="flex items-center gap-2">
                  {s.colour && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.colour }} />}
                  <span className="text-sm font-medium text-text">{s.display_name}</span>
                </div>
              </td>
              {days.map((d) => {
                const iso = toISO(d)
                const dayEvents = lookup.get(s.id)?.get(iso) ?? []
                const isToday = iso === today
                const { onDragOver, onDragLeave, onDrop, isTarget } = dropProps(iso, s.id)
                return (
                  <td
                    key={iso}
                    className={`px-1.5 py-1.5 border-r border-border align-top transition-colors ${
                      isTarget ? 'bg-accent/10 ring-1 ring-inset ring-accent' : isToday ? 'bg-accent/[0.025]' : ''
                    }`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                  >
                    <div className="space-y-0.5 min-h-[3.5rem]">
                      {dayEvents.map((e) => (
                        <EventChip
                          key={e.id}
                          event={e}
                          dragging={draggingId === e.id}
                          onDragStart={(ev) => {
                            ev.dataTransfer.setData('eventId', e.id)
                            ev.dataTransfer.effectAllowed = 'move'
                            setDraggingId(e.id)
                          }}
                          onDragEnd={() => { setDraggingId(null); setDropTarget(null) }}
                          onClick={() => onEventClick(e)}
                        />
                      ))}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}

          {hasUnassigned && (
            <tr className="border-b border-border">
              <td className="px-4 py-3 border-r border-border bg-surface-muted/30 text-text-faint text-xs italic align-top">
                Unassigned
              </td>
              {days.map((d) => {
                const iso = toISO(d)
                const dayEvents = unassignedByDay.get(iso) ?? []
                const { onDragOver, onDragLeave, onDrop, isTarget } = dropProps(iso, '__unassigned__')
                return (
                  <td
                    key={iso}
                    className={`px-1.5 py-1.5 border-r border-border align-top transition-colors ${isTarget ? 'bg-accent/10 ring-1 ring-inset ring-accent' : ''}`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                  >
                    <div className="space-y-0.5 min-h-[3.5rem]">
                      {dayEvents.map((e) => (
                        <EventChip
                          key={e.id}
                          event={e}
                          dragging={draggingId === e.id}
                          onDragStart={(ev) => {
                            ev.dataTransfer.setData('eventId', e.id)
                            ev.dataTransfer.effectAllowed = 'move'
                            setDraggingId(e.id)
                          }}
                          onDragEnd={() => { setDraggingId(null); setDropTarget(null) }}
                          onClick={() => onEventClick(e)}
                        />
                      ))}
                    </div>
                  </td>
                )
              })}
            </tr>
          )}

          {visibleStaff.length === 0 && !hasUnassigned && (
            <tr>
              <td colSpan={8} className="px-6 py-10 text-center text-sm text-text-faint italic">
                No staff to display
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
