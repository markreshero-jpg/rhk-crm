'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import ListFilters from './ListFilters'
import {
  getSupplierItems,
  createSupplierItem,
  updateSupplierItem,
  deleteSupplierItem,
  SupplierItem,
} from '@/lib/supplierItems'

export default function SupplierItemsPortal({ supplierId }: { supplierId: string }) {
  const [items, setItems] = useState<SupplierItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusId, setFocusId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const data = await getSupplierItems(supplierId)
    setItems(data)
    setLoading(false)
  }, [supplierId])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    const newItem = await createSupplierItem({
      supplier_id: supplierId,
      sort: items.length + 1,
      item: '',
      description: '',
      item_code: '',
      cost: 0,
    })
    setFocusId(newItem.id)
    await load()
  }

  async function handleUpdate(
    id: string,
    field: keyof SupplierItem,
    value: string | number | null
  ) {
    await updateSupplierItem(id, { [field]: value })
    await load()
  }

  async function handleDelete(item: SupplierItem) {
    if (!confirm(`Delete "${item.item || 'this item'}"?`)) return
    await deleteSupplierItem(item.id)
    await load()
  }

  const filtered = items.filter((item) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      item.item?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.item_code?.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
          Supplier Items
        </h3>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover transition-colors"
        >
          <Plus size={12} /> New Item
        </button>
      </div>

      <ListFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search items, codes, descriptions..."
        resultCount={filtered.length}
        resultLabel="items"
      />

      {loading ? (
        <p className="text-text-subtle text-sm py-4">Loading...</p>
      ) : (
        <div className="border border-border rounded-md overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-surface-muted border-b border-border">
              <tr className="text-left text-[10px] uppercase tracking-wider text-text-subtle">
                <th className="px-1.5 py-1 font-medium w-14">Sort</th>
                <th className="px-1.5 py-1 font-medium w-40">Item</th>
                <th className="px-1.5 py-1 font-medium">Description</th>
                <th className="px-1.5 py-1 font-medium w-28">Item Code</th>
                <th className="px-1.5 py-1 font-medium w-24 text-right">Cost</th>
                <th className="px-1.5 py-1 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border [&_tr:nth-child(even)]:bg-surface-muted/40">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-text-subtle text-sm italic"
                  >
                    {searchQuery ? 'No items match your search.' : 'No items yet.'}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <SupplierItemRow
                    key={item.id}
                    item={item}
                    shouldFocus={focusId === item.id}
                    onFocused={() => setFocusId(null)}
                    onUpdate={handleUpdate}
                    onDelete={() => handleDelete(item)}
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

function SupplierItemRow({
  item,
  shouldFocus,
  onFocused,
  onUpdate,
  onDelete,
}: {
  item: SupplierItem
  shouldFocus: boolean
  onFocused: () => void
  onUpdate: (id: string, field: keyof SupplierItem, value: string | number | null) => Promise<void>
  onDelete: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (shouldFocus && ref.current) {
      ref.current.focus()
      onFocused()
    }
  }, [shouldFocus, onFocused])

  return (
    <tr className="hover:bg-surface-hover group">
      <td className="px-1 py-0">
        <InlineNumberField
          value={item.sort}
          onSave={(v) => onUpdate(item.id, 'sort', v)}
          className="font-mono text-text-faint"
        />
      </td>
      <td className="px-1 py-0">
        <InlineTextField
          ref={ref}
          value={item.item || ''}
          onSave={(v) => onUpdate(item.id, 'item', v)}
          placeholder="item"
          className="font-medium text-text"
        />
      </td>
      <td className="px-1 py-0">
        <InlineTextField
          value={item.description || ''}
          onSave={(v) => onUpdate(item.id, 'description', v)}
          placeholder="description"
          className="text-text-muted"
        />
      </td>
      <td className="px-1 py-0">
        <InlineTextField
          value={item.item_code || ''}
          onSave={(v) => onUpdate(item.id, 'item_code', v)}
          placeholder="code"
          className="text-text-muted text-xs font-mono"
        />
      </td>
      <td className="px-1 py-0">
        <InlineNumberField
          value={item.cost}
          onSave={(v) => onUpdate(item.id, 'cost', v)}
          className="text-right text-text"
          prefix="$"
          decimals={2}
        />
      </td>
      <td className="px-1 py-0">
        <button
          onClick={onDelete}
          className="text-text-faint hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

// ── Inline primitives ──────────────────────────────────────────

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
  prefix,
  decimals,
}: {
  value: number
  onSave: (value: number) => void
  className?: string
  prefix?: string
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
    <div className="flex items-baseline gap-0.5">
      {prefix && <span className="text-xs text-text-faint">{prefix}</span>}
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
    </div>
  )
}