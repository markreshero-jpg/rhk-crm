'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  getLinesByParentId,
  createLineTemplate,
  updateLineTemplate,
  deleteLineTemplate,
  LineTemplate,
} from '@/lib/lineTemplates'
import {
  getLabourByParentId,
  createLabourTemplate,
  updateLabourTemplate,
  deleteLabourTemplate,
  LabourTemplate,
} from '@/lib/labourTemplates'
import { getAllSuppliers, Supplier } from '@/lib/suppliers'
import { QuoteItemTemplate } from '@/lib/quoteItemTemplates'
import LabourTypeInput from '@/components/LabourTypeInput'
import { getSupplierItemByCode } from '@/lib/supplierItems'



export default function QuoteItemTemplateDetail({
  template,
  onUpdate,
}: {
  template: QuoteItemTemplate
  onUpdate: (field: keyof QuoteItemTemplate, value: string | null) => Promise<void>
}) {
  const [lines, setLines] = useState<LineTemplate[]>([])
  const [labour, setLabour] = useState<LabourTemplate[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [focusLineId, setFocusLineId] = useState<string | null>(null)
  const [focusLabourId, setFocusLabourId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [l, la, s] = await Promise.all([
      getLinesByParentId(template.id),
      getLabourByParentId(template.id),
      getAllSuppliers(),
    ])
    setLines(l)
    setLabour(la)
    setSuppliers(s)
    setLoading(false)
  }, [template.id])

  useEffect(() => {
    load()
  }, [load])

  async function handleAddLine() {
    const n = await createLineTemplate({
      parent_template_id: template.id,
      item: '',
      price: 0,
      qty: 1,
      markup_percent: 50,
    })
    setFocusLineId(n.id)
    await load()
  }

  async function handleAddLabour() {
    const n = await createLabourTemplate({
      parent_template_id: template.id,
      type: '',
      price: 50,
      qty: 0,
      markup_percent: 100,
    })
    setFocusLabourId(n.id)
    await load()
  }

  async function updateLine(id: string, field: keyof LineTemplate, value: string | number | boolean | null) {
    await updateLineTemplate(id, { [field]: value })
    await load()
  }

  async function updateLineItemCode(line: LineTemplate, itemCode: string) {
    const code = itemCode.trim()
  
    const supplierItem =
      (await getSupplierItemByCode(code, line.supplier_id)) ||
      (await getSupplierItemByCode(code))
  
    await updateLineTemplate(line.id, {
      item_code: code || null,
      ...(supplierItem
        ? {
            supplier_id: supplierItem.supplier_id,
            item: supplierItem.item,
            description: supplierItem.description,
            price: supplierItem.cost,
          }
        : {}),
    })
  
    await load()
  }
  
  

  async function updateLabour(id: string, field: keyof LabourTemplate, value: string | number) {
    await updateLabourTemplate(id, { [field]: value })
    await load()
  }

  async function delLine(line: LineTemplate) {
    if (!confirm(`Delete "${line.item || 'this line'}"?`)) return
    await deleteLineTemplate(line.id)
    await load()
  }

  async function delLabour(l: LabourTemplate) {
    if (!confirm(`Delete labour "${l.type || 'this line'}"?`)) return
    await deleteLabourTemplate(l.id)
    await load()
  }

  return (
    <div>
      <h2 className="text-4xl font-medium text-text tracking-tight mb-2">
        <InlineTextField
          value={template.name}
          onSave={(v) => onUpdate('name', v)}
          placeholder="Template name"
          className="text-4xl font-medium"
          inputClass="px-2 py-1"
        />
      </h2>
      <div className="grid grid-cols-12 gap-3 mb-6">
        <div className="col-span-3">
          <label className="block text-xs font-medium text-text-muted mb-1">Category</label>
          <InlineTextField
            value={template.category || ''}
            onSave={(v) => onUpdate('category', v || null)}
            placeholder="e.g. Kitchen"
            className="text-sm"
            inputClass="px-2 py-1.5 border border-border-strong"
          />
        </div>
        <div className="col-span-9">
          <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
          <InlineTextField
            value={template.description || ''}
            onSave={(v) => onUpdate('description', v || null)}
            placeholder="What this template covers..."
            className="text-sm"
            inputClass="px-2 py-1.5 border border-border-strong"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-text-subtle text-sm">Loading...</p>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
                Material Lines
              </h3>
              <button onClick={handleAddLine} className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover">
                <Plus size={12} /> New Line
              </button>
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
                    <th className="px-1.5 py-1 font-medium w-16 text-right">Markup</th>
                    <th className="px-1.5 py-1 font-medium w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border [&_tr:nth-child(even)]:bg-surface-muted/40">
                  {lines.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-6 text-center text-text-subtle text-sm italic">No lines yet.</td></tr>
                  ) : lines.map((line) => (
                    <BundledLineRow
                      key={line.id}
                      line={line}
                      suppliers={suppliers}
                      shouldFocus={focusLineId === line.id}
                      onFocused={() => setFocusLineId(null)}
                      onUpdate={updateLine}
                      onUpdateItemCode={updateLineItemCode}
                      onDelete={() => delLine(line)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
                Labour
              </h3>
              <button onClick={handleAddLabour} className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover">
                <Plus size={12} /> New Labour Line
              </button>
            </div>
            <div className="border border-border rounded-md overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-surface-muted border-b border-border">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-text-subtle">
                    <th className="px-1.5 py-1 font-medium w-14">Sort</th>
                    <th className="px-1.5 py-1 font-medium">Type</th>
                    <th className="px-1.5 py-1 font-medium w-24 text-right">Price/Hr</th>
                    <th className="px-1.5 py-1 font-medium w-20 text-right">Hours</th>
                    <th className="px-1.5 py-1 font-medium w-20 text-right">Markup</th>
                    <th className="px-1.5 py-1 font-medium w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border [&_tr:nth-child(even)]:bg-surface-muted/40">
                  {labour.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-text-subtle text-sm italic">No labour yet.</td></tr>
                  ) : labour.map((l) => (
                    <BundledLabourRow
                      key={l.id}
                      labour={l}
                      shouldFocus={focusLabourId === l.id}
                      onFocused={() => setFocusLabourId(null)}
                      onUpdate={updateLabour}
                      onDelete={() => delLabour(l)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function BundledLineRow({
  line,
  suppliers,
  shouldFocus,
  onFocused,
  onUpdate,
  onUpdateItemCode,
  onDelete,
}: {
  line: LineTemplate
  suppliers: Supplier[]
  shouldFocus: boolean
  onFocused: () => void
  onUpdate: (id: string, field: keyof LineTemplate, value: string | number | boolean | null) => Promise<void>
  onUpdateItemCode: (line: LineTemplate, itemCode: string) => Promise<void>
  onDelete: () => void
}) {

  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (shouldFocus && ref.current) { ref.current.focus(); onFocused() }
  }, [shouldFocus, onFocused])

  return (
    <tr className="hover:bg-surface-hover group">
      <td className="px-1 py-0"><InlineNumberField value={line.sort} onSave={(v) => onUpdate(line.id, 'sort', v)} className="font-mono text-text-faint" /></td>
      <td className="px-1 py-0"><InlineTextField ref={ref} value={line.item || ''} onSave={(v) => onUpdate(line.id, 'item', v)} placeholder="item" className="font-medium text-text" /></td>
      <td className="px-1 py-0"><InlineTextField value={line.description || ''} onSave={(v) => onUpdate(line.id, 'description', v)} placeholder="description" className="text-text-muted" /></td>
      <td className="px-1 py-0">
        <select
          value={line.supplier_id || ''}
          onChange={(e) => onUpdate(line.id, 'supplier_id', e.target.value || null)}
          className="w-full px-1.5 py-0.5 text-xs bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none text-text-muted"
        >
          <option value="">—</option>
          {suppliers.map((s) => (
  <option key={s.id} value={s.id}>
    {s.company_name}
  </option>
))}
        </select>
      </td>
      <td className="px-1 py-0"><InlineTextField
  value={line.item_code || ''}
  onSave={(v) => onUpdateItemCode(line, v)}
  className="text-text-muted text-xs font-mono"
  alwaysSave
/>
</td>
      <td className="px-1 py-0"><InlineNumberField value={line.price} onSave={(v) => onUpdate(line.id, 'price', v)} className="text-right text-text" /></td>
      <td className="px-1 py-0"><InlineNumberField value={line.qty} onSave={(v) => onUpdate(line.id, 'qty', v)} className="text-right text-text" /></td>
      <td className="px-1 py-0"><InlineNumberField value={line.markup_percent} onSave={(v) => onUpdate(line.id, 'markup_percent', v)} className="text-right text-text" suffix="%" /></td>
      <td className="px-1 py-0">
        <button onClick={onDelete} className="text-text-faint hover:text-danger" title="Delete">
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

function BundledLabourRow({
  labour,
  shouldFocus,
  onFocused,
  onUpdate,
  onDelete,
}: {
  labour: LabourTemplate
  shouldFocus: boolean
  onFocused: () => void
  onUpdate: (id: string, field: keyof LabourTemplate, value: string | number) => Promise<void>
  onDelete: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (shouldFocus && ref.current) { ref.current.focus(); onFocused() }
  }, [shouldFocus, onFocused])

  return (
    <tr className="hover:bg-surface-hover group">
      <td className="px-1 py-0"><InlineNumberField value={labour.sort} onSave={(v) => onUpdate(labour.id, 'sort', v)} className="font-mono text-text-faint" /></td>
      <td className="px-1 py-0"><InlineTextField ref={ref} value={labour.type} onSave={(v) => onUpdate(labour.id, 'type', v)} placeholder="e.g. Cut & Edge" className="text-text" /></td>
      <td className="px-1 py-0"><InlineNumberField value={labour.price} onSave={(v) => onUpdate(labour.id, 'price', v)} className="text-right text-text" /></td>
      <td className="px-1 py-0"><InlineNumberField value={labour.qty} onSave={(v) => onUpdate(labour.id, 'qty', v)} className="text-right text-text" /></td>
      <td className="px-1 py-0"><InlineNumberField value={labour.markup_percent} onSave={(v) => onUpdate(labour.id, 'markup_percent', v)} className="text-right text-text" suffix="%" /></td>
      <td className="px-1 py-0">
        <button onClick={onDelete} className="text-text-faint hover:text-danger" title="Delete">
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
  alwaysSave = false,
}: {
  ref?: React.RefObject<HTMLInputElement | null>
  value: string
  onSave: (value: string) => void
  placeholder?: string
  className?: string
  inputClass?: string
  alwaysSave?: boolean
}) {

  const [local, setLocal] = useState(value)
  useEffect(() => { setLocal(value) }, [value])
  function commit() {
    if (alwaysSave || local !== value) onSave(local)
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
        else if (e.key === 'Escape') { setLocal(value); e.currentTarget.blur() }
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
  suffix,
}: {
  value: number
  onSave: (value: number) => void
  className?: string
  suffix?: string
}) {
  const [local, setLocal] = useState(String(value))
  useEffect(() => { setLocal(String(value)) }, [value])
  function commit() {
    const n = parseFloat(local)
    if (isNaN(n)) { setLocal(String(value)); return }
    if (n !== value) onSave(n)
  }
  return (
    <div className="flex items-baseline">
      <input
        type="number"
        step="any"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          else if (e.key === 'Escape') { setLocal(String(value)); e.currentTarget.blur() }
        }}
        className={`w-full px-1.5 py-0.5 text-sm bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none ${className}`}
      />
      {suffix && <span className="text-xs text-text-faint ml-0.5">{suffix}</span>}
    </div>
  )
}