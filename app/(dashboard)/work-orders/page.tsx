'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import {
  WorkOrderWithJob, WorkOrderLine, LineGroup,
  WORK_ORDER_STATUSES,
  searchWorkOrders, getWorkOrderLinesByWorkOrderId, groupWorkOrderLines,
} from '@/lib/workOrders'
import {
  JobScheduleEvent, JobScheduleEventWithRelations,
  ScheduleEventStatus, SCHEDULE_STATUSES,
  getScheduleEventsByWorkOrderId, updateScheduleEvent,
} from '@/lib/jobSchedule'
import { Staff, getActiveStaff } from '@/lib/staff'
import { stageBadgeStyles } from '@/lib/stageStyles'
import ListFilters, { FilterDef } from '@/components/ListFilters'
import ResizableTable, { ColDef } from '@/components/ResizableTable'

const statusStyles: Record<string, string> = {
  'Draft':       'bg-surface-muted text-text-muted border-border',
  'Ready':       'bg-info-bg text-info border-info-border',
  'In Progress': 'bg-warning-bg text-warning border-warning-border',
  'Completed':   'bg-success-bg text-success border-success-border',
  'Cancelled':   'bg-surface-muted text-text-faint border-border',
}

const scheduleStatusStyles: Record<string, string> = {
  'Unscheduled': 'bg-surface-muted text-text-muted border-border',
  'Scheduled':   'bg-info-bg text-info border-info-border',
  'In Progress': 'bg-warning-bg text-warning border-warning-border',
  'Completed':   'bg-success-bg text-success border-success-border',
  'Cancelled':   'bg-surface-muted text-text-faint border-border',
}

const filters: FilterDef[] = [
  { id: 'status', label: 'Status', options: WORK_ORDER_STATUSES.map((s) => ({ value: s, label: s })) },
]

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Column definitions ─────────────────────────────────────────────────────────

const WO_COLUMNS = (onExpandAll: () => void, allExpanded: boolean): ColDef[] => [
  {
    key: 'expand', defaultWidth: 36, minWidth: 36, noResize: true,
    label: (
      <button type="button" onClick={onExpandAll} className="text-text-faint hover:text-text transition-colors" title={allExpanded ? 'Collapse all' : 'Expand all'}>
        <ChevronRight size={15} className={`transition-transform duration-150 ${allExpanded ? 'rotate-90' : ''}`} />
      </button>
    ),
  },
  { key: 'wo',        label: 'WO #',      defaultWidth: 112, minWidth: 60 },
  { key: 'job',       label: 'Job',       defaultWidth: 120, minWidth: 60 },
  { key: 'client',    label: 'Client',    defaultWidth: 240, minWidth: 80 },
  { key: 'title',     label: 'Title',     defaultWidth: 192, minWidth: 80 },
  { key: 'scheduled', label: 'Scheduled', defaultWidth: 160, minWidth: 80 },
  { key: 'status',    label: 'Status',    defaultWidth: 120, minWidth: 60 },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WorkOrdersListPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrderWithJob[]>([])
  const [query, setQuery] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [linesCache, setLinesCache] = useState<Map<string, WorkOrderLine[]>>(new Map())
  const [eventsCache, setEventsCache] = useState<Map<string, JobScheduleEventWithRelations[]>>(new Map())
  const [loadingExpand, setLoadingExpand] = useState<Set<string>>(new Set())
  const [staff, setStaff] = useState<Staff[]>([])

  useEffect(() => {
    getActiveStaff().then(setStaff)
  }, [])

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      searchWorkOrders(query).then(setWorkOrders).finally(() => setLoading(false))
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  const filtered = useMemo(() => {
    if (!filterValues.status) return workOrders
    return workOrders.filter((wo) => wo.status === filterValues.status)
  }, [workOrders, filterValues])

  const allExpanded = filtered.length > 0 && filtered.every((wo) => expandedIds.has(wo.id))

  async function loadDataForWO(id: string) {
    const [lines, events] = await Promise.all([
      linesCache.has(id) ? Promise.resolve(linesCache.get(id)!) : getWorkOrderLinesByWorkOrderId(id),
      eventsCache.has(id) ? Promise.resolve(eventsCache.get(id)!) : getScheduleEventsByWorkOrderId(id),
    ])
    setLinesCache((prev) => new Map(prev).set(id, lines))
    setEventsCache((prev) => new Map(prev).set(id, events))
  }

  async function refreshEventsForWO(id: string) {
    const events = await getScheduleEventsByWorkOrderId(id)
    setEventsCache((prev) => new Map(prev).set(id, events))
  }

  const toggleExpand = useCallback(async (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    if (!linesCache.has(id) || !eventsCache.has(id)) {
      setLoadingExpand((prev) => new Set(prev).add(id))
      try { await loadDataForWO(id) }
      finally { setLoadingExpand((prev) => { const n = new Set(prev); n.delete(id); return n }) }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesCache, eventsCache])

  const toggleExpandAll = useCallback(async () => {
    if (allExpanded) {
      setExpandedIds(new Set())
    } else {
      const toFetch = filtered.filter((wo) => !linesCache.has(wo.id) || !eventsCache.has(wo.id)).map((wo) => wo.id)
      if (toFetch.length) {
        setLoadingExpand((prev) => new Set([...prev, ...toFetch]))
        await Promise.all(toFetch.map(async (id) => {
          try { await loadDataForWO(id) }
          finally { setLoadingExpand((prev) => { const n = new Set(prev); n.delete(id); return n }) }
        }))
      }
      setExpandedIds(new Set(filtered.map((wo) => wo.id)))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allExpanded, filtered, linesCache, eventsCache])

  return (
    <div className="p-10 max-w-7xl">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-1">Workspace</p>
          <h2 className="text-4xl font-medium text-text tracking-tight">Work Orders</h2>
          <p className="text-text-muted mt-2 text-sm">All work orders across every job.</p>
        </div>
      </div>

      <ListFilters
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by WO number, title, job or client…"
        filters={filters}
        filterValues={filterValues}
        onFilterChange={(id, val) => setFilterValues((p) => ({ ...p, [id]: val }))}
        resultCount={filtered.length}
        resultLabel={filtered.length === 1 ? 'work order' : 'work orders'}
      />

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><p className="text-text-subtle text-sm">Loading…</p></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-text-subtle text-sm">{query || filterValues.status ? 'No work orders match.' : 'No work orders yet.'}</p>
            {!query && !filterValues.status && <p className="text-text-faint text-xs mt-2">Create work orders from within a job.</p>}
          </div>
        ) : (
          <ResizableTable storageKey="work-orders-list" columns={WO_COLUMNS(toggleExpandAll, allExpanded)}>
            <tbody>
              {filtered.map((wo) => (
                <WorkOrderRow
                  key={wo.id}
                  wo={wo}
                  expanded={expandedIds.has(wo.id)}
                  lines={linesCache.get(wo.id) ?? null}
                  events={eventsCache.get(wo.id) ?? null}
                  loadingExpand={loadingExpand.has(wo.id)}
                  staff={staff}
                  onToggle={() => toggleExpand(wo.id)}
                  onEventsRefresh={() => refreshEventsForWO(wo.id)}
                />
              ))}
            </tbody>
          </ResizableTable>
        )}
      </div>
    </div>
  )
}

// ── Work Order Row ─────────────────────────────────────────────────────────────

type ExpandRow = {
  key: string
  showItem: boolean
  group: LineGroup | null
  event: JobScheduleEventWithRelations | null
}

function WorkOrderRow({ wo, expanded, lines, events, loadingExpand, staff, onToggle, onEventsRefresh }: {
  wo: WorkOrderWithJob
  expanded: boolean
  lines: WorkOrderLine[] | null
  events: JobScheduleEventWithRelations[] | null
  loadingExpand: boolean
  staff: Staff[]
  onToggle: () => void
  onEventsRefresh: () => Promise<void>
}) {
  const groups = lines ? groupWorkOrderLines(lines) : []
  const scheduled = wo.scheduled_start
    ? fmtDate(wo.scheduled_start) + (wo.scheduled_end ? ` – ${fmtDate(wo.scheduled_end)}` : '')
    : '—'

  // Match events to groups by title (events are imported with title = item name)
  const eventsByGroup = new Map<string, JobScheduleEventWithRelations[]>()
  const unmatchedEvents: JobScheduleEventWithRelations[] = []
  if (events) {
    for (const evt of events) {
      const matched = groups.find((g) => g.name === evt.title)
      if (matched) {
        if (!eventsByGroup.has(matched.name)) eventsByGroup.set(matched.name, [])
        eventsByGroup.get(matched.name)!.push(evt)
      } else {
        unmatchedEvents.push(evt)
      }
    }
  }

  // Flatten into a single list of rows: item info only shows on first event row for each group
  const rows: ExpandRow[] = []
  for (const group of groups) {
    const groupEvents = eventsByGroup.get(group.name) ?? []
    if (groupEvents.length === 0) {
      rows.push({ key: `${group.name}-empty`, showItem: true, group, event: null })
    } else {
      groupEvents.forEach((evt, i) => {
        rows.push({ key: evt.id, showItem: i === 0, group, event: evt })
      })
    }
  }
  for (const evt of unmatchedEvents) {
    rows.push({ key: evt.id, showItem: false, group: null, event: evt })
  }

  async function handleEventUpdate(evtId: string, patch: Partial<JobScheduleEvent>) {
    await updateScheduleEvent(evtId, patch)
    await onEventsRefresh()
  }

  return (
    <>
      <tr className={`border-b border-border transition-colors ${expanded ? 'bg-surface-hover' : 'hover:bg-surface-hover'}`}>
        <td className="px-3 py-2 w-8">
          <button type="button" onClick={onToggle} className="text-text-faint hover:text-text transition-colors">
            <ChevronRight size={15} className={`transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </td>
        <td className="px-3 py-2">
          <Link href={`/jobs/${wo.job_id}?tab=work-orders`} className="text-sm font-mono text-text-muted hover:text-accent transition-colors">
            {wo.work_order_number || '—'}
          </Link>
        </td>
        <td className="px-3 py-2">
          {wo.job_number
            ? <Link href={`/jobs/${wo.job_id}?tab=work-orders`} className="text-sm font-mono text-text-muted hover:text-accent transition-colors">{wo.job_number}</Link>
            : <span className="text-text-faint text-sm">—</span>}
        </td>
        <td className="px-3 py-2 text-sm text-text font-medium truncate">{wo.client_name || '—'}</td>
        <td className="px-3 py-2 text-sm text-text-muted truncate">{wo.title || <span className="italic text-text-faint">Untitled</span>}</td>
        <td className="px-3 py-2 text-xs text-text-muted whitespace-nowrap">{scheduled}</td>
        <td className="px-3 py-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusStyles[wo.status] || 'bg-surface-muted text-text-muted border-border'}`}>
            {wo.status}
          </span>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-border bg-surface-muted/30">
          <td colSpan={7} className="px-6 py-2">
            {loadingExpand ? (
              <p className="text-xs text-text-subtle py-2">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-xs text-text-faint italic py-2">No items or events.</p>
            ) : (
              <div className="divide-y divide-border">
                {rows.map((row) => (
                  <div key={row.key} className="flex items-center gap-6 py-2">

                    {/* Item column — fixed width, only visible on first event for each group */}
                    <div className="w-56 shrink-0">
                      {row.showItem && row.group && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium leading-tight whitespace-nowrap shrink-0 ${stageBadgeStyles[row.group.lines[0]?.stage || ''] || 'bg-surface-muted text-text-muted'}`}>
                            {row.group.lines[0]?.stage || 'Admin'}
                          </span>
                          <span className="text-text font-medium truncate">{row.group.name}</span>
                          <span className="text-text-faint whitespace-nowrap shrink-0">{row.group.lines.length}L</span>
                        </div>
                      )}
                    </div>

                    {/* Event column — editable */}
                    <div className="flex-1 min-w-0">
                      {row.event ? (
                        <EventEditRow
                          key={`${row.event.id}:${row.event.status}:${row.event.scheduled_date ?? ''}:${row.event.staff_id ?? ''}:${row.event.notes ?? ''}:${row.event.not_needed}`}
                          event={row.event}
                          staff={staff}
                          onUpdate={(patch) => handleEventUpdate(row.event!.id, patch)}
                        />
                      ) : (
                        <p className="text-xs text-text-faint italic">No events</p>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ── Event Edit Row ─────────────────────────────────────────────────────────────

const cellCls = 'text-xs bg-transparent border border-transparent rounded px-1.5 py-1 focus:bg-surface focus:border-accent focus:outline-none'

function EventEditRow({ event, staff, onUpdate }: {
  event: JobScheduleEventWithRelations
  staff: Staff[]
  onUpdate: (patch: Partial<JobScheduleEvent>) => Promise<void>
}) {
  return (
    <div className="flex items-center gap-2">

      {/* Not needed toggle — always visible so it can be unchecked */}
      <input
        type="checkbox"
        checked={event.not_needed}
        onChange={(e) => onUpdate({ not_needed: e.target.checked })}
        title={event.not_needed ? 'Mark as needed' : 'Mark as not needed'}
        className="shrink-0 cursor-pointer accent-accent"
      />

      {event.not_needed ? (
        /* Greyed-out placeholder when not needed */
        <span className="text-xs text-text-faint italic line-through select-none">
          {[event.trade_type, event.title].filter(Boolean).join(' — ') || 'Not needed'}
          {' '}— not needed
        </span>
      ) : (
        <>
          {/* Status */}
          <select
            value={event.status}
            onChange={(e) => onUpdate({ status: e.target.value as ScheduleEventStatus })}
            className={`text-[11px] rounded px-1.5 py-1 border font-medium focus:outline-none focus:border-accent shrink-0 ${scheduleStatusStyles[event.status] || ''}`}
          >
            {SCHEDULE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Trade type badge */}
          {event.trade_type && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-text-muted border border-border whitespace-nowrap shrink-0">
              {event.trade_type}
            </span>
          )}

          {/* Date */}
          <input
            type="date"
            defaultValue={event.scheduled_date || ''}
            onBlur={(e) => {
              const date = e.target.value || null
              const patch: Partial<JobScheduleEvent> = { scheduled_date: date }
              if (date && event.status === 'Unscheduled') patch.status = 'Scheduled'
              onUpdate(patch)
            }}
            className={cellCls + ' w-32 shrink-0'}
          />

          {/* Staff */}
          <select
            defaultValue={event.staff_id || ''}
            onChange={(e) => onUpdate({ staff_id: e.target.value || null })}
            className={cellCls + ' shrink-0'}
          >
            <option value="">— Staff —</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}
          </select>

          {/* Notes */}
          <input
            type="text"
            defaultValue={event.notes || ''}
            onBlur={(e) => onUpdate({ notes: e.target.value || null })}
            placeholder="Notes…"
            className={cellCls + ' flex-1 min-w-0'}
          />
        </>
      )}
    </div>
  )
}
