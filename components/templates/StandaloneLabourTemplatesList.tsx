'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Plus, Trash2, ListOrdered } from 'lucide-react'
import {
  getStandaloneLabour,
  createLabourTemplate,
  updateLabourTemplate,
  deleteLabourTemplate,
  LabourTemplate,
} from '@/lib/labourTemplates'
import ListFilters from '@/components/ListFilters'

export default function StandaloneLabourTemplatesList() {
  const [labour, setLabour] = useState<LabourTemplate[]>([])
  const [query, setQuery] = useState('')
  const [hideEmpty, setHideEmpty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [focusId, setFocusId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const data = await getStandaloneLabour()
    setLabour(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleNew() {
    const newLab = await createLabourTemplate({
      type: '',
      price: 50,
      qty: 0,
      markup_percent: 100,
    })
    setFocusId(newLab.id)
    await load()
  }

  async function handleUpdate(id: string, field: keyof LabourTemplate, value: string | number) {
    await updateLabourTemplate(id, { [field]: value })
    await load()
  }

  async function handleDelete(l: LabourTemplate) {
    if (!confirm(`Delete labour "${l.type || 'this line'}"?`)) return
    await deleteLabourTemplate(l.id)
    await load()
  }

  async function handleRenumber() {
    const sorted = [...labour].sort((a, b) => a.sort - b.sort)
    for (let i = 0; i < sorted.length; i++) {
      await updateLabourTemplate(sorted[i].id, { sort: i + 1 })
    }
    await load()
  }

  const filtered = labour.filter((l) => {
    if (hideEmpty && (l.price ?? 0) === 0 && !l.type?.trim()) return false
    if (!query) return true
    const q = query.toLowerCase()
    return l.type.toLowerCase().includes(q) || (l.category || '').toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
          Labour Line Library
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover"
          >
            <Plus size={12} /> New Labour Line
          </button>
          <button
            onClick={handleRenumber}
            disabled={labour.length === 0}
            className="flex items-center gap-1.5 text-xs text-text-muted bg-surface border border-border-strong px-3 py-1.5 rounded-md hover:bg-surface-hover disabled:opacity-50"
          >
            <ListOrdered size={12} /> Renumber
          </button>
        </div>
      </div>

      <ListFilters
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search type or category..."
        resultCount={filtered.length}
        resultLabel={filtered.length === 1 ? 'line' : 'lines'}
      />

      <label className="flex items-center gap-2 text-xs text-text-muted mb-3 mt-1">
        <input
          type="checkbox"
          checked={hideEmpty}
          onChange={(e) => setHideEmpty(e.target.checked)}
        />
        Hide empty rows
      </label>

      {loading ? (
        <p className="text-text-subtle text-sm p-6">Loading...</p>
      ) : (
        <div className="border border-border rounded-md overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-surface-muted border-b border-border">
              <tr className="text-left text-[10px] uppercase tracking-wider text-text-subtle">
                <th className="px-1.5 py-1 font-medium w-14">Sort</th>
                <th className="px-1.5 py-1 font-medium w-32">Category</th>
                <th className="px-1.5 py-1 font-medium">Type</th>
                <th className="px-1.5 py-1 font-medium w-24 text-right">Price/Hr</th>
                <th className="px-1.5 py-1 font-medium w-20 text-right">Default Hrs</th>
                <th className="px-1.5 py-1 font-medium w-20 text-right">Markup</th>
                <th className="px-1.5 py-1 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border [&_tr:nth-child(even)]:bg-surface-muted/40">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-subtle text-sm italic">
                    No labour lines match.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <Row
                    key={l.id}
                    labour={l}
                    shouldFocus={focusId === l.id}
                    onFocused={() => setFocusId(null)}
                    onUpdate={handleUpdate}
                    onDelete={() => handleDelete(l)}
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

function Row({
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
  const typeRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (shouldFocus && typeRef.current) {
      typeRef.current.focus()
      onFocused()
    }
  }, [shouldFocus, onFocused])

  return (
    <tr className="hover:bg-surface-hover group">
      <td className="px-1 py-0">
        <InlineNumberField value={labour.sort} onSave={(v) => onUpdate(labour.id, 'sort', v)} className="font-mono text-text-faint" />
      </td>
      <td className="px-1 py-0">
        <InlineTextField value={labour.category || ''} onSave={(v) => onUpdate(labour.id, 'category', v)} placeholder="category" className="text-text-muted text-xs" />
      </td>
      <td className="px-1 py-0">
        <InlineTextField ref={typeRef} value={labour.type} onSave={(v) => onUpdate(labour.id, 'type', v)} placeholder="e.g. Cut & Edge" className="text-text" />
      </td>
      <td className="px-1 py-0">
        <InlineNumberField value={labour.price} onSave={(v) => onUpdate(labour.id, 'price', v)} className="text-right text-text" decimals={2} />
      </td>
      <td className="px-1 py-0">
        <InlineNumberField value={labour.qty} onSave={(v) => onUpdate(labour.id, 'qty', v)} className="text-right text-text" />
      </td>
      <td className="px-1 py-0">
        <InlineNumberField value={labour.markup_percent} onSave={(v) => onUpdate(labour.id, 'markup_percent', v)} className="text-right text-text" suffix="%" />
      </td>
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
