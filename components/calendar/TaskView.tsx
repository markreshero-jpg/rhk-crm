'use client'

import { useState } from 'react'
import type { CalendarEvent } from '@/lib/calendar'
import { eventColour, tradeTypeColour, fmtTradeType, addDays, toISO, fmtTime } from '@/lib/calendar'

// Production order — types not listed here appear alphabetically between delivery and install
const TASK_ORDER = ['cut & edge', 'assemble', 'load', 'delivery', 'install', 'fix up']

function sortTradeTypes(types: string[]): string[] {
  const known   = TASK_ORDER.filter((t) => types.includes(t))
  const unknown = types.filter((t) => !TASK_ORDER.includes(t)).sort()
  // Insert unknowns after 'delivery' (or before 'install') in the flow
  const deliveryIdx = known.indexOf('delivery')
  const insertAt = deliveryIdx >= 0 ? deliveryIdx + 1 : known.indexOf('install') >= 0 ? known.indexOf('install') : known.length
  known.splice(insertAt, 0, ...unknown)
  return known
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type OnEventMove = (
  eventId: string,
  newDate: string,
  newStaffId?: string | null,
  newStartTime?: string | null,
  newTradeType?: string | null,
) => void

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
      {event.staff_name && (
        <div className="text-[10px] opacity-70 mt-0.5">{event.staff_name}</div>
      )}
      {event.start_time && (
        <div className="text-[10px] opacity-70">{fmtTime(event.start_time)}</div>
      )}
    </div>
  )
}

export default function TaskView({
  events,
  weekStart,
  onEventClick,
  onEventMove,
}: {
  events: CalendarEvent[]
  weekStart: Date
  onEventClick: (e: CalendarEvent) => void
  onEventMove: OnEventMove
}) {
  const today = toISO(new Date())
  const days  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)  // "date:tradeType"

  // Only show trade types present in this week's events, sorted by production order
  const allTypes = sortTradeTypes(Array.from(new Set(
    events.map((e) => (e.trade_type ?? '').toLowerCase()).filter(Boolean)
  )))

  // Build lookup: tradeType → date → events[]
  const byType = new Map<string, Map<string, CalendarEvent[]>>()
  for (const type of allTypes) byType.set(type, new Map())
  const noType = new Map<string, CalendarEvent[]>()

  for (const e of events) {
    if (!e.scheduled_date) continue
    const t = (e.trade_type ?? '').toLowerCase()
    if (t && byType.has(t)) {
      const typeMap = byType.get(t)!
      const arr = typeMap.get(e.scheduled_date) ?? []
      arr.push(e)
      typeMap.set(e.scheduled_date, arr)
    } else {
      const arr = noType.get(e.scheduled_date) ?? []
      arr.push(e)
      noType.set(e.scheduled_date, arr)
    }
  }

  const hasUntyped = days.some((d) => (noType.get(toISO(d))?.length ?? 0) > 0)

  function cellKey(date: string, type: string) { return `${date}:${type}` }

  function dropProps(date: string, type: string) {
    const key = cellKey(date, type)
    const isTarget = dropTarget === key
    return {
      onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDropTarget(key) },
      onDragLeave: (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null)
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault()
        const eventId = e.dataTransfer.getData('eventId')
        if (eventId) onEventMove(eventId, date, undefined, undefined, type === '__none__' ? null : type)
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
          <col style={{ width: '9rem' }} />
          {days.map((d) => <col key={toISO(d)} />)}
        </colgroup>

        <thead className="sticky top-0 z-10">
          <tr>
            <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-text-faint font-medium border-b border-r border-border bg-surface">
              Task Type
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
          {allTypes.map((type) => {
            const colour = tradeTypeColour(type)
            // Count events for this type across the week
            const weekCount = days.reduce((n, d) => n + (byType.get(type)?.get(toISO(d))?.length ?? 0), 0)

            return (
              <tr key={type} className="border-b border-border">
                {/* Task type label */}
                <td className="px-4 py-3 border-r border-border bg-surface-muted/30 align-top">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colour }} />
                    <span className="text-sm font-medium text-text leading-tight">{fmtTradeType(type)}</span>
                  </div>
                  {weekCount > 0 && (
                    <p className="text-[10px] text-text-faint mt-1 pl-[18px]">{weekCount} event{weekCount !== 1 ? 's' : ''}</p>
                  )}
                </td>

                {/* Day cells */}
                {days.map((d) => {
                  const iso = toISO(d)
                  const dayEvents = byType.get(type)?.get(iso) ?? []
                  const isToday = iso === today
                  const { onDragOver, onDragLeave, onDrop, isTarget } = dropProps(iso, type)
                  return (
                    <td
                      key={iso}
                      className={`px-1.5 py-1.5 border-r border-border align-top transition-colors ${
                        isTarget
                          ? 'ring-1 ring-inset ring-accent'
                          : isToday
                            ? 'bg-accent/[0.025]'
                            : ''
                      }`}
                      style={isTarget ? { backgroundColor: colour + '18' } : undefined}
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
            )
          })}

          {/* Untyped row — only if data exists */}
          {hasUntyped && (
            <tr className="border-b border-border">
              <td className="px-4 py-3 border-r border-border bg-surface-muted/30 align-top">
                <span className="text-xs text-text-faint italic">Unassigned</span>
              </td>
              {days.map((d) => {
                const iso = toISO(d)
                const dayEvents = noType.get(iso) ?? []
                const isToday = iso === today
                const { onDragOver, onDragLeave, onDrop, isTarget } = dropProps(iso, '__none__')
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
          )}
        </tbody>
      </table>
    </div>
  )
}
