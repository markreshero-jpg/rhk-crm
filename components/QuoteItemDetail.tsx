'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Trash2, ListOrdered, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import {
  getQuoteItemLinesByQuoteItemId,
  createQuoteItemLine,
  updateQuoteItemLine,
  deleteQuoteItemLine,
  renumberQuoteItemLines,
  lineSubtotal,
  lineSubtotalWithMarkup,
  lineGst,
  lineTotal,
  QuoteItemLine,
} from '@/lib/quoteItemLines'
import {
  getLabourByQuoteItemId,
  createLabour,
  updateLabour,
  deleteLabour,
  renumberLabour,
  labourSubtotal,
  labourSubtotalWithMarkup,
  labourGst,
  labourTotal,
  QuoteItemLabour,
} from '@/lib/quoteItemLabour'
import { getAllSuppliers, Supplier } from '@/lib/suppliers'
import { QuoteItemWithContext } from '@/lib/quoteItems'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'

export default function QuoteItemDetail({
  item,
  onUpdateField,
}: {
  item: QuoteItemWithContext
  onUpdateField: (field: 'name' | 'qty' | 'notes', value: string | number) => Promise<void>
}) {
  const [lines, setLines] = useState<QuoteItemLine[]>([])
  const [labour, setLabour] = useState<QuoteItemLabour[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [focusLineId, setFocusLineId] = useState<string | null>(null)
  const [focusLabourId, setFocusLabourId] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    const [l, la, s] = await Promise.all([
      getQuoteItemLinesByQuoteItemId(item.id),
      getLabourByQuoteItemId(item.id),
      getAllSuppliers(),
    ])
    setLines(l)
    setLabour(la)
    setSuppliers(s)
    setLoading(false)
  }, [item.id])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  async function handleAddLine() {
    const newLine = await createQuoteItemLine({
      quote_item_id: item.id,
      item: '',
      description: '',
      price: 0,
      qty: 1,
      markup_percent: 50,
    })
    setFocusLineId(newLine.id)
    await loadAll()
  }

  async function handleAddLabour() {
    const newLab = await createLabour({
      quote_item_id: item.id,
      type: '',
      price: 50,
      qty: 0,
      markup_percent: 100,
    })
    setFocusLabourId(newLab.id)
    await loadAll()
  }

  async function handleUpdateLine(id: string, field: keyof QuoteItemLine, value: string | number | boolean | null) {
    await updateQuoteItemLine(id, { [field]: value })
    await loadAll()
  }

  async function handleUpdateLabour(id: string, field: keyof QuoteItemLabour, value: string | number) {
    await updateLabour(id, { [field]: value })
    await loadAll()
  }

  async function handleDeleteLine(line: QuoteItemLine) {
    if (!confirm(`Delete line "${line.item || 'this line'}"?`)) return
    await deleteQuoteItemLine(line.id)
    await loadAll()
  }

  async function handleDeleteLabour(lab: QuoteItemLabour) {
    if (!confirm(`Delete labour "${lab.type || 'this labour line'}"?`)) return
    await deleteLabour(lab.id)
    await loadAll()
  }

  async function handleRenumberLines() {
    await renumberQuoteItemLines(item.id)
    await loadAll()
  }

  async function handleRenumberLabour() {
    await renumberLabour(item.id)
    await loadAll()
  }

  // ----- Forecast calculations -----
  // Materials cost = sum of (price × qty) before markup, ex GST
  const materialsCostExGst = lines.reduce((sum, l) => sum + lineSubtotal(l), 0)
  // Labour cost = sum of (price × qty) before markup, ex GST
  const labourCostExGst = labour.reduce((sum, l) => sum + labourSubtotal(l), 0)
  // Item total ex GST = sum of (subtotal + markup) for both lines and labour
  const linesExGst = lines.reduce((sum, l) => sum + lineSubtotalWithMarkup(l), 0)
  const labourExGst = labour.reduce((sum, l) => sum + labourSubtotalWithMarkup(l), 0)
  const itemTotalExGst = linesExGst + labourExGst
  const itemTotalIncGst = itemTotalExGst * 1.10
  // Profit = item total ex GST − materials cost − labour cost
  const profitExGst = itemTotalExGst - materialsCostExGst - labourCostExGst
  // Per hour turnover = item total ex GST / total labour hours
  const totalLabourHours = labour.reduce((sum, l) => sum + (l.qty || 0), 0)
  const perHrTurnover = totalLabourHours > 0 ? itemTotalExGst / totalLabourHours : 0
  // Percentages
  const materialsPercent = itemTotalExGst > 0 ? (materialsCostExGst / itemTotalExGst) * 100 : 0
  const labourPercent = itemTotalExGst > 0 ? (labourCostExGst / itemTotalExGst) * 100 : 0
  const profitPercent = itemTotalExGst > 0 ? (profitExGst / itemTotalExGst) * 100 : 0

  // Lines summary row
  const linesSubtotalCost = lines.reduce((sum, l) => sum + lineSubtotal(l), 0)
  const linesSubtotalIncMup = lines.reduce((sum, l) => sum + lineSubtotalWithMarkup(l), 0)
  const linesGst = lines.reduce((sum, l) => sum + lineGst(l), 0)
  const linesTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0)

  // Labour summary row
  const labourSubtotalCost = labour.reduce((sum, l) => sum + labourSubtotal(l), 0)
  const labourSubtotalIncMup = labour.reduce((sum, l) => sum + labourSubtotalWithMarkup(l), 0)
  const labourGstTotal = labour.reduce((sum, l) => sum + labourGst(l), 0)
  const labourTotalSum = labour.reduce((sum, l) => sum + labourTotal(l), 0)

  return (
    <div>
      {/* Header bar */}
      <div className="flex items-stretch gap-0 mb-3 border border-border rounded-md bg-surface-muted overflow-hidden">
        <div className="px-4 py-3 shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-1">Job</div>
          <Link
            href={`/jobs/${item.issue.job.id}?tab=quote`}
            className="text-sm font-medium text-text hover:text-accent flex items-center gap-0.5"
          >
            <ChevronLeft size={13} className="text-text-faint" />
            {item.issue.job.job_number}
            {item.issue.job.title ? ` · ${item.issue.job.title}` : ''}
          </Link>
        </div>
        <div className="w-px bg-border shrink-0" />
        <div className="px-4 py-3 shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-1">Issue</div>
          <div className="text-sm font-medium text-text">Issue {item.issue.issue_number}</div>
        </div>
        <div className="w-px bg-border shrink-0" />
        <div className="flex-1 px-4 py-3 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-1">Item Name</div>
          <InlineTextField
            value={item.name}
            onSave={(v) => onUpdateField('name', v)}
            placeholder="Item name (e.g. Kitchen)"
            className="font-medium text-text"
            inputClass="px-1 py-0"
          />
        </div>
        <div className="w-px bg-border shrink-0" />
        <div className="px-4 py-3 shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-1">Qty</div>
          <InlineNumberField
            value={item.qty}
            onSave={(v) => onUpdateField('qty', v)}
            className="text-text"
            widthClass="w-16"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="mb-4 max-w-2xl">
        <InlineTextField
          value={item.notes || ''}
          onSave={(v) => onUpdateField('notes', v)}
          placeholder="Optional notes (italic on printed quote)"
          className="text-sm italic text-text-muted"
          inputClass="px-2 py-1"
        />
      </div>

      {/* Forecast bar */}
      <div className="flex items-stretch gap-0 mb-6 border border-border rounded-md bg-surface-muted overflow-hidden">
        <ForecastCol label="Materials cost ex GST" value={formatCurrency(materialsCostExGst)} sub={formatPercent(materialsPercent)} />
        <ForecastCol label="Labour cost ex GST" value={formatCurrency(labourCostExGst)} sub={formatPercent(labourPercent)} />
        <ForecastCol label="Profit ex GST" value={formatCurrency(profitExGst)} sub={formatPercent(profitPercent)} />
        <div className="w-px bg-border shrink-0" />
        <ForecastCol label="Item total ex GST" value={formatCurrency(itemTotalExGst)} />
        <ForecastCol label="Item total inc GST" value={formatCurrency(itemTotalIncGst)} strong />
        <div className="w-px bg-border shrink-0" />
        <ForecastCol label="Per hr turnover" value={formatCurrency(perHrTurnover)} />
      </div>

      {/* Tables */}
      <div className="space-y-8">
        {loading ? (
          <p className="text-text-subtle text-sm">Loading...</p>
        ) : (
          <>
            {/* Material Lines */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
                  Material Lines
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover"
                  >
                    <Plus size={12} /> New Line
                  </button>
                  <button
                    type="button"
                    onClick={handleRenumberLines}
                    disabled={lines.length === 0}
                    className="flex items-center gap-1.5 text-xs text-text-muted bg-surface border border-border-strong px-3 py-1.5 rounded-md hover:bg-surface-hover disabled:opacity-50"
                  >
                    <ListOrdered size={12} /> Renumber
                  </button>
                </div>
              </div>

              <div className="border border-border rounded-md overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead className="bg-surface-muted border-b border-border">
                    <tr className="text-left text-[10px] uppercase tracking-wider text-text-subtle">
                      <th className="px-1.5 py-1 font-medium w-14">Sort</th>
                      <th className="px-1.5 py-1 font-medium w-40">Item</th>
                      <th className="px-1.5 py-1 font-medium">Description</th>
                      <th className="px-1.5 py-1 font-medium w-32">Supplier</th>
                      <th className="px-1.5 py-1 font-medium w-24">Code</th>
                      <th className="px-1.5 py-1 font-medium w-24 text-right">Price</th>
                      <th className="px-1.5 py-1 font-medium w-16 text-right">Qty</th>
                      <th className="px-1.5 py-1 font-medium w-20 text-right">Sub Total</th>
                      <th className="px-1.5 py-1 font-medium w-16 text-right">Markup</th>
                      <th className="px-1.5 py-1 font-medium w-24 text-right">Sub + Mup</th>
                      <th className="px-1.5 py-1 font-medium w-20 text-right">GST</th>
                      <th className="px-1.5 py-1 font-medium w-24 text-right">Total</th>
                      <th className="px-1.5 py-1 font-medium w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border [&_tr:nth-child(even)]:bg-surface-muted/40">
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="px-4 py-8 text-center text-text-subtle text-sm italic">
                          No material lines yet. Click &quot;New Line&quot; to add one.
                        </td>
                      </tr>
                    ) : (
                      lines.map((line) => (
                        <LineRow
                          key={line.id}
                          line={line}
                          suppliers={suppliers}
                          shouldFocus={focusLineId === line.id}
                          onFocused={() => setFocusLineId(null)}
                          onUpdate={handleUpdateLine}
                          onDelete={() => handleDeleteLine(line)}
                        />
                      ))
                    )}
                  </tbody>
                  {lines.length > 0 && (
                    <tfoot className="bg-surface-muted border-t border-border">
                      <tr className="text-[11px] text-text-muted">
                        <td colSpan={7} className="px-1.5 py-1 text-right font-medium">Totals:</td>
                        <td className="px-1.5 py-1 text-right">{formatCurrency(linesSubtotalCost)}</td>
                        <td></td>
                        <td className="px-1.5 py-1 text-right">{formatCurrency(linesSubtotalIncMup)}</td>
                        <td className="px-1.5 py-1 text-right">{formatCurrency(linesGst)}</td>
                        <td className="px-1.5 py-1 text-right font-medium text-text">{formatCurrency(linesTotal)}</td>
                        <td></td>
                      </tr>
                      <tr className="text-[10px] text-text-faint">
                        <td colSpan={7} className="px-2 pb-2 text-right">subtotal cost</td>
                        <td></td>
                        <td></td>
                        <td className="px-2 pb-2 text-right">subtotal inc mup</td>
                        <td className="px-2 pb-2 text-right">gst</td>
                        <td className="px-2 pb-2 text-right">total</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>

            {/* Labour Lines */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
                  Labour
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddLabour}
                    className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover"
                  >
                    <Plus size={12} /> New Labour Line
                  </button>
                  <button
                    type="button"
                    onClick={handleRenumberLabour}
                    disabled={labour.length === 0}
                    className="flex items-center gap-1.5 text-xs text-text-muted bg-surface border border-border-strong px-3 py-1.5 rounded-md hover:bg-surface-hover disabled:opacity-50"
                  >
                    <ListOrdered size={12} /> Renumber
                  </button>
                </div>
              </div>

              <div className="border border-border rounded-md overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-surface-muted border-b border-border">
                    <tr className="text-left text-[10px] uppercase tracking-wider text-text-subtle">
                      <th className="px-1.5 py-1 font-medium w-14">Sort</th>
                      <th className="px-1.5 py-1 font-medium w-48">Type</th>
                      <th className="px-1.5 py-1 font-medium w-24 text-right">Price/Hr</th>
                      <th className="px-1.5 py-1 font-medium w-20 text-right">Hours</th>
                      <th className="px-1.5 py-1 font-medium w-24 text-right">Sub Total</th>
                      <th className="px-1.5 py-1 font-medium w-16 text-right">Markup</th>
                      <th className="px-1.5 py-1 font-medium w-24 text-right">Sub + Mup</th>
                      <th className="px-1.5 py-1 font-medium w-20 text-right">GST</th>
                      <th className="px-1.5 py-1 font-medium w-24 text-right">Total</th>
                      <th className="px-1.5 py-1 font-medium w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border [&_tr:nth-child(even)]:bg-surface-muted/40">
                    {labour.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-text-subtle text-sm italic">
                          No labour lines yet.
                        </td>
                      </tr>
                    ) : (
                      labour.map((lab) => (
                        <LabourRow
                          key={lab.id}
                          labour={lab}
                          shouldFocus={focusLabourId === lab.id}
                          onFocused={() => setFocusLabourId(null)}
                          onUpdate={handleUpdateLabour}
                          onDelete={() => handleDeleteLabour(lab)}
                        />
                      ))
                    )}
                  </tbody>
                  {labour.length > 0 && (
                    <tfoot className="bg-surface-muted border-t border-border">
                      <tr className="text-[11px] text-text-muted">
                        <td colSpan={3} className="px-1.5 py-1 text-right font-medium">
                          Total hrs: {formatNumber(totalLabourHours, 1)}
                        </td>
                        <td></td>
                        <td className="px-1.5 py-1 text-right">{formatCurrency(labourSubtotalCost)}</td>
                        <td></td>
                        <td className="px-1.5 py-1 text-right">{formatCurrency(labourSubtotalIncMup)}</td>
                        <td className="px-1.5 py-1 text-right">{formatCurrency(labourGstTotal)}</td>
                        <td className="px-1.5 py-1 text-right font-medium text-text">{formatCurrency(labourTotalSum)}</td>
                        <td></td>
                      </tr>
                      <tr className="text-[10px] text-text-faint">
                        <td colSpan={4}></td>
                        <td className="px-2 pb-2 text-right">subtotal cost</td>
                        <td></td>
                        <td className="px-2 pb-2 text-right">subtotal inc mup</td>
                        <td className="px-2 pb-2 text-right">gst</td>
                        <td className="px-2 pb-2 text-right">total</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function ForecastCol({
  label,
  value,
  sub,
  strong,
}: {
  label: string
  value: string
  sub?: string
  strong?: boolean
}) {
  return (
    <div className="flex-1 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-1">{label}</div>
      <div className={`text-sm ${strong ? 'font-semibold text-text' : 'font-medium text-text'}`}>
        {value}
        {sub && <span className="text-text-faint font-normal ml-1.5">{sub}</span>}
      </div>
    </div>
  )
}

// ===== Material line row =====

function LineRow({
  line,
  suppliers,
  shouldFocus,
  onFocused,
  onUpdate,
  onDelete,
}: {
  line: QuoteItemLine
  suppliers: Supplier[]
  shouldFocus: boolean
  onFocused: () => void
  onUpdate: (id: string, field: keyof QuoteItemLine, value: string | number | boolean | null) => Promise<void>
  onDelete: () => void
}) {
  const itemRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (shouldFocus && itemRef.current) {
      itemRef.current.focus()
      onFocused()
    }
  }, [shouldFocus, onFocused])

  const sub = lineSubtotal(line)
  const subMup = lineSubtotalWithMarkup(line)
  const gst = lineGst(line)
  const total = lineTotal(line)

  return (
    <tr className="hover:bg-surface-hover group">
      <td className="px-1 py-0">
        <InlineNumberField value={line.sort} onSave={(v) => onUpdate(line.id, 'sort', v)} className="font-mono text-text-faint" />
      </td>
      <td className="px-1 py-0">
        <InlineTextField ref={itemRef} value={line.item || ''} onSave={(v) => onUpdate(line.id, 'item', v)} placeholder="item" className="font-medium text-text" />
      </td>
      <td className="px-1 py-0">
        <InlineTextField value={line.description || ''} onSave={(v) => onUpdate(line.id, 'description', v)} placeholder="description" className="text-text-muted" />
      </td>
      <td className="px-1 py-0">
        <select
          value={line.supplier_id || ''}
          onChange={(e) => onUpdate(line.id, 'supplier_id', e.target.value || null)}
          className="w-full px-1.5 py-0.5 text-xs bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none text-text-muted"
        >
          <option value="">—</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.company_name}</option>
          ))}
        </select>
      </td>
      <td className="px-1 py-0">
        <InlineTextField value={line.item_code || ''} onSave={(v) => onUpdate(line.id, 'item_code', v)} className="text-text-muted text-xs font-mono" />
      </td>
      <td className="px-1 py-0">
        <InlineNumberField value={line.price} onSave={(v) => onUpdate(line.id, 'price', v)} className="text-right text-text" widthClass="w-full" decimals={2} />
      </td>
      <td className="px-1 py-0">
        <InlineNumberField value={line.qty} onSave={(v) => onUpdate(line.id, 'qty', v)} className="text-right text-text" widthClass="w-full" />
      </td>
      <td className="px-1.5 py-0.5 text-right text-xs text-text-muted">{formatCurrency(sub)}</td>
      <td className="px-1 py-0">
        <InlineNumberField value={line.markup_percent} onSave={(v) => onUpdate(line.id, 'markup_percent', v)} className="text-right text-text" widthClass="w-full" suffix="%" />
      </td>
      <td className="px-1.5 py-0.5 text-right text-xs text-text-muted">{formatCurrency(subMup)}</td>
      <td className="px-1.5 py-0.5 text-right text-xs text-text-faint">{formatCurrency(gst)}</td>
      <td className="px-1.5 py-0.5 text-right text-xs font-medium text-text">{formatCurrency(total)}</td>
      <td className="px-1 py-0">
        <button type="button" onClick={onDelete} className="text-text-faint hover:text-danger" title="Delete">
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

// ===== Labour row =====

function LabourRow({
  labour,
  shouldFocus,
  onFocused,
  onUpdate,
  onDelete,
}: {
  labour: QuoteItemLabour
  shouldFocus: boolean
  onFocused: () => void
  onUpdate: (id: string, field: keyof QuoteItemLabour, value: string | number) => Promise<void>
  onDelete: () => void
}) {
  const typeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (shouldFocus && typeRef.current) {
      typeRef.current.focus()
      onFocused()
    }
  }, [shouldFocus, onFocused])

  const sub = labourSubtotal(labour)
  const subMup = labourSubtotalWithMarkup(labour)
  const gst = labourGst(labour)
  const total = labourTotal(labour)

  return (
    <tr className="hover:bg-surface-hover group">
      <td className="px-1 py-0">
        <InlineNumberField value={labour.sort} onSave={(v) => onUpdate(labour.id, 'sort', v)} className="font-mono text-text-faint" />
      </td>
      <td className="px-1 py-0">
        <InlineTextField ref={typeRef} value={labour.type} onSave={(v) => onUpdate(labour.id, 'type', v)} placeholder="e.g. Cut & Edge" className="text-text" />
      </td>
      <td className="px-1 py-0">
        <InlineNumberField value={labour.price} onSave={(v) => onUpdate(labour.id, 'price', v)} className="text-right text-text" widthClass="w-full" decimals={2} />
      </td>
      <td className="px-1 py-0">
        <InlineNumberField value={labour.qty} onSave={(v) => onUpdate(labour.id, 'qty', v)} className="text-right text-text" widthClass="w-full" />
      </td>
      <td className="px-1.5 py-0.5 text-right text-xs text-text-muted">{formatCurrency(sub)}</td>
      <td className="px-1 py-0">
        <InlineNumberField value={labour.markup_percent} onSave={(v) => onUpdate(labour.id, 'markup_percent', v)} className="text-right text-text" widthClass="w-full" suffix="%" />
      </td>
      <td className="px-1.5 py-0.5 text-right text-xs text-text-muted">{formatCurrency(subMup)}</td>
      <td className="px-1.5 py-0.5 text-right text-xs text-text-faint">{formatCurrency(gst)}</td>
      <td className="px-1.5 py-0.5 text-right text-xs font-medium text-text">{formatCurrency(total)}</td>
      <td className="px-1 py-0">
        <button type="button" onClick={onDelete} className="text-text-faint hover:text-danger" title="Delete">
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

// ===== Inline editing primitives =====

const InlineTextField = function InlineTextField({
  ref,
  value,
  onSave,
  placeholder,
  className = '',
  inputClass = 'px-1.5 py-0.5',
}: {
  ref?: React.RefObject<HTMLInputElement | null>
  value: string
  onSave: (value: string) => void
  placeholder?: string
  className?: string
  inputClass?: string
}) {
  const [local, setLocal] = useState(value)

  useEffect(() => {
    setLocal(value)
  }, [value])

  function commit() {
    if (local !== value) onSave(local)
  }

  return (
    <input
      ref={ref}
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        else if (e.key === 'Escape') {
          setLocal(value)
          e.currentTarget.blur()
        }
      }}
      placeholder={placeholder}
      className={`w-full text-sm bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none ${inputClass} ${className}`}
    />
  )
}

function InlineNumberField({
  value,
  onSave,
  className = '',
  widthClass = '',
  suffix,
  decimals,
}: {
  value: number
  onSave: (value: number) => void
  className?: string
  widthClass?: string
  suffix?: string
  decimals?: number
}) {
  const [local, setLocal] = useState(decimals != null ? value.toFixed(decimals) : String(value))

  useEffect(() => {
    setLocal(decimals != null ? value.toFixed(decimals) : String(value))
  }, [value, decimals])

  function commit() {
    const n = parseFloat(local)
    if (isNaN(n)) {
      setLocal(decimals != null ? value.toFixed(decimals) : String(value))
      return
    }
    if (n !== value) onSave(n)
  }

  return (
    <div className={`flex items-baseline ${widthClass}`}>
      <input
        type="number"
        step="any"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          else if (e.key === 'Escape') {
            setLocal(decimals != null ? value.toFixed(decimals) : String(value))
            e.currentTarget.blur()
          }
        }}
        className={`w-full px-1.5 py-0.5 text-sm bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none ${className}`}
      />
      {suffix && <span className="text-xs text-text-faint ml-0.5">{suffix}</span>}
    </div>
  )
}