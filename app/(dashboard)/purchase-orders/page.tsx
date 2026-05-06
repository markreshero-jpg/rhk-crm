'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, Trash2, Send, ExternalLink, Mail, ChevronDown, Printer, Package, Lock, Unlock, CheckCircle2, ChevronRight, Paperclip, FileText, FileImage, File, X, Upload, Search } from 'lucide-react'
import {
  PurchaseOrder, PurchaseOrderLine, JobOption, WorkOrderOption, POLineSummary,
  PO_STATUSES, POStatus,
  getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
  getPurchaseOrderLines, createPurchaseOrderLine, updatePurchaseOrderLine, deletePurchaseOrderLine,
  getJobOptions, getWorkOrderOptions, generatePONumber, getPOLineSummaries,
} from '@/lib/purchaseOrders'
import { getAllSuppliers, Supplier } from '@/lib/suppliers'
import { getSupplierItemByCode } from '@/lib/supplierItems'
import { getPOEmails, POEmail } from '@/lib/purchaseOrderEmails'
import { getPOReceipts, createPOReceipt, POReceipt } from '@/lib/purchaseOrderReceipts'
import { getPOAttachments, uploadPOAttachment, deletePOAttachment, POAttachment, fmtFileSize } from '@/lib/purchaseOrderAttachments'
import { formatCurrency } from '@/lib/format'

const poStatusStyles: Record<string, string> = {
  'Draft':         'bg-surface-muted text-text-muted border-border',
  'Sent':          'bg-info-bg text-info border-info-border',
  'Confirmed':     'bg-success-bg text-success border-success-border',
  'Part Received': 'bg-warning-bg text-warning border-warning-border',
  'Received':      'bg-success-bg text-success border-success-border',
  'Cancelled':     'bg-surface-muted text-text-faint border-border',
}

const sidebarStatusStyles: Record<string, string> = {
  'Draft':         'bg-gray-100 text-gray-500 border-gray-200',
  'Sent':          'bg-blue-100 text-blue-700 border-blue-200',
  'Confirmed':     'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Part Received': 'bg-amber-100 text-amber-700 border-amber-200',
  'Received':      'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Cancelled':     'bg-red-50 text-red-400 border-red-200',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([])
  const [lineSummaries, setLineSummaries] = useState<POLineSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [newSupplierId, setNewSupplierId] = useState('')

  // Filter state
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterItem, setFilterItem] = useState('')
  const [filterCode, setFilterCode] = useState('')

  const isFiltered = !!(filterSupplier || filterDateFrom || filterDateTo || filterItem || filterCode)

  const filteredPos = useMemo(() => {
    const itemQ = filterItem.toLowerCase().trim()
    const codeQ = filterCode.toLowerCase().trim()
    return pos.filter((po) => {
      if (filterSupplier && po.supplier_id !== filterSupplier) return false
      if (filterDateFrom && po.order_date && po.order_date < filterDateFrom) return false
      if (filterDateTo && po.order_date && po.order_date > filterDateTo) return false
      if (itemQ || codeQ) {
        const poLines = lineSummaries.filter((l) => l.purchase_order_id === po.id)
        if (itemQ && !poLines.some((l) => l.item?.toLowerCase().includes(itemQ))) return false
        if (codeQ && !poLines.some((l) => l.item_code?.toLowerCase().includes(codeQ))) return false
      }
      return true
    })
  }, [pos, lineSummaries, filterSupplier, filterDateFrom, filterDateTo, filterItem, filterCode])

  function clearFilters() {
    setFilterSupplier(''); setFilterDateFrom(''); setFilterDateTo(''); setFilterItem(''); setFilterCode('')
  }

  const load = useCallback(async () => {
    const [data, sups, summaries] = await Promise.all([getPurchaseOrders(), getAllSuppliers(), getPOLineSummaries()])
    setPos(data)
    setSuppliers(sups)
    setLineSummaries(summaries)
    if (data.length > 0 && !selectedId) setSelectedId(data[0].id)
    setLoading(false)
  }, [selectedId])

  useEffect(() => { load() }, [load])

  async function handleNew() {
    if (suppliers.length === 0 || showNewSupplier) return
    setShowNewSupplier(true)
    setNewSupplierId(suppliers[0].id)
  }

  async function handleCreate() {
    if (!newSupplierId) return
    setBusy(true)
    try {
      const poNum = await generatePONumber()
      const po = await createPurchaseOrder({ supplier_id: newSupplierId, status: 'Draft', order_date: new Date().toISOString().slice(0, 10), po_number: poNum })
      setShowNewSupplier(false)
      await load()
      setSelectedId(po.id)
    } finally { setBusy(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this purchase order and all its lines? This cannot be undone.')) return
    await deletePurchaseOrder(id)
    if (selectedId === id) setSelectedId(null)
    await load()
  }

  const selected = pos.find((p) => p.id === selectedId) ?? null

  return (
    <div className="p-10 max-w-[1400px]">
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-1">Purchasing</p>
        <h2 className="text-4xl font-medium text-text tracking-tight">Purchase Orders</h2>
      </div>

      {loading ? <p className="text-text-subtle text-sm">Loading...</p> : (
        <>
          {/* Filter bar */}
          <div className="flex items-end gap-2 mb-5 flex-wrap">
            <div>
              <p className={filterLabelCls}>Supplier</p>
              <select value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)} className={filterInputCls} style={{ minWidth: 160 }}>
                <option value="">All suppliers</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
              </select>
            </div>
            <div>
              <p className={filterLabelCls}>From</p>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className={filterInputCls} />
            </div>
            <div>
              <p className={filterLabelCls}>To</p>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className={filterInputCls} />
            </div>
            <div className="flex-1" style={{ minWidth: 140 }}>
              <p className={filterLabelCls}>Item</p>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
                <input type="text" value={filterItem} onChange={(e) => setFilterItem(e.target.value)} placeholder="Search items…" className={filterInputCls + ' pl-7'} />
              </div>
            </div>
            <div style={{ minWidth: 120 }}>
              <p className={filterLabelCls}>Item Code</p>
              <input type="text" value={filterCode} onChange={(e) => setFilterCode(e.target.value)} placeholder="e.g. ABC123" className={filterInputCls} />
            </div>
            <div className="flex items-end gap-3 pb-px">
              {isFiltered && (
                <button type="button" onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-text-muted border border-border rounded-md hover:bg-surface-hover hover:text-text transition-colors">
                  <X size={11} /> Clear
                </button>
              )}
              {isFiltered && (
                <span className="text-xs text-text-subtle whitespace-nowrap">
                  {filteredPos.length} of {pos.length}
                </span>
              )}
            </div>
          </div>

        <div className="flex gap-6">
          <aside className="w-64 shrink-0">
            <button type="button" onClick={handleNew} disabled={busy || suppliers.length === 0}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-accent-text bg-accent rounded-md hover:bg-accent-hover disabled:opacity-50 mb-3">
              <Plus size={12} /> New Purchase Order
            </button>

            {showNewSupplier && (
              <div className="mb-3 p-3 bg-surface border border-border rounded-md space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Select Supplier</p>
                <select value={newSupplierId} onChange={(e) => setNewSupplierId(e.target.value)} className={inputCls} autoFocus>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={handleCreate} disabled={busy} className="flex-1 text-xs py-1.5 bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50">
                    {busy ? 'Creating…' : 'Create'}
                  </button>
                  <button onClick={() => setShowNewSupplier(false)} className="text-xs text-text-muted hover:text-text px-2">Cancel</button>
                </div>
              </div>
            )}

            <ul className="space-y-1">
              {filteredPos.length === 0 ? (
                <li className="text-text-subtle text-xs italic px-2 py-3">{isFiltered ? 'No orders match your filters.' : 'No purchase orders yet.'}</li>
              ) : filteredPos.map((po) => {
                const isSel = selectedId === po.id
                return (
                  <li key={po.id}>
                    <button type="button" onClick={() => setSelectedId(po.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${isSel ? 'bg-accent text-accent-text' : 'hover:bg-surface-hover text-text'}`}>
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-[10px] font-mono ${isSel ? 'text-accent-text/70' : 'text-text-subtle'}`}>{po.po_number || 'Draft'}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border whitespace-nowrap ${sidebarStatusStyles[po.status] || ''}`}>{po.status}</span>
                      </div>
                      <div className="text-xs font-medium truncate">{po.supplier_name || '—'}</div>
                      <div className={`text-[11px] mt-0.5 ${isSel ? 'text-accent-text/60' : 'text-text-subtle'}`}>{po.order_date}</div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>

          <div className="flex-1 min-w-0">
            {selected ? (
              <POPanel key={selected.id} po={selected} suppliers={suppliers}
                onUpdate={async (patch) => { await updatePurchaseOrder(selected.id, patch); await load() }}
                onDelete={() => handleDelete(selected.id)}
                onReload={load}
              />
            ) : (
              <div className="text-center py-16 text-text-subtle text-sm">Select a purchase order or create a new one.</div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  )
}

// ── PO Panel ──────────────────────────────────────────────────────────────────

function POPanel({ po, suppliers, onUpdate, onDelete, onReload }: {
  po: PurchaseOrder
  suppliers: Supplier[]
  onUpdate: (patch: Partial<PurchaseOrder>) => Promise<void>
  onDelete: () => void
  onReload: () => Promise<void>
}) {
  const [lines, setLines] = useState<PurchaseOrderLine[]>([])
  const [jobs, setJobs] = useState<JobOption[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([])
  const [emails, setEmails] = useState<POEmail[]>([])
  const [receipts, setReceipts] = useState<POReceipt[]>([])
  const [attachments, setAttachments] = useState<POAttachment[]>([])
  const [loadingLines, setLoadingLines] = useState(true)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [sessionUnlocked, setSessionUnlocked] = useState(false)
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set())

  const isSent = po.status !== 'Draft'
  const isLocked = isSent && !sessionUnlocked

  const loadLines = useCallback(async () => {
    const [l, j, wo, em, rec, att] = await Promise.all([
      getPurchaseOrderLines(po.id),
      getJobOptions(),
      getWorkOrderOptions(),
      getPOEmails(po.id),
      getPOReceipts(po.id),
      getPOAttachments(po.id),
    ])
    setLines(l); setJobs(j); setWorkOrders(wo); setEmails(em); setReceipts(rec); setAttachments(att)
    setLoadingLines(false)
  }, [po.id])

  useEffect(() => { loadLines() }, [loadLines])

  function blurSave(field: keyof PurchaseOrder) {
    return (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (isLocked) return
      const val = e.target.value
      onUpdate({ [field]: val === '' ? null : val })
    }
  }

  async function handleAddLine() {
    if (isLocked) {
      if (!confirm('This PO has already been sent to the supplier. Adding a line may require re-sending.\n\nContinue?')) return
    }
    const nextSort = lines.length > 0 ? Math.max(...lines.map((l) => l.sort)) + 1 : 1
    await createPurchaseOrderLine({ purchase_order_id: po.id, sort: nextSort, qty: 1, unit_cost: 0, gst_rate: 0.1 })
    await loadLines()
  }

  async function handleUpdateLine(id: string, patch: Partial<PurchaseOrderLine>) {
    await updatePurchaseOrderLine(id, patch)
    await loadLines()
  }

  async function handleDeleteLine(id: string) {
    await deletePurchaseOrderLine(id)
    await loadLines()
  }

  function toggleReceipt(id: string) {
    setExpandedReceipts((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const subtotal = lines.reduce((s, l) => s + (l.qty || 0) * (l.unit_cost || 0), 0)
  const gst      = lines.reduce((s, l) => s + (l.qty || 0) * (l.unit_cost || 0) * (l.gst_rate ?? 0.1), 0)
  const total    = subtotal + gst

  return (
    <div className="space-y-5">

      {/* Soft lock banner */}
      {isSent && (
        <div className={`flex items-center justify-between gap-4 px-4 py-3 rounded-md border ${sessionUnlocked ? 'bg-warning-bg border-warning-border' : 'bg-surface-muted border-border'}`}>
          <div className="flex items-center gap-2.5">
            {sessionUnlocked
              ? <Unlock size={14} className="text-warning shrink-0" />
              : <Lock size={14} className="text-text-subtle shrink-0" />}
            <span className={`text-sm ${sessionUnlocked ? 'text-warning' : 'text-text-muted'}`}>
              {sessionUnlocked
                ? 'Editing unlocked — changes may require re-sending to the supplier.'
                : 'This PO has been sent to the supplier. Fields are read-only.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSessionUnlocked((v) => !v)}
            className={`text-xs shrink-0 underline transition-colors ${sessionUnlocked ? 'text-warning' : 'text-text-muted hover:text-text'}`}
          >
            {sessionUnlocked ? 'Re-lock' : 'Edit anyway'}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="space-y-3 flex-1">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-2">
              <Label>PO Number</Label>
              <input type="text" defaultValue={po.po_number || ''} onBlur={blurSave('po_number')} placeholder="RH001"
                className={inputCls} disabled={isLocked} />
            </div>
            <div className="col-span-4">
              <Label>Supplier</Label>
              <select defaultValue={po.supplier_id} onChange={(e) => !isLocked && onUpdate({ supplier_id: e.target.value })}
                className={inputCls} disabled={isLocked}>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <Label>Order Date</Label>
              <input type="date" defaultValue={po.order_date?.slice(0, 10) || ''} onBlur={blurSave('order_date')}
                className={inputCls} disabled={isLocked} />
            </div>
            <div className="col-span-2">
              <Label>Status</Label>
              <div className="relative">
                <button type="button" onClick={() => setShowStatusMenu((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border w-full justify-between ${poStatusStyles[po.status] || 'bg-surface-muted text-text-muted border-border'}`}>
                  {po.status}<ChevronDown size={12} />
                </button>
                {showStatusMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-10 min-w-[160px]">
                    {PO_STATUSES.map((s) => (
                      <button key={s} type="button" onClick={() => { setShowStatusMenu(false); onUpdate({ status: s }) }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-hover transition-colors ${s === po.status ? 'font-semibold text-text' : 'text-text-muted'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-1 col-start-12 flex flex-col justify-end">
              <button type="button" onClick={onDelete} className="text-xs text-danger hover:opacity-80 px-2 py-2">Delete</button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Delivery Name</Label>
              <input type="text" defaultValue={po.delivery_name || ''} onBlur={blurSave('delivery_name')} placeholder="Deliver to…" className={inputCls} disabled={isLocked} />
            </div>
            <div>
              <Label>Delivery Suburb</Label>
              <input type="text" defaultValue={po.delivery_suburb || ''} onBlur={blurSave('delivery_suburb')} placeholder="Suburb" className={inputCls} disabled={isLocked} />
            </div>
            <div>
              <Label>Delivery Postcode</Label>
              <input type="text" defaultValue={po.delivery_postcode || ''} onBlur={blurSave('delivery_postcode')} placeholder="Postcode" className={inputCls} disabled={isLocked} />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <textarea defaultValue={po.notes || ''} onBlur={blurSave('notes')} rows={2} placeholder="Notes for supplier…"
              className={inputCls + ' resize-none w-full'} disabled={isLocked} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-5 shrink-0">
          <button type="button" onClick={() => setShowSendModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-accent text-accent-text rounded-md hover:bg-accent-hover transition-colors whitespace-nowrap">
            <Send size={14} /> Email PO
          </button>
          {isSent && (
            <button type="button" onClick={() => setShowReceiveModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-success-bg text-success border border-success-border rounded-md hover:opacity-80 transition-colors whitespace-nowrap">
              <Package size={14} /> Receive Goods
            </button>
          )}
          <a href={`/print/purchase-order/${po.id}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-surface border border-border text-text-muted rounded-md hover:bg-surface-hover transition-colors whitespace-nowrap">
            <Printer size={14} /> Print / PDF
          </a>
        </div>
      </div>

      <hr className="border-border" />

      {/* Lines */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Lines</h3>
          <button type="button" onClick={handleAddLine}
            className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover transition-colors">
            <Plus size={12} /> Add Line
          </button>
        </div>

        {loadingLines ? <p className="text-text-subtle text-sm">Loading…</p>
          : lines.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg py-12 text-center">
              <p className="text-text-subtle text-sm mb-2">No lines yet.</p>
              <button onClick={handleAddLine} className="text-sm text-text underline hover:no-underline">Add a line</button>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-muted border-b border-border">
                      <Th>Item Code</Th>
                      <Th>Item</Th>
                      <Th>Description</Th>
                      <Th right>Ordered</Th>
                      <Th right>Received</Th>
                      <Th right>Unit Cost</Th>
                      <Th right>Ex GST</Th>
                      <Th />
                    </tr>
                  </thead>
                  {lines.map((line) => (
                    <POLineRow key={line.id} line={line} jobs={jobs} workOrders={workOrders}
                      supplierId={po.supplier_id} locked={isLocked}
                      onUpdate={(patch) => handleUpdateLine(line.id, patch)}
                      onDelete={() => handleDeleteLine(line.id)}
                    />
                  ))}
                </table>
              </div>

              <div className="flex justify-end pt-4">
                <div className="space-y-1 min-w-[260px]">
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Subtotal (ex GST)</span>
                    <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>GST</span>
                    <span className="tabular-nums">{formatCurrency(gst)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-text border-t border-border pt-1 mt-1">
                    <span>Total (inc GST)</span>
                    <span className="tabular-nums">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Attachments */}
      <hr className="border-border" />
      <AttachmentsSection poId={po.id} attachments={attachments} onRefresh={loadLines} />

      {/* Goods Receipt History */}
      {receipts.length > 0 && (
        <>
          <hr className="border-border" />
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-3">Goods Receipts</h3>
            <div className="space-y-2">
              {receipts.map((rec) => {
                const totalReceived = rec.lines.reduce((s, l) => s + l.qty_received, 0)
                const isExpanded = expandedReceipts.has(rec.id)
                return (
                  <div key={rec.id} className="border border-border rounded-md overflow-hidden">
                    <button type="button" onClick={() => toggleReceipt(rec.id)}
                      className="w-full flex items-center justify-between gap-4 px-3 py-2.5 bg-surface-muted hover:bg-surface-hover transition-colors text-left">
                      <div className="flex items-center gap-2.5">
                        <Package size={14} className="text-success shrink-0" />
                        <div>
                          <div className="text-xs font-medium text-text">
                            {fmtDate(rec.received_at)}
                            {rec.received_by && <span className="text-text-muted font-normal"> · {rec.received_by}</span>}
                          </div>
                          <div className="text-[11px] text-text-subtle mt-0.5">
                            {rec.lines.length} line{rec.lines.length !== 1 ? 's' : ''} · {totalReceived} unit{totalReceived !== 1 ? 's' : ''} received
                            {rec.notes && ` · ${rec.notes}`}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={14} className={`text-text-faint transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-2 border-t border-border">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left pb-1.5 text-[10px] uppercase tracking-wider text-text-faint font-medium pr-4">Code</th>
                              <th className="text-left pb-1.5 text-[10px] uppercase tracking-wider text-text-faint font-medium pr-4">Item</th>
                              <th className="text-right pb-1.5 text-[10px] uppercase tracking-wider text-text-faint font-medium pr-4">Ordered</th>
                              <th className="text-right pb-1.5 text-[10px] uppercase tracking-wider text-text-faint font-medium">Received</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {rec.lines.map((l) => (
                              <tr key={l.id}>
                                <td className="py-1.5 pr-4 font-mono text-text-muted">{l.item_code || '—'}</td>
                                <td className="py-1.5 pr-4 text-text">{l.item || <span className="italic text-text-faint">Untitled</span>}
                                  {l.description && <span className="text-text-subtle"> · {l.description}</span>}
                                  {l.notes && <span className="text-text-faint italic"> ({l.notes})</span>}
                                </td>
                                <td className="py-1.5 pr-4 text-right text-text-muted">{l.qty_ordered}</td>
                                <td className="py-1.5 text-right font-medium text-text">{l.qty_received}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Email History */}
      {emails.length > 0 && (
        <>
          <hr className="border-border" />
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-3">Email History</h3>
            <div className="space-y-2">
              {emails.map((em) => (
                <div key={em.id} className="flex items-start justify-between gap-4 px-3 py-2.5 bg-surface-muted rounded-md">
                  <div className="flex items-start gap-2.5">
                    <Mail size={14} className="text-text-subtle mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <div className="text-text font-medium">{fmtDate(em.sent_at)}</div>
                      {em.sent_from && <div className="text-text-muted mt-0.5">From: {em.sent_from}</div>}
                      <div className="text-text-muted">To: {em.sent_to.join(', ')}</div>
                      {em.sent_cc?.length > 0 && <div className="text-text-muted">CC: {em.sent_cc.join(', ')}</div>}
                      {em.sent_bcc?.length > 0 && <div className="text-text-muted">BCC: {em.sent_bcc.join(', ')}</div>}
                      {em.subject && <div className="text-text-subtle mt-0.5 italic">{em.subject}</div>}
                    </div>
                  </div>
                  <a href={`/print/purchase-order/sent/${em.id}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors shrink-0">
                    <ExternalLink size={12} /> View sent version
                  </a>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showSendModal && (
        <SendModal po={po} suppliers={suppliers} attachments={attachments} onClose={() => setShowSendModal(false)}
          onSent={async () => { setShowSendModal(false); await onReload(); await loadLines() }} />
      )}

      {showReceiveModal && (
        <ReceiveGoodsModal po={po} lines={lines} onClose={() => setShowReceiveModal(false)}
          onSaved={async () => { setShowReceiveModal(false); await onReload(); await loadLines() }} />
      )}
    </div>
  )
}

// ── Receive Goods Modal ───────────────────────────────────────────────────────

function ReceiveGoodsModal({ po, lines, onClose, onSaved }: {
  po: PurchaseOrder
  lines: PurchaseOrderLine[]
  onClose: () => void
  onSaved: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [receivedAt, setReceivedAt] = useState(today)
  const [receivedBy, setReceivedBy] = useState('')
  const [notes, setNotes] = useState('')
  const [qtys, setQtys] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const l of lines) {
      const outstanding = Math.max(0, (l.qty || 0) - (l.received_qty || 0))
      init[l.id] = outstanding
    }
    return init
  })
  const [lineNotes, setLineNotes] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasAnything = Object.values(qtys).some((q) => q > 0)

  async function handleSave() {
    if (!hasAnything) { setError('Enter a quantity for at least one line.'); return }
    setSaving(true)
    setError(null)
    try {
      await createPOReceipt({
        purchase_order_id: po.id,
        received_at: receivedAt,
        received_by: receivedBy || null,
        notes: notes || null,
        lines: lines.map((l) => ({
          purchase_order_line_id: l.id,
          qty_received: qtys[l.id] || 0,
          notes: lineNotes[l.id] || null,
        })),
      })
      onSaved()
    } catch (e) {
      setError((e as Error).message || 'Failed to save receipt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border shrink-0">
          <Package size={16} className="text-text-muted" />
          <h2 className="text-base font-semibold text-text">Receive Goods — {po.po_number}</h2>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Receipt header */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Date Received</Label>
              <input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <Label>Received By</Label>
              <input type="text" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder="Your name" className={inputCls} autoFocus />
            </div>
          </div>
          <div>
            <Label>Delivery Notes <span className="text-text-faint font-normal">(optional)</span></Label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Delivery docket #1234" className={inputCls} />
          </div>

          <hr className="border-border" />

          {/* Lines */}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-2 text-[10px] uppercase tracking-wider text-text-faint font-medium pr-3">Item</th>
                <th className="text-right pb-2 text-[10px] uppercase tracking-wider text-text-faint font-medium pr-3 w-20">Ordered</th>
                <th className="text-right pb-2 text-[10px] uppercase tracking-wider text-text-faint font-medium pr-3 w-20">Already<br/>Received</th>
                <th className="text-right pb-2 text-[10px] uppercase tracking-wider text-text-faint font-medium pr-3 w-24">Outstanding</th>
                <th className="text-right pb-2 text-[10px] uppercase tracking-wider text-text-faint font-medium w-28">Receive Now</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((l) => {
                const ordered = l.qty || 0
                const alreadyReceived = l.received_qty || 0
                const outstanding = Math.max(0, ordered - alreadyReceived)
                const fullyReceived = outstanding === 0
                const thisQty = qtys[l.id] ?? 0

                return (
                  <tr key={l.id} className={fullyReceived ? 'opacity-40' : ''}>
                    <td className="py-2 pr-3">
                      <div className="font-medium text-text">
                        {l.item || <span className="italic text-text-faint">Untitled</span>}
                        {l.item_code && <span className="ml-1.5 font-mono text-[10px] text-text-muted">{l.item_code}</span>}
                      </div>
                      {l.description && <div className="text-text-subtle mt-0.5">{l.description}</div>}
                      {!fullyReceived && (
                        <input
                          type="text"
                          value={lineNotes[l.id] || ''}
                          onChange={(e) => setLineNotes((p) => ({ ...p, [l.id]: e.target.value }))}
                          placeholder="Note (e.g. on backorder)…"
                          className="mt-1 w-full px-1.5 py-0.5 text-[11px] bg-surface-muted border border-border rounded focus:outline-none focus:border-accent text-text-subtle placeholder:text-text-faint"
                        />
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right text-text-muted tabular-nums">{ordered}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {alreadyReceived > 0
                        ? <span className="text-success font-medium">{alreadyReceived}</span>
                        : <span className="text-text-faint">—</span>}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {fullyReceived
                        ? <span className="flex items-center justify-end gap-1 text-success"><CheckCircle2 size={12} /> Done</span>
                        : <span className="text-text font-medium">{outstanding}</span>}
                    </td>
                    <td className="py-2 text-right">
                      {fullyReceived ? (
                        <span className="text-text-faint text-[11px]">—</span>
                      ) : (
                        <input
                          type="number"
                          value={thisQty}
                          min={0}
                          max={outstanding}
                          onChange={(e) => setQtys((p) => ({ ...p, [l.id]: Math.max(0, parseFloat(e.target.value) || 0) }))}
                          className="w-20 px-2 py-1 text-right text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent tabular-nums"
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {error && <p className="px-6 pb-2 text-xs text-danger">{error}</p>}

        <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
          <button type="button" onClick={handleSave} disabled={saving || !hasAnything}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors">
            <Package size={14} />
            {saving ? 'Saving…' : 'Record Receipt'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm text-text-muted hover:text-text border border-border rounded-md hover:bg-surface-hover transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Send Modal ────────────────────────────────────────────────────────────────

function SendModal({ po, suppliers, attachments, onClose, onSent }: {
  po: PurchaseOrder
  suppliers: Supplier[]
  attachments: POAttachment[]
  onClose: () => void
  onSent: () => void
}) {
  const supplier = suppliers.find((s) => s.id === po.supplier_id)
  const [from, setFrom]     = useState('')
  const [to, setTo]         = useState(supplier?.email || '')
  const [cc, setCc]         = useState('')
  const [bcc, setBcc]       = useState('')
  const [subject, setSubject] = useState(`Purchase Order ${po.po_number || ''} — RHK`)
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<Set<string>>(
    () => new Set(attachments.map((a) => a.id))
  )
  const [sending, setSending] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function toggleAttachment(id: string) {
    setSelectedAttachmentIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSend() {
    const localPart = from.trim().replace(/@.*$/, '')
    const fromAddr = `${localPart}@residenthero.com.au`
    const toList = to.split(',').map((e) => e.trim()).filter(Boolean)
    if (!localPart) { setError('Please enter your name/username.'); return }
    if (!toList.length) { setError('Please enter at least one recipient.'); return }

    setSending(true); setError(null)
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromAddr,
          to: toList,
          cc: cc.split(',').map((e) => e.trim()).filter(Boolean),
          bcc: bcc.split(',').map((e) => e.trim()).filter(Boolean),
          subject,
          attachmentIds: Array.from(selectedAttachmentIds),
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to send'); return }
      onSent()
    } catch { setError('Network error — please try again.') }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border shrink-0">
          <Send size={16} className="text-text-muted" />
          <h2 className="text-base font-semibold text-text">Email Purchase Order</h2>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          <div>
            <Label>From</Label>
            <div className="flex items-center">
              <input type="text" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="mark"
                className="flex-1 px-3 py-2 text-sm bg-surface border border-border-strong rounded-l-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border" autoFocus />
              <span className="px-3 py-2 text-sm bg-surface-muted border border-l-0 border-border-strong rounded-r-md text-text-muted select-none">@residenthero.com.au</span>
            </div>
          </div>
          <div>
            <Label>To <span className="text-text-faint font-normal">(comma-separated)</span></Label>
            <input type="text" value={to} onChange={(e) => setTo(e.target.value)} placeholder="supplier@example.com" className={inputCls} />
          </div>
          <div>
            <Label>CC <span className="text-text-faint font-normal">(optional)</span></Label>
            <input type="text" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@example.com" className={inputCls} />
          </div>
          <div>
            <Label>BCC <span className="text-text-faint font-normal">(optional)</span></Label>
            <input type="text" value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="bcc@example.com" className={inputCls} />
          </div>
          <div>
            <Label>Subject</Label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
          </div>

          {attachments.length > 0 && (
            <div>
              <Label>Attachments <span className="text-text-faint font-normal">(uncheck to exclude)</span></Label>
              <div className="space-y-1.5">
                {attachments.map((a) => {
                  const checked = selectedAttachmentIds.has(a.id)
                  return (
                    <label key={a.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-md border cursor-pointer transition-colors ${checked ? 'border-accent bg-surface' : 'border-border bg-surface-muted opacity-50'}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleAttachment(a.id)} className="accent-accent" />
                      <FileIcon mime={a.mime_type} size={14} className="text-text-subtle shrink-0" />
                      <span className="text-xs text-text flex-1 truncate">{a.file_name}</span>
                      {a.file_size && <span className="text-[11px] text-text-faint shrink-0">{fmtFileSize(a.file_size)}</span>}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {error && <p className="px-6 pb-2 text-xs text-danger">{error}</p>}

        <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
          <button type="button" onClick={handleSend} disabled={sending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors">
            <Send size={14} />{sending ? 'Sending…' : 'Send Purchase Order'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm text-text-muted hover:text-text border border-border rounded-md hover:bg-surface-hover transition-colors">Cancel</button>
        </div>
        <p className="text-[10px] text-text-faint pb-3 text-center">Sending will log this email and mark the PO as Sent.</p>
      </div>
    </div>
  )
}

// ── PO Line Row ───────────────────────────────────────────────────────────────

function POLineRow({ line, jobs, workOrders, supplierId, locked, onUpdate, onDelete }: {
  line: PurchaseOrderLine
  jobs: JobOption[]
  workOrders: WorkOrderOption[]
  supplierId: string
  locked: boolean
  onUpdate: (patch: Partial<PurchaseOrderLine>) => void
  onDelete: () => void
}) {
  const jobWorkOrders = workOrders.filter((wo) => wo.job_id === line.job_id)
  const lineTotal = (line.qty || 0) * (line.unit_cost || 0)
  const received = line.received_qty || 0
  const ordered  = line.qty || 0
  const fullyReceived = received >= ordered && ordered > 0
  const partReceived  = received > 0 && !fullyReceived

  const blurText = (field: keyof PurchaseOrderLine) =>
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (locked) return
      const val = e.target.value || null
      if (val === (line[field] as string | null ?? null)) return
      onUpdate({ [field]: val })
    }

  const blurNum = (field: keyof PurchaseOrderLine) =>
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (locked) return
      const val = parseFloat(e.target.value) || 0
      if (val === (line[field] as number)) return
      onUpdate({ [field]: val })
    }

  async function handleItemCodeBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (locked) return
    const code = e.target.value.trim()
    if (code === (line.item_code || '')) return
    const supplierItem = code
      ? (await getSupplierItemByCode(code, supplierId)) || (await getSupplierItemByCode(code))
      : null
    onUpdate({ item_code: code || null, ...(supplierItem ? { item: supplierItem.item, description: supplierItem.description, unit_cost: supplierItem.cost } : {}) })
  }

  return (
    <tbody className="border-b-2 border-border">
      {/* Row 1 — Job / Work Order */}
      <tr className="bg-surface-muted">
        <td colSpan={7} className="px-3 py-1.5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-[10px] text-text-subtle shrink-0 uppercase tracking-wider">Job</span>
              <select value={line.job_id || ''} disabled={locked}
                onChange={(e) => onUpdate({ job_id: e.target.value || null, work_order_id: null })} className={contextCls}>
                <option value="">— No job —</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.job_number}{j.client_name ? ` · ${j.client_name}` : ''}{j.title ? ` · ${j.title}` : ''}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-[10px] text-text-subtle shrink-0 uppercase tracking-wider">WO</span>
              <select value={line.work_order_id || ''} disabled={locked || !line.job_id}
                onChange={(e) => onUpdate({ work_order_id: e.target.value || null })} className={contextCls}>
                <option value="">— None —</option>
                {jobWorkOrders.map((wo) => <option key={wo.id} value={wo.id}>{wo.work_order_number || 'WO'}{wo.title ? ` · ${wo.title}` : ''}</option>)}
              </select>
            </div>
          </div>
        </td>
        <td className="px-2 py-1.5 text-right">
          <button type="button" onClick={onDelete} disabled={locked} className="text-text-faint hover:text-danger transition-colors disabled:opacity-30">
            <Trash2 size={13} />
          </button>
        </td>
      </tr>

      {/* Row 2 — Item details */}
      <tr className="hover:bg-surface-hover transition-colors">
        <td className="px-2 py-1.5 w-28">
          <input type="text" defaultValue={line.item_code || ''} onBlur={handleItemCodeBlur} placeholder="Code" disabled={locked} className={cellCls + ' font-mono'} />
        </td>
        <td className="px-2 py-1.5 min-w-[140px]">
          <input type="text" defaultValue={line.item || ''} onBlur={blurText('item')} placeholder="Item" disabled={locked} className={cellCls} />
        </td>
        <td className="px-2 py-1.5 min-w-[180px]">
          <input type="text" defaultValue={line.description || ''} onBlur={blurText('description')} placeholder="Description" disabled={locked} className={cellCls} />
        </td>
        <td className="px-2 py-1.5 w-16">
          <input type="number" defaultValue={line.qty} onBlur={blurNum('qty')} min={0} disabled={locked} className={cellCls + ' text-right'} />
        </td>
        {/* Received column */}
        <td className="px-2 py-1.5 w-20 text-right tabular-nums">
          {ordered === 0 ? <span className="text-text-faint">—</span>
            : fullyReceived ? <span className="flex items-center justify-end gap-1 text-success text-xs"><CheckCircle2 size={15} />{received}</span>
            : partReceived  ? <span className="text-warning font-medium">{received}<span className="text-text-faint font-normal"> / {ordered}</span></span>
            : <span className="text-text-faint">0 / {ordered}</span>}
        </td>
        <td className="px-2 py-1.5 w-24">
          <input type="number" defaultValue={line.unit_cost} onBlur={blurNum('unit_cost')} min={0} step={0.01} disabled={locked} className={cellCls + ' text-right'} />
        </td>
        <td className="px-2 py-1.5 w-28 text-right font-medium text-text tabular-nums">
          {formatCurrency(lineTotal)}
        </td>
        <td />
      </tr>
    </tbody>
  )
}

// ── Attachments Section ───────────────────────────────────────────────────────

function AttachmentsSection({ poId, attachments, onRefresh }: {
  poId: string
  attachments: POAttachment[]
  onRefresh: () => Promise<void>
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      await uploadPOAttachment(poId, file)
      await onRefresh()
    } catch (err) {
      setError((err as Error).message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(id: string, filePath: string) {
    if (!confirm('Remove this attachment?')) return
    try {
      await deletePOAttachment(id, filePath)
      await onRefresh()
    } catch (err) {
      setError((err as Error).message || 'Delete failed')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium flex items-center gap-1.5">
          <Paperclip size={11} />Attachments
        </h3>
        <label className={`flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload size={12} />
          {uploading ? 'Uploading…' : 'Upload File'}
          <input type="file" className="hidden" onChange={handleFileChange} disabled={uploading}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,.txt" />
        </label>
      </div>

      {error && <p className="text-xs text-danger mb-2">{error}</p>}

      {attachments.length === 0 ? (
        <p className="text-xs text-text-faint italic">No attachments yet — upload PDFs, documents or images.</p>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-2.5 px-3 py-2 bg-surface-muted border border-border rounded-md">
              <FileIcon mime={a.mime_type} size={14} className="text-text-subtle shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text truncate">{a.file_name}</div>
                {a.file_size && <div className="text-[11px] text-text-faint">{fmtFileSize(a.file_size)}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {a.signed_url && (
                  <a href={a.signed_url} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-text-muted hover:text-text transition-colors">
                    View
                  </a>
                )}
                <button type="button" onClick={() => handleDelete(a.id, a.file_path)}
                  className="text-text-faint hover:text-danger transition-colors">
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── File Icon ────────────────────────────────────────────────────────────────

function FileIcon({ mime, size, className }: { mime: string | null; size: number; className?: string }) {
  if (mime?.startsWith('image/')) return <FileImage size={size} className={className} />
  if (mime === 'application/pdf' || mime?.includes('word') || mime?.includes('document')) return <FileText size={size} className={className} />
  return <File size={size} className={className} />
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-xs font-medium text-text-muted mb-1">{children}</span>
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={`py-2 px-2 text-[10px] uppercase tracking-widest font-medium text-text-subtle whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
}

const inputCls      = 'w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border disabled:bg-surface-muted disabled:text-text-faint disabled:cursor-not-allowed'
const cellCls       = 'w-full px-1.5 py-1 text-xs bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:text-text-faint'
const contextCls    = 'flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none text-text-muted disabled:cursor-not-allowed'
const filterInputCls = 'w-full px-2.5 py-2 text-xs bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-1 focus:ring-border text-text'
const filterLabelCls = 'text-[10px] uppercase tracking-wider text-text-faint font-medium mb-1'
