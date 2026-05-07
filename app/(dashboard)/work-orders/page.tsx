'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { ChevronRight, ShoppingCart, CheckCircle2 } from 'lucide-react'
import {
  WorkOrderWithJob, WorkOrderLine, WOLineWithContext, WOLinePOStatus, LineGroup,
  WORK_ORDER_STATUSES,
  searchWorkOrders, getWorkOrderLinesByWorkOrderId, groupWorkOrderLines,
  getIncludeOnPOLines, countIncludeOnPOLines, getPOStatusForWOLines, updateWorkOrderLine,
} from '@/lib/workOrders'
import {
  PurchaseOrder, POSendAssignment,
  getDraftPOsBySupplier, sendWOLinesToPO,
} from '@/lib/purchaseOrders'
import { getAllSuppliers } from '@/lib/suppliers'
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
  { id: 'status', label: 'Status', options: WORK_ORDER_STATUSES.map((s) => ({ value: s, label: s })) },
]

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WorkOrdersListPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrderWithJob[]>([])
  const [query, setQuery] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [linesCache, setLinesCache] = useState<Map<string, WorkOrderLine[]>>(new Map())
  const [loadingLines, setLoadingLines] = useState<Set<string>>(new Set())
  const [poStatusCache, setPoStatusCache] = useState<Map<string, Map<string, WOLinePOStatus>>>(new Map())
  const [supplierNames, setSupplierNames] = useState<Map<string, string>>(new Map())
  const [includedCount, setIncludedCount] = useState(0)
  const [showSendModal, setShowSendModal] = useState(false)

  useEffect(() => {
    getAllSuppliers().then((sups) => setSupplierNames(new Map(sups.map((s) => [s.id, s.company_name]))))
    countIncludeOnPOLines().then(setIncludedCount)
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

  async function loadLinesForWO(id: string): Promise<WorkOrderLine[]> {
    const lines = await getWorkOrderLinesByWorkOrderId(id)
    setLinesCache((prev) => new Map(prev).set(id, lines))
    getPOStatusForWOLines(lines.map((l) => l.id)).then((map) =>
      setPoStatusCache((prev) => new Map(prev).set(id, map))
    )
    return lines
  }

  const toggleExpand = useCallback(async (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    if (!linesCache.has(id)) {
      setLoadingLines((prev) => new Set(prev).add(id))
      try { await loadLinesForWO(id) }
      finally {
        setLoadingLines((prev) => { const n = new Set(prev); n.delete(id); return n })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesCache])

  const toggleExpandAll = useCallback(async () => {
    if (allExpanded) {
      setExpandedIds(new Set())
    } else {
      const toFetch = filtered.filter((wo) => !linesCache.has(wo.id)).map((wo) => wo.id)
      if (toFetch.length) {
        setLoadingLines((prev) => new Set([...prev, ...toFetch]))
        await Promise.all(toFetch.map(async (id) => {
          try { await loadLinesForWO(id) }
          finally { setLoadingLines((prev) => { const n = new Set(prev); n.delete(id); return n }) }
        }))
      }
      setExpandedIds(new Set(filtered.map((wo) => wo.id)))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allExpanded, filtered, linesCache])

  async function handleLineToggle(woId: string, lineId: string, checked: boolean) {
    setLinesCache((prev) => {
      const next = new Map(prev)
      const wl = next.get(woId)
      if (wl) next.set(woId, wl.map((l) => l.id === lineId ? { ...l, include_on_po: checked } : l))
      return next
    })
    setIncludedCount((c) => checked ? c + 1 : c - 1)
    await updateWorkOrderLine(lineId, { include_on_po: checked })
  }

  async function handleSent() {
    setShowSendModal(false)
    setIncludedCount(0)
    await Promise.all(Array.from(expandedIds).map(async (woId) => {
      const lines = await getWorkOrderLinesByWorkOrderId(woId)
      setLinesCache((prev) => new Map(prev).set(woId, lines))
      const map = await getPOStatusForWOLines(lines.map((l) => l.id))
      setPoStatusCache((prev) => new Map(prev).set(woId, map))
    }))
  }

  return (
    <div className="p-10 max-w-7xl">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-1">Workspace</p>
          <h2 className="text-4xl font-medium text-text tracking-tight">Work Orders</h2>
          <p className="text-text-muted mt-2 text-sm">All work orders across every job.</p>
        </div>
        {includedCount > 0 && (
          <button type="button" onClick={() => setShowSendModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-text rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium shrink-0">
            <ShoppingCart size={15} />
            Send {includedCount} line{includedCount !== 1 ? 's' : ''} to PO
          </button>
        )}
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
          <table className="w-full">
            <thead className="bg-surface-muted border-b border-border">
              <tr className="text-left text-[11px] uppercase tracking-wider text-text-subtle">
                <th className="px-3 py-2 font-medium w-8">
                  <button type="button" onClick={toggleExpandAll}
                    className="text-text-faint hover:text-text transition-colors"
                    title={allExpanded ? 'Collapse all' : 'Expand all'}>
                    <ChevronRight size={15} className={`transition-transform duration-150 ${allExpanded ? 'rotate-90' : ''}`} />
                  </button>
                </th>
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

      {showSendModal && <SendToPOModal onClose={() => setShowSendModal(false)} onSent={handleSent} />}
    </div>
  )
}

// ── Work Order Row ─────────────────────────────────────────────────────────────

function WorkOrderRow({ wo, expanded, lines, loadingLines, onToggle }: {
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
        <td className="px-3 py-2 text-sm text-text font-medium truncate max-w-[160px]">{wo.client_name || '—'}</td>
        <td className="px-3 py-2 text-sm text-text-muted truncate">{wo.title || <span className="italic text-text-faint">Untitled</span>}</td>
        <td className="px-3 py-2 text-xs text-text-muted whitespace-nowrap">{scheduled}</td>
        <td className="px-3 py-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusStyles[wo.status] || 'bg-surface-muted text-text-muted border-border'}`}>
            {wo.status}
          </span>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-border bg-surface-muted/40">
          <td colSpan={7} className="px-6 py-3">
            {loadingLines ? (
              <p className="text-xs text-text-subtle py-2">Loading items…</p>
            ) : groups.length === 0 ? (
              <p className="text-xs text-text-faint italic py-2">No items on this work order.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {groups.map((group) => (
                  <div key={group.name} className="flex items-center gap-2.5 px-3 py-1.5 bg-surface border border-border rounded-md text-xs">
                    <span className="font-medium text-text">{group.name}</span>
                    <span className="text-text-faint">{group.lines.length} line{group.lines.length !== 1 ? 's' : ''}</span>
                    <span className="text-text-muted tabular-nums">{formatCurrency(group.total)}</span>
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

// ── Group Section ─────────────────────────────────────────────────────────────

function GroupSection({ group, poStatusMap, supplierNames, onLineToggle }: {
  group: LineGroup
  poStatusMap: Map<string, WOLinePOStatus>
  supplierNames: Map<string, string>
  onLineToggle: (lineId: string, checked: boolean) => void
}) {
  return (
    <>
      <tr>
        <td colSpan={7} className="pt-3 pb-1">
          <span className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">{group.name}</span>
        </td>
      </tr>
      {group.lines.map((line) => (
        <LineRow
          key={line.id}
          line={line}
          poStatus={poStatusMap.get(line.id) ?? null}
          supplierName={line.supplier_id ? (supplierNames.get(line.supplier_id) ?? null) : null}
          onToggle={(checked) => onLineToggle(line.id, checked)}
        />
      ))}
    </>
  )
}

// ── Line Row ──────────────────────────────────────────────────────────────────

function LineRow({ line, poStatus, supplierName, onToggle }: {
  line: WorkOrderLine
  poStatus: WOLinePOStatus | null
  supplierName: string | null
  onToggle: (checked: boolean) => void
}) {
  const sentToPO = !!poStatus

  return (
    <tr className={`border-b border-border/50 transition-colors ${sentToPO ? 'opacity-60' : 'hover:bg-surface-hover'}`}>
      <td className="py-1.5 pr-2 w-7">
        <input
          type="checkbox"
          checked={line.include_on_po}
          disabled={sentToPO}
          onChange={(e) => onToggle(e.target.checked)}
          className="accent-accent cursor-pointer disabled:cursor-default"
        />
      </td>
      <td className="py-1.5 pr-3">
        <div className="font-medium text-text">{line.item || <span className="italic text-text-faint">Untitled</span>}</div>
        {line.item_code && <div className="text-[10px] font-mono text-text-muted mt-0.5">{line.item_code}</div>}
      </td>
      <td className="py-1.5 pr-3 text-text-muted max-w-[200px] truncate">{line.description || <span className="text-text-faint">—</span>}</td>
      <td className="py-1.5 pr-3 text-right tabular-nums text-text-muted">{line.qty}</td>
      <td className="py-1.5 pr-3 text-right tabular-nums text-text-muted">{formatCurrency(line.unit_cost)}</td>
      <td className="py-1.5 pr-3 text-text-muted">{supplierName ?? <span className="text-text-faint">—</span>}</td>
      <td className="py-1.5">
        {sentToPO ? (
          <Link href="/purchase-orders" className="inline-flex items-center gap-1 text-success text-[11px] font-medium hover:opacity-80 transition-opacity">
            <CheckCircle2 size={12} />{poStatus?.po_number || 'PO'}
          </Link>
        ) : (
          <span className="text-text-faint">—</span>
        )}
      </td>
    </tr>
  )
}

// ── Send to PO Modal ──────────────────────────────────────────────────────────

function SendToPOModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [lines, setLines] = useState<WOLineWithContext[]>([])
  const [draftPOs, setDraftPOs] = useState<Record<string, PurchaseOrder>>({})
  const [loading, setLoading] = useState(true)
  const [actions, setActions] = useState<Record<string, 'new' | 'existing'>>({})
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10))
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getIncludeOnPOLines(), getDraftPOsBySupplier()])
      .then(([l, d]) => {
        setLines(l)
        setDraftPOs(d)
        const initial: Record<string, 'new' | 'existing'> = {}
        for (const sid of [...new Set(l.map((x) => x.supplier_id).filter(Boolean) as string[])]) {
          initial[sid] = d[sid] ? 'existing' : 'new'
        }
        setActions(initial)
      })
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string | null, WOLineWithContext[]>()
    for (const line of lines) {
      const key = line.supplier_id ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(line)
    }
    return map
  }, [lines])

  const supplieredGroups = [...grouped.entries()].filter(([sid]) => sid !== null) as [string, WOLineWithContext[]][]
  const unsupplied = grouped.get(null) ?? []
  const canSend = supplieredGroups.length > 0

  async function handleSend() {
    setSending(true); setError(null)
    try {
      const assignments: POSendAssignment[] = supplieredGroups.map(([sid, grpLines]) => ({
        supplierId: sid,
        lineIds: grpLines.map((l) => l.id),
        action: actions[sid] ?? 'new',
        existingPoId: actions[sid] === 'existing' ? draftPOs[sid]?.id : undefined,
      }))
      const lineInputs = lines.filter((l) => l.supplier_id).map((l) => ({
        id: l.id,
        work_order_id: l.work_order_id,
        job_id: l.job_id,
        item_code: l.item_code,
        item: l.item,
        description: l.description,
        qty: l.qty,
        unit_cost: l.unit_cost,
      }))
      await sendWOLinesToPO(assignments, lineInputs, orderDate)
      onSent()
    } catch (e) {
      setError((e as Error).message || 'Failed to create purchase orders')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center gap-2 px-6 py-4 border-b border-border shrink-0">
          <ShoppingCart size={16} className="text-text-muted" />
          <h2 className="text-base font-semibold text-text">Send Lines to Purchase Orders</h2>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-text-subtle text-sm">Loading…</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-text-muted whitespace-nowrap">Order date</span>
              <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent" />
              <span className="text-xs text-text-faint">Applies to new POs only</span>
            </div>

            {supplieredGroups.length === 0 && (
              <p className="text-sm text-text-subtle text-center py-6">No lines with a supplier assigned. Set a supplier on lines before sending.</p>
            )}

            {supplieredGroups.map(([sid, grpLines]) => {
              const supplierName = grpLines[0].supplier_name ?? 'Unknown Supplier'
              const draft = draftPOs[sid]
              const action = actions[sid] ?? 'new'
              const total = grpLines.reduce((s, l) => s + l.qty * l.unit_cost, 0)

              return (
                <div key={sid} className="border border-border rounded-lg overflow-hidden">
                  {/* Supplier header */}
                  <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-surface-muted">
                    <div>
                      <span className="text-sm font-semibold text-text">{supplierName}</span>
                      <span className="ml-2 text-xs text-text-muted">
                        {grpLines.length} line{grpLines.length !== 1 ? 's' : ''} · {formatCurrency(total)}
                      </span>
                    </div>
                    {/* Toggle: add to existing draft vs new PO */}
                    <div className="flex text-[11px] shrink-0">
                      {draft && (
                        <button type="button"
                          onClick={() => setActions((p) => ({ ...p, [sid]: 'existing' }))}
                          className={`px-2.5 py-1 rounded-l-md border transition-colors ${action === 'existing' ? 'bg-success-bg text-success border-success-border font-medium' : 'bg-surface text-text-muted border-border hover:bg-surface-hover'}`}>
                          + Add to {draft.po_number}
                        </button>
                      )}
                      <button type="button"
                        onClick={() => setActions((p) => ({ ...p, [sid]: 'new' }))}
                        className={`px-2.5 py-1 border transition-colors ${draft ? 'rounded-r-md border-l-0' : 'rounded-md'} ${action === 'new' ? 'bg-accent text-accent-text border-transparent font-medium' : 'bg-surface text-text-muted border-border hover:bg-surface-hover'}`}>
                        + New PO
                      </button>
                    </div>
                  </div>

                  {/* Lines list */}
                  <div className="px-4 py-2 divide-y divide-border/50">
                    {grpLines.map((l) => (
                      <div key={l.id} className="flex items-center gap-2 py-1.5 text-xs">
                        <span className="font-mono text-[10px] text-text-faint w-16 shrink-0">{l.item_code || '—'}</span>
                        <span className="text-text flex-1 truncate">{l.item || 'Untitled'}</span>
                        <span className="text-text-muted tabular-nums shrink-0">{l.qty} × {formatCurrency(l.unit_cost)}</span>
                        {l.work_order_number && <span className="text-text-faint font-mono text-[10px] shrink-0">{l.work_order_number}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {unsupplied.length > 0 && (
              <div className="border border-warning-border rounded-lg bg-warning-bg/30 px-4 py-3">
                <p className="text-xs font-medium text-warning mb-1">
                  ⚠ {unsupplied.length} line{unsupplied.length !== 1 ? 's' : ''} with no supplier — will be skipped
                </p>
                {unsupplied.map((l) => (
                  <div key={l.id} className="text-xs text-text-muted">{l.item || 'Untitled'} × {l.qty}</div>
                ))}
              </div>
            )}

          </div>
        )}

        {error && <p className="px-6 pb-2 text-xs text-danger">{error}</p>}

        <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
          <button type="button" onClick={handleSend} disabled={sending || loading || !canSend}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors">
            <ShoppingCart size={14} />{sending ? 'Creating…' : 'Create Purchase Orders'}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 text-sm text-text-muted hover:text-text border border-border rounded-md hover:bg-surface-hover transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
