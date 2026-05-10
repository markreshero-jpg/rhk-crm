'use client'

import { useState } from 'react'
import { Package, Printer, CheckCircle2 } from 'lucide-react'
import { PurchaseOrder, PurchaseOrderLine } from '@/lib/purchaseOrders'
import { createPOReceipt } from '@/lib/purchaseOrderReceipts'

const inputCls = 'w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border disabled:bg-surface-muted disabled:text-text-faint disabled:cursor-not-allowed'

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-xs font-medium text-text-muted mb-1">{children}</span>
}

export default function ReceiveGoodsModal({ po, lines, onClose, onSaved }: {
  po: PurchaseOrder
  lines: PurchaseOrderLine[]
  onClose: () => void
  onSaved: () => void
}) {
  const nowLocal = () => {
    const d = new Date()
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }
  const [receivedAt, setReceivedAt] = useState(nowLocal)
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
  const [labelChecks, setLabelChecks] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const l of lines) init[l.id] = true
    return init
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasAnything = Object.values(qtys).some((q) => q > 0)
  const labelCount = lines.filter((l) => labelChecks[l.id]).length

  function handlePrintLabels() {
    const toPrint = lines.filter((l) => labelChecks[l.id])
    if (!toPrint.length) return
    const win = window.open('', '_blank', 'width=500,height=400')
    if (!win) return
    const labelHtml = toPrint.map((l) => `
      <div class="label">
        <div class="wo">${l.work_order_number || l.job_number || '—'}</div>
        <div class="client">${l.client_name || '—'}</div>
        ${l.item ? `<div class="item">${l.item}${l.item_code ? ` &middot; ${l.item_code}` : ''}</div>` : ''}
        <div class="po">PO: ${po.po_number || '—'}</div>
      </div>`).join('')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: 89mm 36mm; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; }
      .label { width: 89mm; height: 36mm; padding: 3mm 5mm; page-break-after: always; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
      .label:last-child { page-break-after: avoid; }
      .wo { font-size: 17pt; font-weight: 700; line-height: 1.1; }
      .client { font-size: 11pt; margin-top: 1.5mm; }
      .item { font-size: 8pt; color: #555; margin-top: 1mm; }
      .po { font-size: 7pt; color: #999; margin-top: 2mm; }
    </style></head><body>${labelHtml}</body></html>`)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 300)
  }

  async function handleSave() {
    if (!hasAnything) { setError('Enter a quantity for at least one line.'); return }
    setSaving(true)
    setError(null)
    try {
      await createPOReceipt({
        purchase_order_id: po.id,
        received_at: new Date(receivedAt).toISOString(),
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Date &amp; Time Received</Label>
              <input type="datetime-local" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className={inputCls} />
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

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-2 text-[10px] uppercase tracking-wider text-text-faint font-medium pr-3">Item</th>
                <th className="text-right pb-2 text-[10px] uppercase tracking-wider text-text-faint font-medium pr-3 w-20">Ordered</th>
                <th className="text-right pb-2 text-[10px] uppercase tracking-wider text-text-faint font-medium pr-3 w-20">Already<br/>Received</th>
                <th className="text-right pb-2 text-[10px] uppercase tracking-wider text-text-faint font-medium pr-3 w-24">Outstanding</th>
                <th className="text-right pb-2 text-[10px] uppercase tracking-wider text-text-faint font-medium pr-3 w-28">Receive Now</th>
                <th className="text-center pb-2 text-[10px] uppercase tracking-wider text-text-faint font-medium w-12">Label</th>
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
                    <td className="py-2 pr-3 text-right">
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
                    <td className="py-2 text-center">
                      <input
                        type="checkbox"
                        checked={labelChecks[l.id] ?? true}
                        onChange={(e) => setLabelChecks((p) => ({ ...p, [l.id]: e.target.checked }))}
                        className="accent-accent w-3.5 h-3.5"
                      />
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
          <button type="button" onClick={handlePrintLabels} disabled={labelCount === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-sm bg-surface border border-border text-text-muted rounded-md hover:bg-surface-hover disabled:opacity-40 transition-colors whitespace-nowrap">
            <Printer size={14} /> Print Labels{labelCount > 0 ? ` (${labelCount})` : ''}
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
