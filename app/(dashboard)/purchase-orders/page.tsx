'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  PurchaseOrder, PurchaseOrderLine, JobOption, WorkOrderOption,
  PO_STATUSES, POStatus,
  getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
  getPurchaseOrderLines, createPurchaseOrderLine, updatePurchaseOrderLine, deletePurchaseOrderLine,
  getJobOptions, getWorkOrderOptions,
} from '@/lib/purchaseOrders'
import { getAllSuppliers, Supplier } from '@/lib/suppliers'
import { formatCurrency } from '@/lib/format'

const poStatusStyles: Record<string, string> = {
  'Draft':        'bg-surface-muted text-text-muted border-border',
  'Sent':         'bg-info-bg text-info border-info-border',
  'Confirmed':    'bg-success-bg text-success border-success-border',
  'Part Received':'bg-warning-bg text-warning border-warning-border',
  'Received':     'bg-success-bg text-success border-success-border',
  'Cancelled':    'bg-surface-muted text-text-faint border-border',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [newSupplierId, setNewSupplierId] = useState('')

  const load = useCallback(async () => {
    const [data, sups] = await Promise.all([getPurchaseOrders(), getAllSuppliers()])
    setPos(data)
    setSuppliers(sups)
    if (data.length > 0 && !selectedId) setSelectedId(data[0].id)
    setLoading(false)
  }, [selectedId])

  useEffect(() => { load() }, [load])

  async function handleNew() {
    if (suppliers.length === 0) return
    if (showNewSupplier) return
    setShowNewSupplier(true)
    setNewSupplierId(suppliers[0].id)
  }

  async function handleCreate() {
    if (!newSupplierId) return
    setBusy(true)
    try {
      const po = await createPurchaseOrder({ supplier_id: newSupplierId, status: 'Draft', order_date: new Date().toISOString().slice(0, 10) })
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

      {loading ? (
        <p className="text-text-subtle text-sm">Loading...</p>
      ) : (
        <div className="flex gap-6">
          {/* Left rail */}
          <aside className="w-64 shrink-0">
            <button
              type="button"
              onClick={handleNew}
              disabled={busy || suppliers.length === 0}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-accent-text bg-accent rounded-md hover:bg-accent-hover disabled:opacity-50 mb-3"
            >
              <Plus size={12} /> New Purchase Order
            </button>

            {/* Supplier picker for new PO */}
            {showNewSupplier && (
              <div className="mb-3 p-3 bg-surface border border-border rounded-md space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Select Supplier</p>
                <select
                  value={newSupplierId}
                  onChange={(e) => setNewSupplierId(e.target.value)}
                  className={inputCls}
                  autoFocus
                >
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={handleCreate} disabled={busy} className="flex-1 text-xs py-1.5 bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50">
                    {busy ? 'Creating…' : 'Create'}
                  </button>
                  <button onClick={() => setShowNewSupplier(false)} className="text-xs text-text-muted hover:text-text px-2">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <ul className="space-y-1">
              {pos.length === 0 ? (
                <li className="text-text-subtle text-xs italic px-2 py-3">No purchase orders yet.</li>
              ) : (
                pos.map((po) => {
                  const isSelected = selectedId === po.id
                  return (
                    <li key={po.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(po.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                          isSelected ? 'bg-accent text-accent-text' : 'hover:bg-surface-hover text-text'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-[10px] font-mono ${isSelected ? 'text-accent-text/70' : 'text-text-subtle'}`}>
                            {po.po_number || 'Draft'}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border whitespace-nowrap ${
                            isSelected ? 'bg-surface text-text border-border' : poStatusStyles[po.status] || ''
                          }`}>
                            {po.status}
                          </span>
                        </div>
                        <div className="text-xs font-medium truncate">{po.supplier_name || '—'}</div>
                        <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-accent-text/60' : 'text-text-subtle'}`}>
                          {po.order_date}
                        </div>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </aside>

          {/* Right panel */}
          <div className="flex-1 min-w-0">
            {selected ? (
              <POPanel
                key={selected.id}
                po={selected}
                suppliers={suppliers}
                onUpdate={async (patch) => { await updatePurchaseOrder(selected.id, patch); await load() }}
                onDelete={() => handleDelete(selected.id)}
              />
            ) : (
              <div className="text-center py-16 text-text-subtle text-sm">
                Select a purchase order or create a new one.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── PO Panel ──────────────────────────────────────────────────────────────────

function POPanel({
  po, suppliers, onUpdate, onDelete,
}: {
  po: PurchaseOrder
  suppliers: Supplier[]
  onUpdate: (patch: Partial<PurchaseOrder>) => Promise<void>
  onDelete: () => void
}) {
  const [lines, setLines] = useState<PurchaseOrderLine[]>([])
  const [jobs, setJobs] = useState<JobOption[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([])
  const [loadingLines, setLoadingLines] = useState(true)

  const loadLines = useCallback(async () => {
    const [l, j, wo] = await Promise.all([
      getPurchaseOrderLines(po.id),
      getJobOptions(),
      getWorkOrderOptions(),
    ])
    setLines(l)
    setJobs(j)
    setWorkOrders(wo)
    setLoadingLines(false)
  }, [po.id])

  useEffect(() => { loadLines() }, [loadLines])

  function blurSave(field: keyof PurchaseOrder) {
    return (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = e.target.value
      onUpdate({ [field]: val === '' ? null : val })
    }
  }

  async function handleAddLine() {
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

  const subtotal = lines.reduce((s, l) => s + (l.qty || 0) * (l.unit_cost || 0), 0)
  const gst      = lines.reduce((s, l) => s + (l.qty || 0) * (l.unit_cost || 0) * (l.gst_rate ?? 0.1), 0)
  const total    = subtotal + gst

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="space-y-3">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-2">
            <Label>PO Number</Label>
            <input type="text" defaultValue={po.po_number || ''} onBlur={blurSave('po_number')} placeholder="PO-001" className={inputCls} />
          </div>
          <div className="col-span-4">
            <Label>Supplier</Label>
            <select
              defaultValue={po.supplier_id}
              onChange={(e) => onUpdate({ supplier_id: e.target.value })}
              className={inputCls}
            >
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
            </select>
          </div>
          <div className="col-span-3">
            <Label>Status</Label>
            <select
              defaultValue={po.status}
              onChange={(e) => onUpdate({ status: e.target.value as POStatus })}
              className={inputCls}
            >
              {PO_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <Label>Order Date</Label>
            <input type="date" defaultValue={po.order_date?.slice(0, 10) || ''} onBlur={blurSave('order_date')} className={inputCls} />
          </div>
          <div className="col-span-1 flex flex-col justify-end">
            <button type="button" onClick={onDelete} className="text-xs text-danger hover:opacity-80 px-2 py-2">Delete</button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-3">
            <Label>Required By</Label>
            <input type="date" defaultValue={po.required_by?.slice(0, 10) || ''} onBlur={blurSave('required_by')} className={inputCls} />
          </div>
          <div className="col-span-3">
            <Label>Delivery Name</Label>
            <input type="text" defaultValue={po.delivery_name || ''} onBlur={blurSave('delivery_name')} placeholder="Delivery to…" className={inputCls} />
          </div>
          <div className="col-span-3">
            <Label>Delivery Suburb</Label>
            <input type="text" defaultValue={po.delivery_suburb || ''} onBlur={blurSave('delivery_suburb')} placeholder="Suburb" className={inputCls} />
          </div>
          <div className="col-span-3">
            <Label>Delivery Postcode</Label>
            <input type="text" defaultValue={po.delivery_postcode || ''} onBlur={blurSave('delivery_postcode')} placeholder="Postcode" className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Notes</Label>
            <textarea defaultValue={po.notes || ''} onBlur={blurSave('notes')} rows={2} placeholder="Notes for supplier…" className={inputCls + ' resize-none'} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label>Internal Notes</Label>
              <span className="text-[10px] uppercase tracking-widest font-medium px-1.5 py-0.5 rounded bg-warning-bg text-warning border border-warning-border">Internal only</span>
            </div>
            <textarea defaultValue={po.internal_notes || ''} onBlur={blurSave('internal_notes')} rows={2} placeholder="Internal notes…" className={inputCls + ' resize-none'} />
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* Lines */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Lines</h3>
          <button
            type="button"
            onClick={handleAddLine}
            className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover transition-colors"
          >
            <Plus size={12} /> Add Line
          </button>
        </div>

        {loadingLines ? (
          <p className="text-text-subtle text-sm">Loading…</p>
        ) : lines.length === 0 ? (
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
                    <Th>Job</Th>
                    <Th>Work Order</Th>
                    <Th>Item</Th>
                    <Th>Description</Th>
                    <Th right>Qty</Th>
                    <Th right>Unit Cost</Th>
                    <Th right>GST%</Th>
                    <Th right>Total</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <POLineRow
                      key={line.id}
                      line={line}
                      jobs={jobs}
                      workOrders={workOrders}
                      onUpdate={(patch) => handleUpdateLine(line.id, patch)}
                      onDelete={() => handleDeleteLine(line.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end pt-4">
              <div className="space-y-1 min-w-[240px]">
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
    </div>
  )
}

// ── PO Line Row ───────────────────────────────────────────────────────────────

function POLineRow({
  line, jobs, workOrders, onUpdate, onDelete,
}: {
  line: PurchaseOrderLine
  jobs: JobOption[]
  workOrders: WorkOrderOption[]
  onUpdate: (patch: Partial<PurchaseOrderLine>) => void
  onDelete: () => void
}) {
  const lineTotal = (line.qty || 0) * (line.unit_cost || 0) * (1 + (line.gst_rate ?? 0.1))
  const jobWorkOrders = workOrders.filter((wo) => wo.job_id === line.job_id)

  const blurText = (field: keyof PurchaseOrderLine) =>
    (e: React.FocusEvent<HTMLInputElement>) => onUpdate({ [field]: e.target.value || null })

  const blurNum = (field: keyof PurchaseOrderLine) =>
    (e: React.FocusEvent<HTMLInputElement>) => onUpdate({ [field]: parseFloat(e.target.value) || 0 })

  return (
    <tr className="border-b border-border hover:bg-surface-hover group">
      {/* Job */}
      <td className="px-1 py-1 min-w-[160px]">
        <select
          value={line.job_id || ''}
          onChange={(e) => onUpdate({ job_id: e.target.value || null, work_order_id: null })}
          className={cellCls}
        >
          <option value="">— No job —</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.job_number}{j.client_name ? ` · ${j.client_name}` : ''}{j.title ? ` · ${j.title}` : ''}
            </option>
          ))}
        </select>
      </td>

      {/* Work Order */}
      <td className="px-1 py-1 min-w-[140px]">
        <select
          value={line.work_order_id || ''}
          onChange={(e) => onUpdate({ work_order_id: e.target.value || null })}
          className={cellCls}
          disabled={!line.job_id}
        >
          <option value="">— None —</option>
          {jobWorkOrders.map((wo) => (
            <option key={wo.id} value={wo.id}>
              {wo.work_order_number || 'WO'}{wo.title ? ` · ${wo.title}` : ''}
            </option>
          ))}
        </select>
      </td>

      <td className="px-1 py-1 min-w-[120px]">
        <input type="text" defaultValue={line.item || ''} onBlur={blurText('item')} placeholder="Item" className={cellCls} />
      </td>
      <td className="px-1 py-1 min-w-[160px]">
        <input type="text" defaultValue={line.description || ''} onBlur={blurText('description')} placeholder="Description" className={cellCls} />
      </td>
      <td className="px-1 py-1 w-16">
        <input type="number" defaultValue={line.qty} onBlur={blurNum('qty')} min={0} className={cellCls + ' text-right'} />
      </td>
      <td className="px-1 py-1 w-24">
        <input type="number" defaultValue={line.unit_cost} onBlur={blurNum('unit_cost')} min={0} step={0.01} className={cellCls + ' text-right'} />
      </td>
      <td className="px-1 py-1 w-16">
        <input
          type="number"
          defaultValue={(line.gst_rate ?? 0.1) * 100}
          onBlur={(e) => onUpdate({ gst_rate: (parseFloat(e.target.value) || 0) / 100 })}
          min={0} max={100} step={1}
          className={cellCls + ' text-right'}
        />
      </td>
      <td className="px-2 py-1 w-24 text-right font-medium text-text tabular-nums">
        {formatCurrency(lineTotal)}
      </td>
      <td className="px-2 py-1 w-8 text-center">
        <button type="button" onClick={onDelete} className="text-text-faint hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-xs font-medium text-text-muted mb-1">{children}</span>
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={`py-1.5 px-2 text-[10px] uppercase tracking-widest font-medium text-text-subtle whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border'
const cellCls  = 'w-full px-1.5 py-1 text-xs bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none'
