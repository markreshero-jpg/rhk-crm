'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { ChevronRight, Calendar } from 'lucide-react'
import {
  WorkOrderWithJob, WorkOrderLine, LineGroup,
  WORK_ORDER_STATUSES,
  searchWorkOrders, getWorkOrderLinesByWorkOrderId, groupWorkOrderLines,
} from '@/lib/workOrders'
import { JobScheduleEventWithRelations, getScheduleEventsByWorkOrderId } from '@/lib/jobSchedule'
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
                  onToggle={() => toggleExpand(wo.id)}
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

function WorkOrderRow({ wo, expanded, lines, events, loadingExpand, onToggle }: {
  wo: WorkOrderWithJob
  expanded: boolean
  lines: WorkOrderLine[] | null
  events: JobScheduleEventWithRelations[] | null
  loadingExpand: boolean
  onToggle: () => void
}) {
  const groups = lines ? groupWorkOrderLines(lines) : []
  const scheduled = wo.scheduled_start
    ? fmtDate(wo.scheduled_start) + (wo.scheduled_end ? ` – ${fmtDate(wo.scheduled_end)}` : '')
    : '—'

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
          <td colSpan={7} className="px-6 py-4">
            {loadingExpand ? (
              <p className="text-xs text-text-subtle py-1">Loading…</p>
            ) : (
              <div className="flex gap-8">

                {/* Items */}
                <div className="min-w-[180px]">
                  <p className="text-[10px] uppercase tracking-widest text-text-faint font-medium mb-2">Items</p>
                  {groups.length === 0 ? (
                    <p className="text-xs text-text-faint italic">No items</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {groups.map((group) => (
                        <div key={group.name} className="flex items-center gap-2 text-xs">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium leading-tight ${stageBadgeStyles[group.lines[0]?.stage || ''] || 'bg-surface-muted text-text-muted'}`}>
                            {group.lines[0]?.stage || 'Admin'}
                          </span>
                          <span className="text-text font-medium">{group.name}</span>
                          <span className="text-text-faint">{group.lines.length} line{group.lines.length !== 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Schedule Events */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-text-faint font-medium mb-2">Schedule Events</p>
                  {!events || events.length === 0 ? (
                    <p className="text-xs text-text-faint italic">No events scheduled</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {events.map((evt) => (
                        <div key={evt.id} className="flex items-center gap-3 text-xs">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium whitespace-nowrap ${scheduleStatusStyles[evt.status] || ''}`}>
                            {evt.status}
                          </span>
                          {evt.trade_type && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-text-muted border border-border whitespace-nowrap">{evt.trade_type}</span>
                          )}
                          <span className="text-text font-medium truncate">{evt.title || 'Untitled'}</span>
                          {evt.scheduled_date && (
                            <span className="text-text-subtle whitespace-nowrap flex items-center gap-1">
                              <Calendar size={10} />{fmtDate(evt.scheduled_date)}
                            </span>
                          )}
                          {evt.staff?.display_name && (
                            <span className="text-text-muted whitespace-nowrap">· {evt.staff.display_name}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
