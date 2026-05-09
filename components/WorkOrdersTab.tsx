'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Plus, Trash2, Lock, Unlock, ChevronRight, Download, ShoppingCart, CheckCircle2, ArrowUpDown, MoreHorizontal, Calendar } from 'lucide-react'
import {
  WorkOrder, WorkOrderLine, LineGroup, LineStatusOption, WOLinePOStatus,
  WORK_ORDER_STATUSES,
  getWorkOrdersByJobId, createWorkOrder, updateWorkOrder, deleteWorkOrder,
  getWorkOrderLinesByWorkOrderId, createWorkOrderLine, updateWorkOrderLine, deleteWorkOrderLine,
  getQuoteItemsForImport, QuoteItemForImport,
  importQuoteItemsToWorkOrder, groupWorkOrderLines, getLineStatusOptions,
  generateWorkOrderNumber, getPOStatusForWOLines,
} from '@/lib/workOrders'
import {
  PurchaseOrder, PurchaseOrderLine, POSendAssignment,
  getDraftPOsBySupplier, sendWOLinesToPO, getPurchaseOrderLines, getPurchaseOrders,
} from '@/lib/purchaseOrders'
import { getAllSuppliers, Supplier } from '@/lib/suppliers'
import { stageBadgeStyles } from '@/lib/stageStyles'
import { getIssuesByJobId, Issue } from '@/lib/issues'
import { WorkOrderSequence, getWorkOrderSequences, getSequenceSteps } from '@/lib/workOrderSequences'
import {
  JobScheduleEventWithRelations, ScheduleEventStatus, SCHEDULE_STATUSES,
  updateScheduleEvent, createScheduleEvent, deleteScheduleEvent, getScheduleEventsByWorkOrderId,
} from '@/lib/jobSchedule'
import { Staff, getActiveStaff } from '@/lib/staff'
import { formatCurrency } from '@/lib/format'

const statusStyles: Record<string, string> = {
  'Draft':       'bg-surface-muted text-text-muted border-border',
  'Ready':       'bg-info-bg text-info border-info-border',
  'In Progress': 'bg-warning-bg text-warning border-warning-border',
  'Completed':   'bg-success-bg text-success border-success-border',
  'Cancelled':   'bg-surface-muted text-text-faint border-border',
}

// ── Main tab ─────────────────────────────────────────────────────────────────

export default function WorkOrdersTab({ jobId }: { jobId: string }) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const data = await getWorkOrdersByJobId(jobId)
    setWorkOrders(data)
    if (data.length > 0 && !selectedId) setSelectedId(data[0].id)
    setLoading(false)
  }, [jobId, selectedId])

  useEffect(() => { load() }, [load])

  async function handleNew() {
    setBusy(true)
    try {
      const work_order_number = await generateWorkOrderNumber(jobId)
      const wo = await createWorkOrder({ job_id: jobId, status: 'Draft', work_order_number })
      await load()
      setSelectedId(wo.id)
    } finally { setBusy(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this work order and all its lines? This cannot be undone.')) return
    await deleteWorkOrder(id)
    if (selectedId === id) setSelectedId(null)
    await load()
  }

  if (loading) return <p className="text-text-subtle text-sm">Loading...</p>

  const selected = workOrders.find((w) => w.id === selectedId) ?? null

  return (
    <div className="grid grid-cols-[14rem_1fr] gap-6 items-start">
      {/* Col 1: WO list */}
      <aside>
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-3">Work Orders</h3>
        <button type="button" onClick={handleNew} disabled={busy}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-accent-text bg-accent rounded-md hover:bg-accent-hover disabled:opacity-50 mb-3">
          <Plus size={12} /> New Work Order
        </button>

        <ul className="space-y-1">
          {workOrders.length === 0 ? (
            <li className="text-text-subtle text-xs italic px-2 py-3">No work orders yet.</li>
          ) : workOrders.map((wo) => {
            const isSelected = selectedId === wo.id
            return (
              <li key={wo.id}>
                <button type="button" onClick={() => setSelectedId(wo.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${isSelected ? 'bg-accent text-accent-text' : 'hover:bg-surface-hover text-text'}`}>
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-accent-text/70' : 'text-text-subtle'}`}>
                      {wo.work_order_number || 'WO —'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${isSelected ? 'bg-surface text-text border-border' : statusStyles[wo.status] || ''}`}>
                      {wo.status}
                    </span>
                  </div>
                  <div className="text-xs truncate">{wo.title || <span className="italic opacity-50">Untitled</span>}</div>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      {/* Col 2: WO header details */}
      <div>
        {selected ? (
          <WorkOrderDetails
            key={selected.id}
            workOrder={selected}
            onUpdate={async (patch) => { await updateWorkOrder(selected.id, patch); await load() }}
            onDelete={() => handleDelete(selected.id)}
          />
        ) : (
          <div className="text-center py-16 text-text-subtle text-sm">Select a work order or create a new one.</div>
        )}
      </div>

      {/* Row 2: tab card spans both columns */}
      {selected && (
        <div className="col-span-2">
          <WorkOrderTabs
            key={selected.id}
            workOrder={selected}
            jobId={jobId}
            onUpdate={async (patch) => { await updateWorkOrder(selected.id, patch); await load() }}
          />
        </div>
      )}
    </div>
  )
}

// ── Work Order Details (header) ───────────────────────────────────────────────

function WorkOrderDetails({ workOrder, onUpdate, onDelete }: {
  workOrder: WorkOrder
  onUpdate: (patch: Partial<WorkOrder>) => Promise<void>
  onDelete: () => void
}) {
  const [sequences, setSequences] = useState<WorkOrderSequence[]>([])
  const [showActions, setShowActions] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => { getWorkOrderSequences().then(setSequences) }, [])

  useEffect(() => {
    if (!showActions) return
    function handler(e: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setShowActions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showActions])

  function blurSave(field: keyof WorkOrder) {
    return (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = e.target.value
      onUpdate({ [field]: val === '' ? null : val })
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-2">
          <Label>WO Number</Label>
          <input type="text" defaultValue={workOrder.work_order_number || ''} onBlur={blurSave('work_order_number')} placeholder="WO-001" className={inputCls} />
        </div>
        <div className="col-span-5">
          <Label>Title</Label>
          <input type="text" defaultValue={workOrder.title || ''} onBlur={blurSave('title')} placeholder="Work order title" className={inputCls} />
        </div>
        <div className="col-span-3">
          <Label>Status</Label>
          <select defaultValue={workOrder.status} onChange={(e) => onUpdate({ status: e.target.value as WorkOrder['status'] })} className={inputCls}>
            {WORK_ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-span-2 flex flex-col justify-end">
          <div className="relative" ref={actionsRef}>
            <button
              type="button"
              onClick={() => setShowActions((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md border border-border-strong bg-surface text-text-muted hover:bg-surface-hover transition-colors"
            >
              <MoreHorizontal size={14} /> Actions
            </button>
            {showActions && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-lg shadow-lg z-20 py-1 text-sm">
                <button
                  type="button"
                  onClick={() => { onUpdate({ is_locked: !workOrder.is_locked }); setShowActions(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-hover text-text-muted"
                >
                  {workOrder.is_locked ? <Unlock size={13} /> : <Lock size={13} />}
                  {workOrder.is_locked ? 'Unlock work order' : 'Lock work order'}
                </button>
                <div className="border-t border-border my-1" />
                <button
                  type="button"
                  onClick={() => { setShowActions(false); onDelete() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-hover text-danger"
                >
                  <Trash2 size={13} /> Delete work order
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-3">
          <Label>Scheduled Start</Label>
          <input type="date" defaultValue={workOrder.scheduled_start?.slice(0, 10) || ''} onBlur={blurSave('scheduled_start')} className={inputCls} />
        </div>
        <div className="col-span-3">
          <Label>Scheduled End</Label>
          <input type="date" defaultValue={workOrder.scheduled_end?.slice(0, 10) || ''} onBlur={blurSave('scheduled_end')} className={inputCls} />
        </div>
        <div className="col-span-2">
          <Label>Revision</Label>
          <input type="number" defaultValue={workOrder.revision_number} min={1} onBlur={(e) => onUpdate({ revision_number: parseInt(e.target.value) || 1 })} className={inputCls} />
        </div>
        <div className="col-span-4">
          <Label>Event Sequence</Label>
          <select value={workOrder.sequence_id || ''} onChange={(e) => onUpdate({ sequence_id: e.target.value || null })} className={inputCls}>
            <option value="">— None —</option>
            {sequences.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <Label>Notes</Label>
        <textarea defaultValue={workOrder.notes || ''} onBlur={blurSave('notes')} rows={2} placeholder="Notes..." className={inputCls + ' resize-none w-full'} />
      </div>
    </div>
  )
}

// ── Work Order Tabs (items + events) ──────────────────────────────────────────

function WorkOrderTabs({ workOrder, jobId, onUpdate }: {
  workOrder: WorkOrder
  jobId: string
  onUpdate: (patch: Partial<WorkOrder>) => Promise<void>
}) {
  const [activeTab, setActiveTab] = useState<'items' | 'events'>('items')
  const [lines, setLines] = useState<WorkOrderLine[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [statusOptions, setStatusOptions] = useState<LineStatusOption[]>([])
  const [poStatusMap, setPoStatusMap] = useState<Map<string, WOLinePOStatus>>(new Map())
  const [loadingLines, setLoadingLines] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showPOModal, setShowPOModal] = useState(false)
  const [viewingPoId, setViewingPoId] = useState<string | null>(null)
  const [events, setEvents] = useState<JobScheduleEventWithRelations[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [resorting, setResorting] = useState(false)

  const loadLines = useCallback(async () => {
    const [l, s, opts] = await Promise.all([
      getWorkOrderLinesByWorkOrderId(workOrder.id),
      getAllSuppliers(),
      getLineStatusOptions(),
    ])
    setLines(l)
    setSuppliers(s)
    setStatusOptions(opts)
    setLoadingLines(false)
    getPOStatusForWOLines(l.map((x) => x.id)).then(setPoStatusMap)
  }, [workOrder.id])

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true)
    const [evts, staffList] = await Promise.all([
      getScheduleEventsByWorkOrderId(workOrder.id),
      getActiveStaff(),
    ])
    setEvents(evts)
    setStaff(staffList)
    setLoadingEvents(false)
  }, [workOrder.id])

  useEffect(() => { loadLines() }, [loadLines])
  useEffect(() => { if (activeTab === 'events') loadEvents() }, [activeTab, loadEvents])

  async function handleResort() {
    if (!workOrder.sequence_id) return
    setResorting(true)
    try {
      const [steps, evts] = await Promise.all([
        getSequenceSteps(workOrder.sequence_id),
        getScheduleEventsByWorkOrderId(workOrder.id),
      ])
      const stepIndex = new Map(steps.map((s) => [s.task_name.toLowerCase(), s.sort]))
      const matched = evts
        .filter((e) => stepIndex.has((e.trade_type || '').toLowerCase()))
        .sort((a, b) => {
          const sa = stepIndex.get((a.trade_type || '').toLowerCase()) ?? 9999
          const sb = stepIndex.get((b.trade_type || '').toLowerCase()) ?? 9999
          return sa - sb
        })
      const unmatched = evts.filter((e) => !stepIndex.has((e.trade_type || '').toLowerCase()))
      await Promise.all([...matched, ...unmatched].map((e, i) => updateScheduleEvent(e.id, { sort: i + 1 })))
      await loadEvents()
    } finally {
      setResorting(false)
    }
  }

  async function handleUpdateLine(id: string, patch: Partial<WorkOrderLine>) {
    await updateWorkOrderLine(id, patch)
    await loadLines()
  }

  async function handleUpdateGroupStatus(groupName: string, patch: { stage: string; status: string }) {
    const groupLines = lines.filter((l) => (l.group_name || 'Other') === groupName)
    await Promise.all(groupLines.map((l) => updateWorkOrderLine(l.id, patch)))
    await loadLines()
  }

  async function handleToggleGroupPO(groupName: string, value: boolean) {
    const groupLines = lines.filter((l) => (l.group_name || 'Other') === groupName && !poStatusMap.has(l.id))
    await Promise.all(groupLines.map((l) => updateWorkOrderLine(l.id, { include_on_po: value })))
    await loadLines()
  }

  async function handleDeleteLine(id: string) {
    await deleteWorkOrderLine(id)
    await loadLines()
  }

  async function handleAddLine() {
    await createWorkOrderLine({ work_order_id: workOrder.id, item: '', qty: 1, unit_cost: 0, group_name: null })
    await loadLines()
  }

  async function handleAddEvent() {
    await createScheduleEvent({
      job_id: jobId,
      work_order_id: workOrder.id,
      title: '',
      status: 'Unscheduled',
      sort: events.length + 1,
    })
    await loadEvents()
  }

  async function handleUpdateEvent(id: string, patch: Partial<JobScheduleEventWithRelations>) {
    await updateScheduleEvent(id, patch)
    await loadEvents()
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm('Delete this schedule event?')) return
    await deleteScheduleEvent(id)
    await loadEvents()
  }

  const groups = groupWorkOrderLines(lines)
  const grandTotal = lines.reduce((s, l) => s + (l.qty || 0) * (l.unit_cost || 0), 0)
  const tickedLines = lines.filter((l) => l.include_on_po && !poStatusMap.has(l.id))

  return (
    <div>

        {/* Tab bar */}
        <div className="flex items-end gap-1 px-2">
          {(['items', 'events'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-2.5 text-sm rounded-t-md border transition-colors ${
                activeTab === tab
                  ? 'bg-surface border-border border-b-surface text-text font-medium z-10 -mb-px'
                  : 'bg-surface-muted border-transparent text-text-muted hover:text-text hover:bg-surface-hover'
              }`}
            >
              {tab === 'items' ? 'Items' : 'Work Order Events'}
            </button>
          ))}
          {workOrder.is_locked && (
            <span className="ml-3 flex items-center gap-1 text-[10px] text-warning font-medium pb-2">
              <Lock size={10} /> Locked
            </span>
          )}
        </div>

        {/* Tab content */}
        <div className="bg-surface border border-border rounded-lg rounded-tl-none p-4">

          {/* ── Items tab ── */}
          {activeTab === 'items' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Items</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-1.5 text-xs text-text-muted bg-surface border border-border-strong px-3 py-1.5 rounded-md hover:bg-surface-hover transition-colors">
                  <Download size={12} /> Import from Quote
                </button>
                <button type="button" onClick={handleAddLine}
                  className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover transition-colors">
                  <Plus size={12} /> Add Line
                </button>
              </div>
            </div>

            {loadingLines ? (
              <p className="text-text-subtle text-sm">Loading...</p>
            ) : lines.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg py-12 text-center">
                <p className="text-text-subtle text-sm mb-3">No items yet.</p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => setShowImportModal(true)} className="text-sm text-text underline hover:no-underline">Import from quote</button>
                  <span className="text-text-faint">or</span>
                  <button onClick={handleAddLine} className="text-sm text-text underline hover:no-underline">add a line manually</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <ItemGroup
                    key={group.name}
                    group={group}
                    suppliers={suppliers}
                    statusOptions={statusOptions}
                    poStatusMap={poStatusMap}
                    onUpdateLine={handleUpdateLine}
                    onDeleteLine={handleDeleteLine}
                    onUpdateGroupStatus={(patch) => handleUpdateGroupStatus(group.name, patch)}
                    onToggleGroupPO={(value) => handleToggleGroupPO(group.name, value)}
                    onViewPO={setViewingPoId}
                  />
                ))}

                <div className="flex justify-end gap-8 pt-3 border-t border-border text-sm">
                  <div className="text-right space-y-0.5">
                    <div className="flex justify-between gap-12 text-xs text-text-muted">
                      <span>Subtotal (ex GST)</span><span>{formatCurrency(grandTotal)}</span>
                    </div>
                    <div className="flex justify-between gap-12 text-xs text-text-muted">
                      <span>GST (10%)</span><span>{formatCurrency(grandTotal * 0.1)}</span>
                    </div>
                    <div className="flex justify-between gap-12 font-semibold text-text">
                      <span>Total (inc GST)</span><span>{formatCurrency(grandTotal * 1.1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Create PO button */}
            {lines.length > 0 && (
              <div className="pt-4 border-t border-border">
                <button type="button" disabled={tickedLines.length === 0} onClick={() => setShowPOModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ShoppingCart size={14} />
                  Create Purchase Orders
                  {tickedLines.length > 0 && (
                    <span className="ml-1 bg-accent-hover text-accent-text px-1.5 py-0.5 rounded text-[11px]">
                      {tickedLines.length} line{tickedLines.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>
                {tickedLines.length === 0 && (
                  <p className="mt-1.5 text-xs text-text-subtle">Check &quot;Send to PO&quot; on lines to enable.</p>
                )}
              </div>
            )}
          </div>
          )}

          {/* ── Work Order Events tab ── */}
          {activeTab === 'events' && (() => {
            // Compute date errors: flag any event whose date is earlier than the previous dated event
            const dateErrors = new Set<string>()
            let prevDate: string | null = null
            for (const event of events) {
              if (!event.scheduled_date) continue
              if (prevDate && event.scheduled_date < prevDate) dateErrors.add(event.id)
              prevDate = event.scheduled_date
            }
            return (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Work Order Events</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleResort}
                    disabled={!workOrder.sequence_id || resorting}
                    title={workOrder.sequence_id ? 'Re-sort events by the assigned sequence' : 'Assign an Event Sequence above first'}
                    className="flex items-center gap-1.5 text-xs text-text-muted bg-surface border border-border-strong px-3 py-1.5 rounded-md hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowUpDown size={12} /> {resorting ? 'Re-sorting…' : 'Re-sort by Sequence'}
                  </button>
                  <button type="button" onClick={handleAddEvent}
                    className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover transition-colors">
                    <Plus size={12} /> Add Event
                  </button>
                </div>
              </div>

              {loadingEvents ? (
                <p className="text-text-subtle text-sm">Loading…</p>
              ) : events.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg py-12 text-center">
                  <Calendar size={24} className="mx-auto text-text-faint mb-3" />
                  <p className="text-text-subtle text-sm mb-1">No events linked to this work order.</p>
                  <p className="text-text-faint text-xs">Add events manually or import labour from a quote on the Schedule tab.</p>
                </div>
              ) : (
                <div className="border border-border rounded-md overflow-x-auto">
                  <table className="w-full text-xs border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border bg-surface-muted">
                        <WOETh>Item Name</WOETh>
                        <WOETh>Task</WOETh>
                        <WOETh>Date</WOETh>
                        <WOETh>Staff</WOETh>
                        <WOETh right>Est. Hrs</WOETh>
                        <WOETh right>Actual Hrs</WOETh>
                        <WOETh>Status</WOETh>
                        <WOETh />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {events.map((event) => (
                        <WOEventRow
                          key={event.id}
                          event={event}
                          staff={staff}
                          hasDateError={dateErrors.has(event.id)}
                          onUpdate={(patch) => handleUpdateEvent(event.id, patch)}
                          onDelete={() => handleDeleteEvent(event.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            )
          })()}

        </div>

      {viewingPoId && (
        <POPreviewModal poId={viewingPoId} onClose={() => setViewingPoId(null)} />
      )}

      {showImportModal && (
        <ImportQuoteModal jobId={jobId} workOrderId={workOrder.id}
          onClose={() => setShowImportModal(false)} onImported={loadLines} />
      )}

      {showPOModal && (
        <SendToPOModal
          tickedLines={tickedLines}
          suppliers={suppliers}
          jobId={jobId}
          onClose={() => setShowPOModal(false)}
          onSent={async () => { setShowPOModal(false); await loadLines() }}
        />
      )}
    </div>
  )
}

// ── Work Order Event Row ───────────────────────────────────────────────────────

const woEventStatusStyles: Record<string, string> = {
  'Unscheduled': 'bg-surface-muted text-text-muted border-border',
  'Scheduled':   'bg-info-bg text-info border-info-border',
  'In Progress': 'bg-warning-bg text-warning border-warning-border',
  'Completed':   'bg-success-bg text-success border-success-border',
  'Cancelled':   'bg-surface-muted text-text-faint border-border',
}

function WOEventRow({
  event,
  staff,
  hasDateError,
  onUpdate,
  onDelete,
}: {
  event: JobScheduleEventWithRelations
  staff: Staff[]
  hasDateError: boolean
  onUpdate: (patch: Partial<JobScheduleEventWithRelations>) => void
  onDelete: () => void
}) {
  const blurText = (field: string) =>
    (e: React.FocusEvent<HTMLInputElement>) => onUpdate({ [field]: e.target.value || null })

  const blurNum = (field: string) =>
    (e: React.FocusEvent<HTMLInputElement>) => onUpdate({ [field]: parseFloat(e.target.value) || null })

  return (
    <tr className="hover:bg-surface-hover group">
      <td className="px-1 py-0 min-w-[140px]">
        <input type="text" defaultValue={event.title || ''} onBlur={blurText('title')}
          placeholder="Item name" className={woeCellCls} />
      </td>
      <td className="px-1 py-0 min-w-[100px]">
        <input type="text" defaultValue={event.trade_type || ''} onBlur={blurText('trade_type')}
          placeholder="Task" className={woeCellCls} />
      </td>
      <td className="px-1 py-0 w-32">
        <input type="date" defaultValue={event.scheduled_date || ''}
          onBlur={(e) => {
            const date = e.target.value || null
            const patch: Partial<JobScheduleEventWithRelations> = { scheduled_date: date }
            if (date && event.status === 'Unscheduled') patch.status = 'Scheduled'
            onUpdate(patch)
          }}
          title={hasDateError ? 'This date is earlier than the preceding step' : undefined}
          className={woeCellCls + (hasDateError ? ' !border-danger-border !bg-danger-bg !text-danger' : '')} />
      </td>
      <td className="px-1 py-0 min-w-[120px]">
        <select defaultValue={event.staff_id || ''} onChange={(e) => onUpdate({ staff_id: e.target.value || null })}
          className={woeCellCls}>
          <option value="">— Unassigned —</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}
        </select>
      </td>
      <td className="px-1 py-0 w-20">
        <input type="number" defaultValue={event.estimated_hours ?? ''} onBlur={blurNum('estimated_hours')}
          min={0} step={0.5} placeholder="—" className={woeCellCls + ' text-right'} />
      </td>
      <td className="px-1 py-0 w-20">
        <input type="number" defaultValue={event.actual_hours ?? ''} onBlur={blurNum('actual_hours')}
          min={0} step={0.5} placeholder="—" className={woeCellCls + ' text-right'} />
      </td>
      <td className="px-1 py-0 w-28">
        <select value={event.status} onChange={(e) => onUpdate({ status: e.target.value as ScheduleEventStatus })}
          className={`w-full text-[11px] rounded px-1.5 py-1 border font-medium focus:outline-none focus:border-accent ${woEventStatusStyles[event.status] || ''}`}>
          {SCHEDULE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td className="px-2 py-0 w-8 text-center">
        <button type="button" onClick={onDelete}
          className="text-text-faint hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}

function WOETh({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={`py-1.5 px-2 text-[10px] uppercase tracking-widest font-medium text-text-subtle whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
}

const woeCellCls = 'w-full px-1.5 py-1 text-xs bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none'

// ── Send to PO Modal ──────────────────────────────────────────────────────────

function SendToPOModal({ tickedLines, suppliers, jobId, onClose, onSent }: {
  tickedLines: WorkOrderLine[]
  suppliers: Supplier[]
  jobId: string
  onClose: () => void
  onSent: () => void
}) {
  const [draftPOs, setDraftPOs] = useState<Record<string, PurchaseOrder>>({})
  const [loading, setLoading] = useState(true)
  const [actions, setActions] = useState<Record<string, 'new' | 'existing'>>({})
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10))
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s.company_name])), [suppliers])

  useEffect(() => {
    getDraftPOsBySupplier().then((d) => {
      setDraftPOs(d)
      const initial: Record<string, 'new' | 'existing'> = {}
      const sids = [...new Set(tickedLines.map((l) => l.supplier_id).filter(Boolean) as string[])]
      for (const sid of sids) initial[sid] = d[sid] ? 'existing' : 'new'
      setActions(initial)
      setLoading(false)
    })
  }, [tickedLines])

  const grouped = useMemo(() => {
    const map = new Map<string | null, WorkOrderLine[]>()
    for (const line of tickedLines) {
      const key = line.supplier_id ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(line)
    }
    return map
  }, [tickedLines])

  const supplieredGroups = [...grouped.entries()].filter(([sid]) => sid !== null) as [string, WorkOrderLine[]][]
  const unsupplied = grouped.get(null) ?? []

  async function handleSend() {
    setSending(true); setError(null)
    try {
      const assignments: POSendAssignment[] = supplieredGroups.map(([sid, grpLines]) => ({
        supplierId: sid,
        lineIds: grpLines.map((l) => l.id),
        action: actions[sid] ?? 'new',
        existingPoId: actions[sid] === 'existing' ? draftPOs[sid]?.id : undefined,
      }))
      const lineInputs = tickedLines.filter((l) => l.supplier_id).map((l) => ({
        id: l.id,
        work_order_id: l.work_order_id,
        job_id: jobId,
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
              <p className="text-sm text-text-subtle text-center py-6">No ticked lines have a supplier. Assign suppliers before sending.</p>
            )}

            {supplieredGroups.map(([sid, grpLines]) => {
              const supplierName = supplierMap.get(sid) ?? 'Unknown Supplier'
              const draft = draftPOs[sid]
              const action = actions[sid] ?? 'new'
              const total = grpLines.reduce((s, l) => s + l.qty * l.unit_cost, 0)

              return (
                <div key={sid} className="border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-surface-muted">
                    <div>
                      <span className="text-sm font-semibold text-text">{supplierName}</span>
                      <span className="ml-2 text-xs text-text-muted">
                        {grpLines.length} line{grpLines.length !== 1 ? 's' : ''} · {formatCurrency(total)}
                      </span>
                    </div>
                    <div className="flex text-[11px] shrink-0">
                      {draft && (
                        <button type="button" onClick={() => setActions((p) => ({ ...p, [sid]: 'existing' }))}
                          className={`px-2.5 py-1 rounded-l-md border transition-colors ${action === 'existing' ? 'bg-success-bg text-success border-success-border font-medium' : 'bg-surface text-text-muted border-border hover:bg-surface-hover'}`}>
                          + Add to {draft.po_number}
                        </button>
                      )}
                      <button type="button" onClick={() => setActions((p) => ({ ...p, [sid]: 'new' }))}
                        className={`px-2.5 py-1 border transition-colors ${draft ? 'rounded-r-md border-l-0' : 'rounded-md'} ${action === 'new' ? 'bg-accent text-accent-text border-transparent font-medium' : 'bg-surface text-text-muted border-border hover:bg-surface-hover'}`}>
                        + New PO
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-2 divide-y divide-border/50">
                    {grpLines.map((l) => (
                      <div key={l.id} className="flex items-center gap-2 py-1.5 text-xs">
                        <span className="font-mono text-[10px] text-text-faint w-16 shrink-0">{l.item_code || '—'}</span>
                        <span className="text-text flex-1 truncate">{l.item || 'Untitled'}</span>
                        <span className="text-text-muted tabular-nums shrink-0">{l.qty} × {formatCurrency(l.unit_cost)}</span>
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
          <button type="button" onClick={handleSend} disabled={sending || loading || supplieredGroups.length === 0}
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

// ── Item Group (expandable) ───────────────────────────────────────────────────

function ItemGroup({ group, suppliers, statusOptions, poStatusMap, onUpdateLine, onDeleteLine, onUpdateGroupStatus, onToggleGroupPO, onViewPO }: {
  group: LineGroup
  suppliers: Supplier[]
  statusOptions: LineStatusOption[]
  poStatusMap: Map<string, WOLinePOStatus>
  onUpdateLine: (id: string, patch: Partial<WorkOrderLine>) => void
  onDeleteLine: (id: string) => void
  onUpdateGroupStatus: (patch: { stage: string; status: string }) => void
  onToggleGroupPO: (value: boolean) => void
  onViewPO: (poId: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const checkboxRef = useRef<HTMLInputElement>(null)

  const unsentLines = group.lines.filter((l) => !poStatusMap.has(l.id))
  const allChecked  = unsentLines.length > 0 && unsentLines.every((l) => l.include_on_po)
  const someChecked = unsentLines.some((l) => l.include_on_po)
  const sentCount   = group.lines.filter((l) => poStatusMap.has(l.id)).length
  const poCount     = group.lines.filter((l) => l.include_on_po && !poStatusMap.has(l.id)).length

  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = someChecked && !allChecked
  }, [someChecked, allChecked])

  const firstLine = group.lines[0]
  const currentStage = firstLine?.stage || 'Admin'
  const currentStatus = firstLine?.status || 'Not Started'
  const stages = Array.from(new Set(statusOptions.map((o) => o.stage)))
  const currentOptionId = statusOptions.find((o) => o.stage === currentStage && o.status === currentStatus)?.id || ''

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-muted">
        <input ref={checkboxRef} type="checkbox" checked={allChecked}
          onChange={() => onToggleGroupPO(!allChecked)}
          title={allChecked ? 'Deselect all for PO' : 'Select all for PO'}
          disabled={unsentLines.length === 0}
          className="accent-accent shrink-0 cursor-pointer disabled:cursor-default" />

        <button type="button" onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-70 transition-opacity">
          <ChevronRight size={14} className={`text-text-subtle shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          <span className="text-sm font-medium text-text truncate">{group.name}</span>
          <span className="text-xs text-text-muted shrink-0">{group.lines.length} line{group.lines.length !== 1 ? 's' : ''}</span>
          {sentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0">
              <CheckCircle2 size={10} />{sentCount} sent to PO
            </span>
          )}
          {poCount > 0 && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-accent text-accent-text shrink-0">
              {poCount} on PO
            </span>
          )}
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium leading-tight ${stageBadgeStyles[currentStage] || 'bg-surface-muted text-text-muted'}`}>
            {currentStage}
          </span>
          <select value={currentOptionId}
            onChange={(e) => {
              const opt = statusOptions.find((o) => o.id === e.target.value)
              if (opt) onUpdateGroupStatus({ stage: opt.stage, status: opt.status })
            }}
            className="text-xs bg-surface border border-border-strong rounded px-2 py-1 focus:outline-none focus:border-accent text-text">
            {stages.map((stage) => (
              <optgroup key={stage} label={stage}>
                {statusOptions.filter((o) => o.stage === stage).map((o) => (
                  <option key={o.id} value={o.id}>{o.status}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <span className="text-sm font-semibold text-text shrink-0">{formatCurrency(group.total)}</span>
      </div>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface">
                <Th center>PO</Th>
                <Th>Item</Th>
                <Th>Description</Th>
                <Th>Code</Th>
                <Th>Supplier</Th>
                <Th right>Qty</Th>
                <Th right>Unit Cost</Th>
                <Th right>Total</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {group.lines.map((line) => (
                <LineRow key={line.id} line={line} suppliers={suppliers}
                  poStatus={poStatusMap.get(line.id) ?? null}
                  onUpdate={(patch) => onUpdateLine(line.id, patch)}
                  onDelete={() => onDeleteLine(line.id)}
                  onViewPO={onViewPO} />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-surface-muted">
                <td colSpan={7} className="py-1.5 px-3 text-right text-xs text-text-muted">Group total (ex GST)</td>
                <td className="py-1.5 pr-3 text-right text-xs font-semibold text-text">{formatCurrency(group.total)}</td>
                <td colSpan={1} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Line Row ──────────────────────────────────────────────────────────────────

function LineRow({ line, suppliers, poStatus, onUpdate, onDelete, onViewPO }: {
  line: WorkOrderLine
  suppliers: Supplier[]
  poStatus: WOLinePOStatus | null
  onUpdate: (patch: Partial<WorkOrderLine>) => void
  onDelete: () => void
  onViewPO: (poId: string) => void
}) {
  const total = (line.qty || 0) * (line.unit_cost || 0)
  const locked = !!poStatus

  const blurText = (field: keyof WorkOrderLine) =>
    (e: React.FocusEvent<HTMLInputElement>) => { if (!locked) onUpdate({ [field]: e.target.value || null }) }

  const blurNum = (field: keyof WorkOrderLine) =>
    (e: React.FocusEvent<HTMLInputElement>) => { if (!locked) onUpdate({ [field]: parseFloat(e.target.value) || 0 }) }

  return (
    <tr className={`border-b border-border group ${locked ? 'bg-emerald-50/40' : 'hover:bg-surface-hover'}`}>
      <td className="px-2 py-1 text-center w-10">
        {locked ? (
          <button type="button" onClick={() => onViewPO(poStatus!.purchase_order_id)}
            title={`View ${poStatus!.po_number || 'PO'}`}
            className="inline-flex items-center justify-center text-success hover:opacity-80 transition-opacity">
            <CheckCircle2 size={14} />
          </button>
        ) : (
          <input type="checkbox" checked={line.include_on_po}
            onChange={(e) => onUpdate({ include_on_po: e.target.checked })}
            title="Send to Purchase Order" className="accent-accent" />
        )}
      </td>
      <td className="px-1 py-1 min-w-[120px]">
        {locked
          ? <span className="px-1.5 text-xs text-text-muted">{line.item || '—'}</span>
          : <input type="text" defaultValue={line.item || ''} onBlur={blurText('item')} placeholder="Item" className={cellCls} />}
      </td>
      <td className="px-1 py-1 min-w-[220px]">
        {locked
          ? <span className="px-1.5 text-xs text-text-subtle">{line.description || '—'}</span>
          : <input type="text" defaultValue={line.description || ''} onBlur={blurText('description')} placeholder="Description" className={cellCls} />}
      </td>
      <td className="px-1 py-1 w-20">
        {locked
          ? <span className="px-1.5 text-xs font-mono text-text-muted">{line.item_code || '—'}</span>
          : <input type="text" defaultValue={line.item_code || ''} onBlur={blurText('item_code')} placeholder="Code" className={cellCls} />}
      </td>
      <td className="px-1 py-1 min-w-[120px]">
        {locked
          ? <span className="px-1.5 text-xs text-text-muted">{suppliers.find((s) => s.id === line.supplier_id)?.company_name || '—'}</span>
          : <select defaultValue={line.supplier_id || ''} onChange={(e) => onUpdate({ supplier_id: e.target.value || null })} className={cellCls}>
              <option value="">—</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
            </select>}
      </td>
      <td className="px-1 py-1 w-16">
        {locked
          ? <span className="px-1.5 text-xs text-text-muted text-right block">{line.qty}</span>
          : <input type="number" defaultValue={line.qty} onBlur={blurNum('qty')} min={0} className={cellCls + ' text-right'} />}
      </td>
      <td className="px-1 py-1 w-24">
        {locked
          ? <span className="px-1.5 text-xs text-text-muted text-right block">{formatCurrency(line.unit_cost)}</span>
          : <input type="number" defaultValue={line.unit_cost} onBlur={blurNum('unit_cost')} min={0} step={0.01} className={cellCls + ' text-right'} />}
      </td>
      <td className="px-2 py-1 w-24 text-right text-text font-medium">{formatCurrency(total)}</td>
      <td className="px-2 py-1 w-8 text-center">
        {!locked && (
          <button type="button" onClick={onDelete} className="text-text-faint hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 size={13} />
          </button>
        )}
      </td>
    </tr>
  )
}

// ── PO Preview Modal ──────────────────────────────────────────────────────────

function POPreviewModal({ poId, onClose }: { poId: string; onClose: () => void }) {
  const [po, setPo] = useState<PurchaseOrder | null>(null)
  const [lines, setLines] = useState<PurchaseOrderLine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getPurchaseOrders(), getPurchaseOrderLines(poId)]).then(([allPos, poLines]) => {
      setPo(allPos.find((p) => p.id === poId) ?? null)
      setLines(poLines)
      setLoading(false)
    })
  }, [poId])

  const subtotal = lines.reduce((s, l) => s + (l.qty || 0) * (l.unit_cost || 0), 0)

  const statusColour: Record<string, string> = {
    'Draft':         'bg-gray-100 text-gray-500',
    'Sent':          'bg-blue-100 text-blue-700',
    'Confirmed':     'bg-emerald-100 text-emerald-700',
    'Part Received': 'bg-amber-100 text-amber-700',
    'Received':      'bg-emerald-100 text-emerald-700',
    'Cancelled':     'bg-red-50 text-red-400',
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <ShoppingCart size={16} className="text-text-muted" />
            <h2 className="text-base font-semibold text-text">
              {po?.po_number || 'Purchase Order'}
            </h2>
            {po && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColour[po.status] || ''}`}>
                {po.status}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text text-lg leading-none">×</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-text-subtle text-sm">Loading…</p>
          </div>
        ) : !po ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-text-subtle text-sm">Purchase order not found.</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
            {/* Meta */}
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-text-subtle mb-0.5">Supplier</p>
                <p className="text-text font-medium">{po.supplier_name || '—'}</p>
              </div>
              <div>
                <p className="text-text-subtle mb-0.5">Order Date</p>
                <p className="text-text">{po.order_date || '—'}</p>
              </div>
              <div>
                <p className="text-text-subtle mb-0.5">Required By</p>
                <p className="text-text">{po.required_by || '—'}</p>
              </div>
            </div>

            {/* Lines */}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-1.5 px-2 text-left text-[10px] uppercase tracking-widest text-text-subtle font-medium">Item</th>
                  <th className="py-1.5 px-2 text-left text-[10px] uppercase tracking-widest text-text-subtle font-medium">Code</th>
                  <th className="py-1.5 px-2 text-right text-[10px] uppercase tracking-widest text-text-subtle font-medium">Qty</th>
                  <th className="py-1.5 px-2 text-right text-[10px] uppercase tracking-widest text-text-subtle font-medium">Unit</th>
                  <th className="py-1.5 px-2 text-right text-[10px] uppercase tracking-widest text-text-subtle font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-surface-hover">
                    <td className="py-1.5 px-2 text-text">{l.item || '—'}</td>
                    <td className="py-1.5 px-2 font-mono text-text-muted">{l.item_code || '—'}</td>
                    <td className="py-1.5 px-2 text-right text-text-muted">{l.qty}</td>
                    <td className="py-1.5 px-2 text-right text-text-muted">{formatCurrency(l.unit_cost)}</td>
                    <td className="py-1.5 px-2 text-right text-text font-medium">{formatCurrency(l.qty * l.unit_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="space-y-0.5 text-xs">
                <div className="flex justify-between gap-12 text-text-muted">
                  <span>Subtotal (ex GST)</span><span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between gap-12 text-text-muted">
                  <span>GST (10%)</span><span>{formatCurrency(subtotal * 0.1)}</span>
                </div>
                <div className="flex justify-between gap-12 font-semibold text-text">
                  <span>Total (inc GST)</span><span>{formatCurrency(subtotal * 1.1)}</span>
                </div>
              </div>
            </div>

            {po.notes && (
              <div className="text-xs text-text-muted border-t border-border pt-3">
                <span className="font-medium text-text-subtle">Notes: </span>{po.notes}
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-text-muted border border-border rounded-md hover:bg-surface-hover transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Import Quote Modal ────────────────────────────────────────────────────────

function ImportQuoteModal({ jobId, workOrderId, onClose, onImported }: {
  jobId: string
  workOrderId: string
  onClose: () => void
  onImported: () => Promise<void>
}) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [quoteItems, setQuoteItems] = useState<QuoteItemForImport[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [loadingItems, setLoadingItems] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    getIssuesByJobId(jobId).then((data) => {
      setIssues(data)
      if (data.length === 1) setSelectedIssueId(data[0].id)
    })
  }, [jobId])

  useEffect(() => {
    if (!selectedIssueId) return
    setLoadingItems(true)
    setSelectedItemIds(new Set())
    getQuoteItemsForImport(selectedIssueId).then((items) => {
      setQuoteItems(items)
      setSelectedItemIds(new Set(items.map((i) => i.id)))
      setLoadingItems(false)
    })
  }, [selectedIssueId])

  function toggleItem(id: string) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleImport() {
    if (!selectedIssueId || selectedItemIds.size === 0) return
    setImporting(true)
    try {
      await importQuoteItemsToWorkOrder(workOrderId, selectedIssueId, Array.from(selectedItemIds))
      await onImported()
      onClose()
    } catch (e) {
      alert('Import failed: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface border border-border-strong rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-text">Import from Quote</h2>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text text-lg leading-none">×</button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-52 shrink-0 border-r border-border overflow-y-auto p-3 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-2">Quote Issue</p>
            {issues.map((issue) => (
              <button key={issue.id} type="button" onClick={() => setSelectedIssueId(issue.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${selectedIssueId === issue.id ? 'bg-accent text-accent-text' : 'hover:bg-surface-hover text-text'}`}>
                <div className="font-medium">Issue #{issue.issue_number}</div>
                <div className={`text-[11px] ${selectedIssueId === issue.id ? 'text-accent-text/70' : 'text-text-subtle'}`}>{issue.name || issue.status}</div>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!selectedIssueId ? (
              <p className="text-text-subtle text-sm text-center pt-8">Select a quote issue on the left.</p>
            ) : loadingItems ? (
              <p className="text-text-subtle text-sm text-center pt-8">Loading items...</p>
            ) : quoteItems.length === 0 ? (
              <p className="text-text-subtle text-sm text-center pt-8">No items with lines in this issue.</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Select items to import</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setSelectedItemIds(new Set(quoteItems.map((i) => i.id)))} className="text-xs text-text-muted hover:text-text underline">All</button>
                    <button type="button" onClick={() => setSelectedItemIds(new Set())} className="text-xs text-text-muted hover:text-text underline">None</button>
                  </div>
                </div>
                <div className="space-y-1">
                  {quoteItems.map((item) => (
                    <label key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surface-hover cursor-pointer">
                      <input type="checkbox" checked={selectedItemIds.has(item.id)} onChange={() => toggleItem(item.id)} className="accent-accent" />
                      <span className="flex-1 text-sm text-text">{item.name}</span>
                      <span className="text-xs text-text-subtle shrink-0">
                        {item.line_count} line{item.line_count !== 1 ? 's' : ''}{item.qty > 1 ? ` · qty ${item.qty}` : ''}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <span className="text-xs text-text-subtle">
            {selectedItemIds.size > 0 ? `${selectedItemIds.size} item${selectedItemIds.size !== 1 ? 's' : ''} selected` : 'No items selected'}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-muted bg-surface border border-border-strong rounded-md hover:bg-surface-hover">Cancel</button>
            <button type="button" onClick={handleImport} disabled={selectedItemIds.size === 0 || importing}
              className="px-4 py-2 text-sm bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50">
              {importing ? 'Importing...' : `Import ${selectedItemIds.size > 0 ? selectedItemIds.size + ' item' + (selectedItemIds.size !== 1 ? 's' : '') : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-xs font-medium text-text-muted mb-1">{children}</span>
}

function Th({ children, right, center }: { children?: React.ReactNode; right?: boolean; center?: boolean }) {
  return (
    <th className={`py-1.5 px-2 text-[10px] uppercase tracking-widest font-medium text-text-subtle whitespace-nowrap ${right ? 'text-right' : center ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border'
const cellCls = 'w-full px-1.5 py-1 text-xs bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none'
