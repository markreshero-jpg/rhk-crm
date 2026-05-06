'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import {
  WorkOrderWithJob, WorkOrderLine, LineGroup,
  WORK_ORDER_STATUSES,
  searchWorkOrders, getWorkOrderLinesByWorkOrderId, groupWorkOrderLines,
} from '@/lib/workOrders'
import { stageBadgeStyles } from '@/lib/stageStyles'
import ListFilters, { FilterDef } from '@/components/ListFilters'
import { formatCurrency } from '@/lib/format'

const statusStyles: Record<string, string> = {
  'Draft':       'bg-surface-muted text-text-muted border-border',
  'Ready':       'bg-info-bg text-info border-info-border',
  'In Progress': 'bg-warning-bg text-warning border-warning-border',
  'Completed':   'bg-success-bg text-success border-success-border',
  'Cancelled':   'bg-surface-muted text-text-faint border-border',
}

const filters: FilterDef[] = [
  {
    id: 'status',
    label: 'Status',
    options: WORK_ORDER_STATUSES.map((s) => ({ value: s, label: s })),
  },
]

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function WorkOrdersListPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrderWithJob[]>([])
  const [query, setQuery] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [linesCache, setLinesCache] = useState<Map<string, WorkOrderLine[]>>(new Map())
  const [loadingLines, setLoadingLines] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      searchWorkOrders(query)
        .then(setWorkOrders)
        .finally(() => setLoading(false))
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  const filtered = useMemo(() => {
    if (!filterValues.status) return workOrders
    return workOrders.filter((wo) => wo.status === filterValues.status)
  }, [workOrders, filterValues])

  const toggleExpand = useCallback(async (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

    // Fetch lines if not cached
    if (!linesCache.has(id)) {
      setLoadingLines((prev) => new Set(prev).add(id))
      try {
        const lines = await getWorkOrderLinesByWorkOrderId(id)
        setLinesCache((prev) => new Map(prev).set(id, lines))
      } finally {
        setLoadingLines((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    }
  }, [linesCache])

  return (
    <div className="p-10 max-w-7xl">
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-1">Workspace</p>
        <h2 className="text-4xl font-medium text-text tracking-tight">Work Orders</h2>
        <p className="text-text-muted mt-2 text-sm">All work orders across every job.</p>
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
          <div className="p-12 text-center">
            <p className="text-text-subtle text-sm">Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-text-subtle text-sm">
              {query || filterValues.status ? 'No work orders match.' : 'No work orders yet.'}
            </p>
            {!query && !filterValues.status && (
              <p className="text-text-faint text-xs mt-2">Create work orders from within a job.</p>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface-muted border-b border-border">
              <tr className="text-left text-[11px] uppercase tracking-wider text-text-subtle">
                <th className="px-3 py-2 font-medium w-8" />
                <th className="px-3 py-2 font-medium w-28">WO #</th>
                <th className="px-3 py-2 font-medium w-32">Job</th>
                <th className="px-3 py-2 font-medium w-40">Client</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium w-36">Scheduled</th>
                <th className="px-3 py-2 font-medium w-32">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((wo) => (
                <WorkOrderRow
                  key={wo.id}
                  wo={wo}
                  expanded={expandedIds.has(wo.id)}
                  lines={linesCache.get(wo.id) ?? null}
                  loadingLines={loadingLines.has(wo.id)}
                  onToggle={() => toggleExpand(wo.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Work Order Row ─────────────────────────────────────────────────────────────

function WorkOrderRow({
  wo, expanded, lines, loadingLines, onToggle,
}: {
  wo: WorkOrderWithJob
  expanded: boolean
  lines: WorkOrderLine[] | null
  loadingLines: boolean
  onToggle: () => void
}) {
  const groups = lines ? groupWorkOrderLines(lines) : []

  const scheduled = wo.scheduled_start
    ? fmtDate(wo.scheduled_start) + (wo.scheduled_end ? ` – ${fmtDate(wo.scheduled_end)}` : '')
    : '—'

  return (
    <>
      <tr
        className={`border-b border-border transition-colors ${expanded ? 'bg-surface-hover' : 'hover:bg-surface-hover'}`}
      >
        {/* Expand chevron */}
        <td className="px-3 py-2 w-8">
          <button
            type="button"
            onClick={onToggle}
            className="text-text-faint hover:text-text transition-colors"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <ChevronRight
              size={15}
              className={`transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
            />
          </button>
        </td>

        {/* WO # */}
        <td className="px-3 py-2">
          <Link
            href={`/jobs/${wo.job_id}?tab=work-orders`}
            className="text-sm font-mono text-text-muted hover:text-accent transition-colors"
          >
            {wo.work_order_number || '—'}
          </Link>
        </td>

        {/* Job */}
        <td className="px-3 py-2">
          {wo.job_number ? (
            <Link
              href={`/jobs/${wo.job_id}?tab=work-orders`}
              className="text-sm font-mono text-text-muted hover:text-accent transition-colors"
            >
              {wo.job_number}
            </Link>
          ) : (
            <span className="text-text-faint text-sm">—</span>
          )}
        </td>

        {/* Client */}
        <td className="px-3 py-2 text-sm text-text font-medium truncate max-w-[160px]">
          {wo.client_name || '—'}
        </td>

        {/* Title */}
        <td className="px-3 py-2 text-sm text-text-muted truncate">
          {wo.title || <span className="italic text-text-faint">Untitled</span>}
        </td>

        {/* Scheduled */}
        <td className="px-3 py-2 text-xs text-text-muted whitespace-nowrap">
          {scheduled}
        </td>

        {/* Status */}
        <td className="px-3 py-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusStyles[wo.status] || 'bg-surface-muted text-text-muted border-border'}`}>
            {wo.status}
          </span>
        </td>
      </tr>

      {/* Expanded items */}
      {expanded && (
        <tr className="border-b border-border bg-surface-muted/50">
          <td colSpan={7} className="px-6 py-3">
            {loadingLines ? (
              <p className="text-xs text-text-subtle py-2">Loading items…</p>
            ) : groups.length === 0 ? (
              <p className="text-xs text-text-faint italic py-2">No items on this work order.</p>
            ) : (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-2">Items</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-1.5 text-[10px] uppercase tracking-widest font-medium text-text-faint pr-4">Item / Room</th>
                      <th className="text-left pb-1.5 text-[10px] uppercase tracking-widest font-medium text-text-faint pr-4">Stage</th>
                      <th className="text-left pb-1.5 text-[10px] uppercase tracking-widest font-medium text-text-faint pr-4">Status</th>
                      <th className="text-right pb-1.5 text-[10px] uppercase tracking-widest font-medium text-text-faint pr-4">Lines</th>
                      <th className="text-right pb-1.5 text-[10px] uppercase tracking-widest font-medium text-text-faint">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {groups.map((group) => (
                      <GroupRow key={group.name} group={group} />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border-strong">
                      <td colSpan={4} className="pt-2 text-xs text-text-subtle text-right pr-4">Total (ex GST)</td>
                      <td className="pt-2 text-xs font-semibold text-text text-right">
                        {formatCurrency(groups.reduce((s, g) => s + g.total, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

function GroupRow({ group }: { group: LineGroup }) {
  const firstLine = group.lines[0]
  const stage  = firstLine?.stage  || 'Admin'
  const status = firstLine?.status || 'Not Started'

  return (
    <tr className="hover:bg-surface-hover transition-colors">
      <td className="py-1.5 pr-4 text-sm font-medium text-text">{group.name}</td>
      <td className="py-1.5 pr-4">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${stageBadgeStyles[stage] || 'bg-surface-muted text-text-muted'}`}>
          {stage}
        </span>
      </td>
      <td className="py-1.5 pr-4 text-xs text-text-muted">{status}</td>
      <td className="py-1.5 pr-4 text-xs text-text-muted text-right">{group.lines.length}</td>
      <td className="py-1.5 text-xs font-medium text-text text-right">{formatCurrency(group.total)}</td>
    </tr>
  )
}
