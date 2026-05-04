'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Plus, Trash2, ListOrdered } from 'lucide-react'
import {
  getStandaloneLines,
  createLineTemplate,
  updateLineTemplate,
  deleteLineTemplate,
  LineTemplate,
} from '@/lib/lineTemplates'
import { getAllSuppliers, Supplier } from '@/lib/suppliers'
import ListFilters from '@/components/ListFilters'

export default function StandaloneLineTemplatesList() {
  const [lines, setLines] = useState<LineTemplate[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [query, setQuery] = useState('')
  const [hideEmpty, setHideEmpty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [focusId, setFocusId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [l, s] = await Promise.all([getStandaloneLines(), getAllSuppliers()])
    setLines(l)
    setSuppliers(s)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleNew() {
    const newLine = await createLineTemplate({
      item: '',
      description: '',
      price: 0,
      qty: 1,
      markup_percent: 50,
    })
    setFocusId(newLine.id)
    await load()
  }

  async function handleUpdate(id: string, field: keyof LineTemplate, value: string | number | boolean | null) {
    await updateLineTemplate(id, { [field]: value })
    await load()
  }

  async function handleDelete(line: LineTemplate) {
    if (!confirm(`Delete "${line.item || 'this line'}"?`)) return
    await deleteLineTemplate(line.id)
    await load()
  }

  async function handleRenumber() {
    const sorted = [...lines].sort((a, b) => a.sort - b.sort)
    for (let i = 0; i < sorted.length; i++) {
      await updateLineTemplate(sorted[i].id, { sort: i + 1 })
    }
    await load()
  }

  // Filter logic
  const filtered = lines.filter((l) => {
    if (hideEmpty && (l.price ?? 0) === 0 && !l.item?.trim()) return false
    if (!query) return true
    const q = query.toLowerCase()
    return (
      (l.item || '').toLowerCase().includes(q) ||
      (l.description || '').toLowerCase().includes(q) ||
      (l.item_code || '').toLowerCase().includes(q) ||
      (l.category || '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
          Material Line Library
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover"
          >
            <Plus size={12} /> New Line
          </button>
          <button
            onClick={handleRenumber}
            disabled={lines.length === 0}
            className="flex items-center gap-1.5 text-xs text-text-muted bg-surface border border-border-strong px-3 py-1.5 rounded-md hover:bg-surface-hover disabled:opacity-50"
          >
            <ListOrdered size={12} /> Renumber
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <ListFilters
          searchQuery={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search item, description, code, category..."
          resultCount={filtered.length}
          resultLabel={filtered.length === 1 ? 'line' : 'lines'}
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-text-muted mb-3">
        <input
          type="checkbox"
          checked={hideEmpty}
          onChange={(e) => setHideEmpty(e.target.checked)}
        />
        Hide empty rows (no item name and price = 0)
      </label>

      {loading ? (
        <p className="text-text-subtle text-sm p-6">Loading...</p>
      ) : (
        <div className="border border-border rounded-md overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-surface-muted border-b border-border">
              <tr className="text-left text-[10px] uppercase tracking-wider text-text-subtle">
                <th className="px-1.5 py-1 font-medium w-14">Sort</th>
                <th className="px-1.5 py-1 font-medium w-32">Category</th>
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-text-subtle text-sm italic">
                    No lines match.
                  </td>
                </tr>
              ) : (
                filtered.map((line) => (
                  <LineRow
                    key={line.id}
                    line={line}
                    suppliers={suppliers}
                    shouldFocus={focusId === line.id}
                    onFocused={() => setFocusId(null)}
                    onUpdate={handleUpdate}
                    onDelete={() => handleDelete(line)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function LineRow({
  line,
  suppliers,
  shouldFocus,
  onFocused,
  onUpdate,
  onDelete,
}: {
  line: LineTemplate
  suppliers: Supplier[]
  shouldFocus: boolean
  onFocused: () => void
  onUpdate: (id: string, field: keyof LineTemplate, value: string | number | boolean | null) => Promise<void>
  onDelete: () => void
}) {
  const itemRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (shouldFocus && itemRef.current) {
      itemRef.current.focus()
      onFocused()
    }
  }, [shouldFocus, onFocused])

  return (
    <tr className="hover:bg-surface-hover group">
      <td className="px-1 py-0">
        <InlineNumberField value={line.sort} onSave={(v) => onUpdate(line.id, 'sort', v)} className="font-mono text-text-faint" />
      </td>
      <td className="px-1 py-0">
        <InlineTextField value={line.category || ''} onSave={(v) => onUpdate(line.id, 'category', v)} placeholder="category" className="text-text-muted text-xs" />
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
        <InlineNumberField value={line.price} onSave={(v) => onUpdate(line.id, 'price', v)} className="text-right text-text" decimals={2} />
      </td>
      <td className="px-1 py-0">
        <InlineNumberField value={line.qty} onSave={(v) => onUpdate(line.id, 'qty', v)} className="text-right text-text" />
      </td>
      <td className="px-1 py-0">
        <InlineNumberField value={line.markup_percent} onSave={(v) => onUpdate(line.id, 'markup_percent', v)} className="text-right text-text" suffix="%" />
      </td>
      <td className="px-1 py-0">
        <button onClick={onDelete} className="text-text-faint hover:text-danger" title="Delete">
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

// ===== Inline editing primitives (same pattern as before) =====

const InlineTextField = function InlineTextField({
  ref,
  value,
  onSave,
  placeholder,
  className = '',
}: {
  ref?: React.RefObject<HTMLInputElement | null>
  value: string
  onSave: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const [local, setLocal] = useState(value)
  useEffect(() => { setLocal(value) }, [value])
  function commit() { if (local !== value) onSave(local) }
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
      className={`w-full px-1.5 py-0.5 text-sm bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none ${className}`}
    />
  )
}

function InlineNumberField({
  value,
  onSave,
  className = '',
  suffix,
  decimals,
}: {
  value: number
  onSave: (value: number) => void
  className?: string
  suffix?: string
  decimals?: number
}) {
  const [local, setLocal] = useState(decimals != null ? value.toFixed(decimals) : String(value))
  useEffect(() => { setLocal(decimals != null ? value.toFixed(decimals) : String(value)) }, [value, decimals])
  function commit() {
    const n = parseFloat(local)
    if (isNaN(n)) { setLocal(decimals != null ? value.toFixed(decimals) : String(value)); return }
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
          else if (e.key === 'Escape') { setLocal(decimals != null ? value.toFixed(decimals) : String(value)); e.currentTarget.blur() }
        }}
        className={`w-full px-1.5 py-0.5 text-sm bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none ${className}`}
      />
      {suffix && <span className="text-xs text-text-faint ml-0.5">{suffix}</span>}
    </div>
  )
}