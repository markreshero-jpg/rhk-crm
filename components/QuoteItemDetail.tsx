'use client'

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ListOrdered, ChevronLeft, Sparkles } from 'lucide-react'
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
import { getSupplierItemByCode } from '@/lib/supplierItems'
import { QuoteItemWithContext, QuoteItem } from '@/lib/quoteItems'
import { getAllQuoteItemTemplates, importTemplateToIssue, QuoteItemTemplate } from '@/lib/quoteItemTemplates'
import { duplicateQuoteItem } from '@/lib/quoteItems'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import LabourTypeInput from '@/components/LabourTypeInput'


export default function QuoteItemDetail({
  item,
  onUpdateField,
  siblings,
  onNewItem,
}: {
  item: QuoteItemWithContext
  onUpdateField: (field: 'name' | 'qty' | 'notes', value: string | number) => Promise<void>
  siblings?: QuoteItem[]
  onNewItem?: (name: string) => void
}) {
  const [lines, setLines] = useState<QuoteItemLine[]>([])
  const [labour, setLabour] = useState<QuoteItemLabour[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [focusLineId, setFocusLineId] = useState<string | null>(null)
  const [focusLabourId, setFocusLabourId] = useState<string | null>(null)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [showAiPaste, setShowAiPaste] = useState(false)
  const [writtenQuoteView, setWrittenQuoteView] = useState(false)
  const [filterNoEntries, setFilterNoEntries] = useState(false)
  const [colWidths, setColWidths] = useState({ item: 144, description: 320, supplier: 128, code: 96 })
  const resizeDrag = useRef<{ col: keyof typeof colWidths; startX: number; startWidth: number } | null>(null)

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

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const drag = resizeDrag.current
      if (!drag) return
      const delta = e.clientX - drag.startX
      const newWidth = Math.max(60, drag.startWidth + delta)
      setColWidths(prev => ({ ...prev, [drag.col]: newWidth }))
    }
    function onMouseUp() {
      if (!resizeDrag.current) return
      resizeDrag.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  function startResize(col: keyof typeof colWidths, e: React.MouseEvent) {
    e.preventDefault()
    resizeDrag.current = { col, startX: e.clientX, startWidth: colWidths[col] }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

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

  async function handleAiParsed(
    parsed: { item?: string; item_code?: string; description?: string; price?: number | null },
    insertAfterSort: number | null,
  ) {
    const newLine = await createQuoteItemLine({
      quote_item_id: item.id,
      item: parsed.item || '',
      description: parsed.description || '',
      item_code: parsed.item_code || '',
      price: parsed.price ?? 0,
      qty: 1,
      markup_percent: 50,
      ...(insertAfterSort != null ? { sort: insertAfterSort + 0.5 } : {}),
    })
    setFocusLineId(newLine.id)
    setShowAiPaste(false)
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

  async function handleItemCodeSave(lineId: string, code: string, currentSupplierId: string | null) {
    const match = code.trim() ? await getSupplierItemByCode(code.trim(), currentSupplierId) : null
    if (match) {
      await updateQuoteItemLine(lineId, {
        item_code: code,
        item: match.item ?? '',
        description: match.description ?? '',
        price: match.cost,
        supplier_id: match.supplier_id,
      })
    } else {
      await updateQuoteItemLine(lineId, { item_code: code })
    }
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
    try {
      await renumberQuoteItemLines(item.id)
      await loadAll()
    } catch (err) {
      console.error('Renumber lines failed:', err)
      alert('Renumber failed: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  async function handleRenumberLabour() {
    try {
      await renumberLabour(item.id)
      await loadAll()
    } catch (err) {
      console.error('Renumber labour failed:', err)
      alert('Renumber failed: ' + (err instanceof Error ? err.message : String(err)))
    }
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

  const displayLines  = filterNoEntries ? lines.filter((l)  => (l.qty || 0) !== 0) : lines
  const displayLabour = filterNoEntries ? labour.filter((l) => (l.qty || 0) !== 0) : labour

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

      {/* Item tabs */}
      {siblings && siblings.length > 0 && (
        <>
          <div className="flex items-end gap-1 overflow-x-auto">
            {siblings.map((sibling) => {
              const isActive = sibling.id === item.id
              return (
                <Link
                  key={sibling.id}
                  href={`/quote-items/${sibling.id}`}
                  className={`px-4 py-2 text-sm rounded-t-md border-l border-t border-r whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-surface border-border text-text font-medium'
                      : 'bg-surface-muted border-border text-text-muted hover:text-text hover:bg-surface'
                  }`}
                >
                  {sibling.name || <span className="italic text-text-faint">Unnamed</span>}
                </Link>
              )
            })}
            {onNewItem && (
              <button
                type="button"
                onClick={() => setShowTemplatePicker(true)}
                className="flex items-center gap-1 px-3 py-2 text-sm rounded-t-md border-l border-t border-r border-border bg-surface-muted text-text-faint hover:text-text hover:bg-surface transition-colors"
                title="New item"
              >
                <Plus size={13} />
              </button>
            )}
          </div>
          <div className="border-t border-border mb-4" />
        </>
      )}

      {/* Template picker for new room */}
      {showTemplatePicker && (
        <RoomTemplatePicker
          onImport={async (templateId, name) => {
            const newId = await importTemplateToIssue(templateId, item.issue.id, name)
            setShowTemplatePicker(false)
            router.push(`/quote-items/${newId}`)
          }}
          onCreateBlank={() => {
            setShowTemplatePicker(false)
            onNewItem?.('')
          }}
          onDuplicate={async () => {
            const newItem = await duplicateQuoteItem(item.id)
            setShowTemplatePicker(false)
            router.push(`/quote-items/${newItem.id}`)
          }}
          currentItemName={item.name || 'this item'}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

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
                    onClick={() => setWrittenQuoteView((v) => !v)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                      writtenQuoteView
                        ? 'bg-accent text-accent-text border-accent hover:bg-accent-hover'
                        : 'text-text-muted bg-surface border-border-strong hover:bg-surface-hover'
                    }`}
                  >
                    {writtenQuoteView ? 'Detail View' : 'Written Quote View'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterNoEntries((v) => !v)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                      filterNoEntries
                        ? 'bg-accent text-accent-text border-accent hover:bg-accent-hover'
                        : 'text-text-muted bg-surface border-border-strong hover:bg-surface-hover'
                    }`}
                  >
                    {filterNoEntries ? 'Show All' : 'Filter No Entries'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAiPaste(true)}
                    className="flex items-center gap-1.5 text-xs text-text-muted bg-surface border border-border-strong px-3 py-1.5 rounded-md hover:bg-surface-hover"
                  >
                    <Sparkles size={12} /> AI Paste
                  </button>
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

              <div className="border border-border rounded-md overflow-auto max-h-[34rem]">
                <table className="w-full table-fixed [&_td]:border-r [&_td]:border-border [&_th]:border-r [&_th]:border-border" style={{ minWidth: 544 + colWidths.item + colWidths.description + (writtenQuoteView ? 0 : colWidths.supplier + colWidths.code) }}>
                  <colgroup>
                    <col style={{ width: 32 }} />
                    <col style={{ width: colWidths.item }} />
                    <col style={{ width: colWidths.description }} />
                    {writtenQuoteView ? (
                      <col />
                    ) : (
                      <>
                        <col style={{ width: colWidths.supplier }} />
                        <col style={{ width: colWidths.code }} />
                        <col style={{ width: 80 }} />
                        <col style={{ width: 40 }} />
                        <col style={{ width: 80 }} />
                        <col style={{ width: 64 }} />
                        <col style={{ width: 80 }} />
                        <col style={{ width: 56 }} />
                        <col style={{ width: 80 }} />
                      </>
                    )}
                    <col style={{ width: 32 }} />
                  </colgroup>
                  <thead className="bg-surface-muted border-b border-border sticky top-0 z-10">
                    <tr className="text-left text-[10px] uppercase tracking-wider text-text-subtle">
                      <th className="px-1.5 py-1 font-medium">Sort</th>
                      <th className="px-1.5 py-1 font-medium relative">
                        Item
                        <div onMouseDown={(e) => startResize('item', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent/40 z-10" />
                      </th>
                      <th className="px-1.5 py-1 font-medium relative">
                        Description
                        <div onMouseDown={(e) => startResize('description', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent/40 z-10" />
                      </th>
                      {writtenQuoteView ? (
                        <th className="px-1.5 py-1 font-medium">Written Quote</th>
                      ) : (
                        <>
                          <th className="px-1.5 py-1 font-medium relative">
                            Supplier
                            <div onMouseDown={(e) => startResize('supplier', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent/40 z-10" />
                          </th>
                          <th className="px-1.5 py-1 font-medium relative">
                            Code
                            <div onMouseDown={(e) => startResize('code', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent/40 z-10" />
                          </th>
                          <th className="px-1.5 py-1 font-medium text-right">Price</th>
                          <th className="px-1.5 py-1 font-medium text-right">Qty</th>
                          <th className="px-1.5 py-1 font-medium text-right">Sub Total</th>
                          <th className="px-1.5 py-1 font-medium text-right">Markup</th>
                          <th className="px-1.5 py-1 font-medium text-right">Sub + Mup</th>
                          <th className="px-1.5 py-1 font-medium text-right">GST</th>
                          <th className="px-1.5 py-1 font-medium text-right">Total</th>
                        </>
                      )}
                      <th className="px-1.5 py-1 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border [&_tr:nth-child(even)]:bg-surface-muted/40">
                    {displayLines.length === 0 ? (
                      <tr>
                        <td colSpan={writtenQuoteView ? 5 : 13} className="px-4 py-8 text-center text-text-subtle text-sm italic">
                          {lines.length === 0 ? 'No material lines yet. Click “New Line” to add one.' : 'No lines match the current filter.'}
                        </td>
                      </tr>
                    ) : (
                      displayLines.map((line) => (
                        <LineRow
                          key={line.id}
                          line={line}
                          suppliers={suppliers}
                          shouldFocus={focusLineId === line.id}
                          onFocused={() => setFocusLineId(null)}
                          onUpdate={handleUpdateLine}
                          onItemCodeSave={handleItemCodeSave}
                          onDelete={() => handleDeleteLine(line)}
                          writtenQuoteView={writtenQuoteView}
                        />
                      ))
                    )}
                  </tbody>
                  {lines.length > 0 && !writtenQuoteView && (
                    <tfoot className="bg-surface-muted border-t border-border sticky bottom-0 z-10">
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
                    {displayLabour.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-text-subtle text-sm italic">
                          {labour.length === 0 ? 'No labour lines yet.' : 'No lines match the current filter.'}
                        </td>
                      </tr>
                    ) : (
                      displayLabour.map((lab) => (
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

      {showAiPaste && (
        <SupplierPasteModal
          onParsed={handleAiParsed}
          onClose={() => setShowAiPaste(false)}
        />
      )}
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
  onItemCodeSave,
  onDelete,
  writtenQuoteView,
}: {
  line: QuoteItemLine
  suppliers: Supplier[]
  shouldFocus: boolean
  onFocused: () => void
  onUpdate: (id: string, field: keyof QuoteItemLine, value: string | number | boolean | null) => Promise<void>
  onItemCodeSave: (lineId: string, code: string, currentSupplierId: string | null) => Promise<void>
  onDelete: () => void
  writtenQuoteView: boolean
}) {
  const itemRef = useRef<HTMLTextAreaElement>(null)

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

  if (writtenQuoteView) {
    return (
      <tr className="hover:bg-surface-hover group">
        <td className="px-1 py-0">
          <InlineNumberField value={line.sort} onSave={(v) => onUpdate(line.id, 'sort', v)} className="font-mono text-text-faint" />
        </td>
        <td className="px-1 py-0">
          <InlineTextArea ref={itemRef} value={line.item || ''} onSave={(v) => onUpdate(line.id, 'item', v)} placeholder="item" className="text-text" />
        </td>
        <td className="px-1 py-0">
          <InlineTextArea value={line.description || ''} onSave={(v) => onUpdate(line.id, 'description', v)} placeholder="description" className="text-text-muted" />
        </td>
        <td className="px-1 py-0">
          <InlineTextField value={line.written_quote_text || ''} onSave={(v) => onUpdate(line.id, 'written_quote_text', v)} placeholder="Written quote brief..." className="text-text-muted" />
        </td>
        <td className="px-1 py-0">
          <button type="button" onClick={onDelete} className="text-text-faint hover:text-danger" title="Delete">
            <Trash2 size={14} />
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-surface-hover group">
      <td className="px-1 py-0">
        <InlineNumberField value={line.sort} onSave={(v) => onUpdate(line.id, 'sort', v)} className="font-mono text-text-faint" />
      </td>
      <td className="px-1 py-0">
        <InlineTextArea ref={itemRef} value={line.item || ''} onSave={(v) => onUpdate(line.id, 'item', v)} placeholder="item" className="text-text" />
      </td>
      <td className="px-1 py-0">
        <InlineTextArea value={line.description || ''} onSave={(v) => onUpdate(line.id, 'description', v)} placeholder="description" className="text-text-muted" />
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
        <InlineTextField value={line.item_code || ''} onSave={(v) => onItemCodeSave(line.id, v, line.supplier_id ?? null)} className="text-text-muted text-xs font-mono" />
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

// ===== Room template picker modal =====

function RoomTemplatePicker({
  onImport,
  onCreateBlank,
  onDuplicate,
  currentItemName,
  onClose,
}: {
  onImport: (templateId: string, name: string) => Promise<void>
  onCreateBlank: () => void
  onDuplicate: () => Promise<void>
  currentItemName: string
  onClose: () => void
}) {
  const [templates, setTemplates] = useState<QuoteItemTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [importName, setImportName] = useState('')
  const [importing, setImporting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  useEffect(() => {
    getAllQuoteItemTemplates().then((data) => {
      setTemplates(data)
      setLoadingTemplates(false)
    })
  }, [])

  function handleSelect(t: QuoteItemTemplate) {
    setSelectedId(t.id)
    setImportName(t.name)
  }

  async function handleImport() {
    if (!selectedId || !importName.trim()) return
    setImporting(true)
    try {
      await onImport(selectedId, importName.trim())
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface border border-border rounded-lg shadow-xl w-[480px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium text-text">New Room</h3>
          <p className="text-xs text-text-subtle mt-0.5">Pick a template or start with a blank room.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          <div className="mb-3 pb-3 border-b border-border">
            <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-2">Quick Options</p>
            <button
              type="button"
              disabled={duplicating}
              onClick={async () => { setDuplicating(true); await onDuplicate() }}
              className="w-full text-left px-3 py-2.5 rounded-md hover:bg-surface-hover text-text transition-colors disabled:opacity-50"
            >
              <div className="text-sm font-medium">Duplicate &ldquo;{currentItemName}&rdquo;</div>
              <div className="text-xs text-text-subtle mt-0.5">Copy this item with all its material and labour lines</div>
            </button>
          </div>

          {loadingTemplates ? (
            <p className="text-text-subtle text-sm p-4 text-center">Loading templates...</p>
          ) : templates.length === 0 ? (
            <p className="text-text-subtle text-sm p-4 text-center italic">No templates available.</p>
          ) : (
            <>
            <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-2">Import from Template</p>
            <ul className="space-y-1">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(t)}
                    className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                      selectedId === t.id ? 'bg-accent text-accent-text' : 'hover:bg-surface-hover text-text'
                    }`}
                  >
                    <div className="text-sm font-medium">{t.name}</div>
                    {(t.category || t.description) && (
                      <div className={`text-xs mt-0.5 ${selectedId === t.id ? 'text-accent-text/70' : 'text-text-subtle'}`}>
                        {t.category && <span>{t.category}</span>}
                        {t.category && t.description && ' — '}
                        {t.description && <span>{t.description}</span>}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            </>
          )}
        </div>

        {selectedId && (
          <div className="px-5 py-3 border-t border-border bg-surface-muted">
            <label className="text-xs text-text-subtle block mb-1">Name for this room</label>
            <input
              type="text"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleImport()
                else if (e.key === 'Escape') onClose()
              }}
              autoFocus
              className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
            />
          </div>
        )}

        <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onCreateBlank}
            className="px-3 py-1.5 text-xs text-text-muted border border-border-strong rounded-md hover:bg-surface-hover"
          >
            Create blank
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-text-muted hover:text-text">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!selectedId || !importName.trim() || importing}
              className="px-3 py-1.5 text-xs bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50"
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== AI supplier paste modal =====

function SupplierPasteModal({
  onParsed,
  onClose,
}: {
  onParsed: (parsed: { item?: string; item_code?: string; description?: string; price?: number | null }, insertAfterSort: number | null) => void
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [insertAfter, setInsertAfter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  async function handleParse() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/parse-supplier-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('Parse failed')
      const data = await res.json()
      const sortNum = insertAfter.trim() !== '' ? parseFloat(insertAfter) : null
      onParsed(data, isNaN(sortNum as number) ? null : sortNum)
    } catch {
      setError('Could not parse the text. Try including more detail.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface border border-border rounded-lg shadow-xl w-[480px]" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium text-text flex items-center gap-1.5">
            <Sparkles size={14} /> AI Paste from Supplier
          </h3>
          <p className="text-xs text-text-subtle mt-0.5">Paste any product text — code, description, price — and it will fill the line.</p>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParse()
              else if (e.key === 'Escape') onClose()
            }}
            placeholder="Paste supplier product text here…"
            rows={5}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface-muted focus:outline-none focus:border-accent resize-none"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-subtle whitespace-nowrap">Insert after line:</label>
            <input
              type="number"
              value={insertAfter}
              onChange={(e) => setInsertAfter(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleParse() }}
              placeholder="leave blank to add at end"
              className="flex-1 px-2.5 py-1 text-xs border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-text-muted hover:text-text">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleParse}
            disabled={!text.trim() || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50"
          >
            <Sparkles size={11} />
            {loading ? 'Parsing…' : 'Add Line (⌘↵)'}
          </button>
        </div>
      </div>
    </div>
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
      className={`w-full text-[13px] bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none ${inputClass} ${className}`}
    />
  )
}

function InlineTextArea({
  ref: externalRef,
  value,
  onSave,
  placeholder,
  className = '',
}: {
  ref?: React.RefObject<HTMLTextAreaElement | null>
  value: string
  onSave: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const [local, setLocal] = useState(value)
  const internalRef = useRef<HTMLTextAreaElement>(null)
  const ref = externalRef ?? internalRef

  useEffect(() => { setLocal(value) }, [value])

  function resize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useLayoutEffect(() => {
    if (ref.current) resize(ref.current)
  }, [value, local])

  function commit() { if (local !== value) onSave(local) }

  return (
    <textarea
      ref={ref}
      value={local}
      onChange={(e) => { setLocal(e.target.value); resize(e.target) }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { setLocal(value); e.currentTarget.blur() }
      }}
      placeholder={placeholder}
      rows={1}
      className={`w-full px-1.5 py-0.5 text-[13px] leading-snug bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none resize-none overflow-hidden ${className}`}
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
    const trimmed = local.trim()
    if (trimmed === '') {
      if (value !== 0) onSave(0)
      setLocal(decimals != null ? (0).toFixed(decimals) : '0')
      return
    }
    const n = parseFloat(trimmed)
    if (isNaN(n)) {
      setLocal(decimals != null ? value.toFixed(decimals) : String(value))
      return
    }
    if (n !== value) onSave(n)
  }

  return (
    <div className={`flex items-baseline ${widthClass}`}>
      <input
        type="text"
        inputMode="decimal"
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
        className={`w-full px-1.5 py-0.5 text-[13px] bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none ${className}`}
      />
      {suffix && <span className="text-xs text-text-faint ml-0.5">{suffix}</span>}
    </div>
  )
}