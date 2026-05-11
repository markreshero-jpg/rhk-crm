'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import {
  getCalendarEvents, applyFilters, startOfWeek, addDays, toISO,
  startOfMonthGrid, CalendarEvent, CalendarFilters,
} from '@/lib/calendar'
import { getActiveStaff, Staff } from '@/lib/staff'
import { updateScheduleEvent } from '@/lib/jobSchedule'
import FilterSidebar from './calendar/FilterSidebar'
import DayView from './calendar/DayView'
import MonthView from './calendar/MonthView'
import WeekView from './calendar/WeekView'
import ResourceView from './calendar/ResourceView'
import TaskView from './calendar/TaskView'
import EventModal from './calendar/EventModal'

type ViewType = 'day' | 'week' | 'month' | 'resource' | 'task'

const VIEW_LABELS: Record<ViewType, string> = {
  day: 'Day', week: 'Week', month: 'Month', resource: 'Resource', task: 'Task',
}

function getDateRange(view: ViewType, anchor: Date): { from: string; to: string } {
  if (view === 'day') {
    const iso = toISO(anchor)
    return { from: iso, to: iso }
  }
  if (view === 'month') {
    const gridStart = startOfMonthGrid(anchor.getFullYear(), anchor.getMonth())
    return { from: toISO(gridStart), to: toISO(addDays(gridStart, 41)) }
  }
  const ws = startOfWeek(anchor)
  return { from: toISO(ws), to: toISO(addDays(ws, 6)) }
}

function formatLabel(view: ViewType, anchor: Date): string {
  if (view === 'day') {
    return anchor.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }
  if (view === 'month') {
    return anchor.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  }
  const ws = startOfWeek(anchor)
  const we = addDays(ws, 6)
  if (ws.getMonth() === we.getMonth()) {
    return `${ws.getDate()}–${we.getDate()} ${ws.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}`
  }
  return `${ws.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${we.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function navigate(view: ViewType, anchor: Date, dir: -1 | 1): Date {
  const d = new Date(anchor)
  if (view === 'day')   d.setDate(d.getDate() + dir)
  else if (view === 'month') d.setMonth(d.getMonth() + dir)
  else d.setDate(d.getDate() + dir * 7)
  return d
}

export default function CalendarPage() {
  const [view, setView]               = useState<ViewType>('week')
  const [anchor, setAnchor]           = useState<Date>(new Date())
  const [events, setEvents]           = useState<CalendarEvent[]>([])
  const [staff, setStaff]             = useState<Staff[]>([])
  const [loading, setLoading]         = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selected, setSelected]       = useState<CalendarEvent | null>(null)
  const [filters, setFilters]         = useState<CalendarFilters>({ jobSearch: '', staffIds: [], tradeTypes: [] })

  const { from, to } = useMemo(() => getDateRange(view, anchor), [view, anchor])

  useEffect(() => {
    getActiveStaff().then(setStaff).catch(console.error)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCalendarEvents(from, to)
      .then((evts) => { if (!cancelled) { setEvents(evts); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [from, to])

  async function handleEventMove(
    eventId: string,
    newDate: string,
    newStaffId?: string | null,
    newStartTime?: string | null,
    newTradeType?: string | null,
  ) {
    setEvents((prev) => prev.map((e) =>
      e.id === eventId
        ? {
            ...e,
            scheduled_date: newDate,
            ...(newStaffId   !== undefined ? { staff_id:   newStaffId   } : {}),
            ...(newStartTime !== undefined ? { start_time: newStartTime } : {}),
            ...(newTradeType !== undefined ? { trade_type: newTradeType } : {}),
          }
        : e
    ))
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patch: Record<string, any> = { scheduled_date: newDate }
      if (newStaffId   !== undefined) patch.staff_id   = newStaffId
      if (newStartTime !== undefined) patch.start_time = newStartTime
      if (newTradeType !== undefined) patch.trade_type = newTradeType
      await updateScheduleEvent(eventId, patch)
    } catch {
      getCalendarEvents(from, to).then(setEvents).catch(console.error)
    }
  }

  const filtered  = useMemo(() => applyFilters(events, filters), [events, filters])
  const weekStart = (['week', 'resource', 'task'] as ViewType[]).includes(view) ? startOfWeek(anchor) : null

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar + collapse tab */}
      <div className="flex shrink-0 items-stretch">
        <div className={`overflow-hidden transition-[width] duration-200 ${sidebarOpen ? 'w-52' : 'w-0'}`}>
          <FilterSidebar
            staff={staff}
            filters={filters}
            onChange={setFilters}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="flex items-center justify-center w-3 bg-surface border-r border-border hover:bg-surface-hover transition-colors text-text-faint hover:text-text shrink-0"
          title={sidebarOpen ? 'Collapse filters' : 'Expand filters'}
        >
          <ChevronLeft size={10} className={`transition-transform duration-200 ${sidebarOpen ? '' : 'rotate-180'}`} />
        </button>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className={`p-1.5 rounded transition-colors ${sidebarOpen ? 'bg-surface-muted text-text-muted' : 'hover:bg-surface-hover text-text-faint hover:text-text'}`}
            title={sidebarOpen ? 'Hide filters' : 'Show filters'}
          >
            <SlidersHorizontal size={15} />
          </button>

          <div className="flex bg-surface-muted rounded-md p-0.5">
            {(['day', 'week', 'month', 'resource', 'task'] as ViewType[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  view === v ? 'bg-surface text-text shadow-sm font-medium' : 'text-text-muted hover:text-text'
                }`}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setAnchor((a) => navigate(view, a, -1))} className="p-1.5 rounded hover:bg-surface-hover transition-colors text-text-muted hover:text-text">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setAnchor(new Date())} className="px-2.5 py-1 text-xs rounded border border-border hover:bg-surface-hover transition-colors text-text-muted">
              Today
            </button>
            <button onClick={() => setAnchor((a) => navigate(view, a, 1))} className="p-1.5 rounded hover:bg-surface-hover transition-colors text-text-muted hover:text-text">
              <ChevronRight size={16} />
            </button>
          </div>

          <h2 className="text-sm font-semibold text-text">{formatLabel(view, anchor)}</h2>
          {loading && <span className="ml-auto text-xs text-text-faint">Loading…</span>}
        </div>

        {/* View area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {view === 'day' && (
            <DayView
              events={filtered}
              date={anchor}
              onEventClick={setSelected}
              onEventMove={handleEventMove}
            />
          )}
          {view === 'week' && weekStart && (
            <WeekView
              events={filtered}
              weekStart={weekStart}
              onEventClick={setSelected}
              onEventMove={handleEventMove}
            />
          )}
          {view === 'month' && (
            <MonthView
              events={filtered}
              year={anchor.getFullYear()}
              month={anchor.getMonth()}
              onEventClick={setSelected}
              onEventMove={handleEventMove}
            />
          )}
          {view === 'resource' && weekStart && (
            <ResourceView
              events={filtered}
              staff={staff}
              weekStart={weekStart}
              staffFilterIds={filters.staffIds}
              onEventClick={setSelected}
              onEventMove={handleEventMove}
            />
          )}
          {view === 'task' && weekStart && (
            <TaskView
              events={filtered}
              weekStart={weekStart}
              onEventClick={setSelected}
              onEventMove={handleEventMove}
            />
          )}
        </div>
      </div>

      {selected && <EventModal event={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
