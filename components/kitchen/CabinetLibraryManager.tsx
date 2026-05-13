'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, X, Check } from 'lucide-react'
import {
  getAllCabinetLibraryEntries,
  createCabinetLibraryEntry,
  updateCabinetLibraryEntry,
  deleteCabinetLibraryEntry,
  CabinetLibraryEntry,
} from '@/lib/kitchenCabinetLibrary'
import { supabase } from '@/lib/supabase'
import { SupplierItem } from '@/lib/supplierItems'
import ListFilters from '@/components/ListFilters'

type SupplierItemWithSupplier = SupplierItem & { supplier_name: string }

const BLANK: Omit<CabinetLibraryEntry, 'id' | 'created_at' | 'updated_at'> = {
  code_prefix: '',
  name: '',
  cabinet_type: 'base',
  door_count: 0,
  drawer_count: 0,
  inner_drawer_count: 0,
  has_middle_shelf: false,
  has_back_panel: true,
  default_height_mm: null,
  default_depth_mm: null,
  default_width_mm: null,
  board_thickness_mm: 16.5,
  is_directional_grain: false,
  hinge_supplier_item_id: null,
  hinge_plate_supplier_item_id: null,
  runner_supplier_item_id: null,
  handle_supplier_item_id: null,
  carcase_board_supplier_item_id: null,
  door_board_supplier_item_id: null,
  toekick_supplier_item_id: null,
  has_toekick: false,
  toekick_height_mm: 150,
  labour_make_hrs: 0,
  labour_install_hrs: 0,
  hinge_override_count: null,
  is_active: true,
  notes: null,
  custom_rules: null,
}

async function searchSupplierItems(query: string): Promise<SupplierItemWithSupplier[]> {
  if (!query.trim()) return []
  const { data } = await supabase
    .from('supplier_items')
    .select('*, suppliers(company_name)')
    .or(`item.ilike.%${query}%,item_code.ilike.%${query}%`)
    .limit(20)
  if (!data) return []
  return data.map((d: SupplierItem & { suppliers?: { company_name: string } | null }) => ({
    ...d,
    supplier_name: d.suppliers?.company_name ?? '',
  }))
}

function SupplierItemPicker({
  value,
  onChange,
  placeholder,
}: {
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SupplierItemWithSupplier[]>([])
  const [selected, setSelected] = useState<SupplierItemWithSupplier | null>(null)
  const [open, setOpen] = useState(false)

  // Load label for current value
  useEffect(() => {
    if (!value) { setSelected(null); return }
    supabase
      .from('supplier_items')
      .select('*, suppliers(company_name)')
      .eq('id', value)
      .single()
      .then(({ data }) => {
        if (data) {
          setSelected({
            ...data,
            supplier_name: data.suppliers?.company_name ?? '',
          })
        }
      })
  }, [value])

  async function handleSearch(q: string) {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    const r = await searchSupplierItems(q)
    setResults(r)
    setOpen(true)
  }

  function handlePick(item: SupplierItemWithSupplier) {
    onChange(item.id)
    setSelected(item)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  function handleClear() {
    onChange(null)
    setSelected(null)
    setQuery('')
  }

  return (
    <div className="relative">
      {selected ? (
        <div className="flex items-center gap-1.5 text-xs text-text bg-surface border border-border rounded px-2 py-1">
          <span className="truncate max-w-[180px]">{selected.item || selected.item_code}</span>
          <span className="text-text-faint">({selected.supplier_name})</span>
          <button onClick={handleClear} className="ml-auto text-text-faint hover:text-danger shrink-0"><X size={11} /></button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder ?? 'Search items…'}
            className="w-full px-2 py-1 text-xs bg-surface border border-border rounded focus:outline-none focus:border-accent text-text"
          />
          {open && results.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-surface border border-border rounded shadow-lg max-h-48 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.id}
                  onMouseDown={() => handlePick(r)}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-surface-hover text-text flex gap-2"
                >
                  <span className="font-medium">{r.item || r.item_code}</span>
                  <span className="text-text-faint">{r.supplier_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type FormState = Omit<CabinetLibraryEntry, 'id' | 'created_at' | 'updated_at'>

function CabinetForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: FormState
  onSave: (f: FormState) => Promise<void>
  onCancel: () => void
}) {
  const [f, setF] = useState<FormState>(initial)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setF((s) => ({ ...s, [key]: value }))
  }

  function num(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      set(key, e.target.value === '' ? null : (parseFloat(e.target.value) as FormState[typeof key]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try { await onSave(f) } finally { setSaving(false) }
  }

  const inputCls = 'w-full px-2 py-1 text-xs bg-surface border border-border rounded focus:outline-none focus:border-accent text-text'
  const numCls = inputCls + ' text-right'
  const labelCls = 'text-[11px] text-text-subtle font-medium mb-0.5 block'

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-4">
      {/* Identity */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-2">Identity</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Code Prefix *</label>
            <input required value={f.code_prefix} onChange={(e) => set('code_prefix', e.target.value.toUpperCase())} className={inputCls} placeholder="e.g. B2" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Name *</label>
            <input required value={f.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="e.g. Base 2 Door" />
          </div>
          <div>
            <label className={labelCls}>Type *</label>
            <select value={f.cabinet_type} onChange={(e) => set('cabinet_type', e.target.value as 'base' | 'tall' | 'wall')} className={inputCls}>
              <option value="base">Base</option>
              <option value="tall">Tall</option>
              <option value="wall">Wall</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Doors</label>
            <input type="number" min={0} value={f.door_count} onChange={(e) => set('door_count', parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={numCls} />
          </div>
          <div>
            <label className={labelCls}>Drawers</label>
            <input type="number" min={0} value={f.drawer_count} onChange={(e) => set('drawer_count', parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} className={numCls} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="has_middle_shelf" checked={f.has_middle_shelf} onChange={(e) => set('has_middle_shelf', e.target.checked)} />
            <label htmlFor="has_middle_shelf" className="text-xs text-text">Middle shelf</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="has_toekick" checked={f.has_toekick} onChange={(e) => set('has_toekick', e.target.checked)} />
            <label htmlFor="has_toekick" className="text-xs text-text">Toekick</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_directional_grain" checked={f.is_directional_grain} onChange={(e) => set('is_directional_grain', e.target.checked)} />
            <label htmlFor="is_directional_grain" className="text-xs text-text">Directional grain</label>
          </div>
        </div>
      </div>

      {/* Dimensions */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-2">Default Dimensions (mm)</p>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Height</label>
            <input type="number" value={f.default_height_mm ?? ''} onChange={num('default_height_mm')} onFocus={(e) => e.target.select()} className={numCls} />
          </div>
          <div>
            <label className={labelCls}>Depth</label>
            <input type="number" value={f.default_depth_mm ?? ''} onChange={num('default_depth_mm')} onFocus={(e) => e.target.select()} className={numCls} />
          </div>
          <div>
            <label className={labelCls}>Width</label>
            <input type="number" value={f.default_width_mm ?? ''} onChange={num('default_width_mm')} onFocus={(e) => e.target.select()} className={numCls} />
          </div>
          <div>
            <label className={labelCls}>Board thickness</label>
            <input type="number" value={f.board_thickness_mm} onChange={(e) => set('board_thickness_mm', parseFloat(e.target.value) || 16.5)} onFocus={(e) => e.target.select()} step="0.1" className={numCls} />
          </div>
        </div>
      </div>

      {/* Labour */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-2">Labour</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Make (hrs)</label>
            <input type="number" value={f.labour_make_hrs} onChange={(e) => set('labour_make_hrs', parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} step="0.25" className={numCls} />
          </div>
          <div>
            <label className={labelCls}>Install (hrs)</label>
            <input type="number" value={f.labour_install_hrs} onChange={(e) => set('labour_install_hrs', parseFloat(e.target.value) || 0)} onFocus={(e) => e.target.select()} step="0.25" className={numCls} />
          </div>
          <div>
            <label className={labelCls}>Hinge count override</label>
            <input type="number" value={f.hinge_override_count ?? ''} onChange={(e) => set('hinge_override_count', e.target.value === '' ? null : parseInt(e.target.value))} onFocus={(e) => e.target.select()} className={numCls} placeholder="auto" />
          </div>
        </div>
      </div>

      {/* Hardware links */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-2">Hardware — Supplier Items</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            ['hinge_supplier_item_id', 'Hinge'],
            ['hinge_plate_supplier_item_id', 'Hinge Plate'],
            ['runner_supplier_item_id', 'Runner'],
            ['handle_supplier_item_id', 'Handle'],
            ['carcase_board_supplier_item_id', 'Carcase Board'],
            ['door_board_supplier_item_id', 'Door Board'],
            ['toekick_supplier_item_id', 'Toekick'],
          ] as [keyof FormState, string][]).map(([field, label]) => (
            <div key={field}>
              <label className={labelCls}>{label}</label>
              <SupplierItemPicker
                value={f[field] as string | null}
                onChange={(v) => set(field, v as FormState[typeof field])}
                placeholder={`Search ${label.toLowerCase()}…`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls}>Notes</label>
        <textarea value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value || null)} rows={2} className="w-full px-2 py-1 text-xs bg-surface border border-border rounded focus:outline-none focus:border-accent text-text resize-none" />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent text-accent-text rounded hover:bg-accent-hover disabled:opacity-50">
          <Check size={12} /> {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-text-muted bg-surface border border-border rounded hover:bg-surface-hover">
          Cancel
        </button>
        <div className="ml-auto flex items-center gap-2">
          <input type="checkbox" id="is_active" checked={f.is_active} onChange={(e) => set('is_active', e.target.checked)} />
          <label htmlFor="is_active" className="text-xs text-text">Active</label>
        </div>
      </div>
    </form>
  )
}

export default function CabinetLibraryManager() {
  const [entries, setEntries] = useState<CabinetLibraryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [editId, setEditId] = useState<string | 'new' | null>(null)

  async function load() {
    setLoading(true)
    const data = await getAllCabinetLibraryEntries()
    setEntries(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSaveNew(f: Omit<CabinetLibraryEntry, 'id' | 'created_at' | 'updated_at'>) {
    await createCabinetLibraryEntry(f)
    setEditId(null)
    await load()
  }

  async function handleSaveEdit(id: string, f: Omit<CabinetLibraryEntry, 'id' | 'created_at' | 'updated_at'>) {
    await updateCabinetLibraryEntry(id, f)
    setEditId(null)
    await load()
  }

  async function handleDelete(entry: CabinetLibraryEntry) {
    if (!confirm(`Delete "${entry.name}" (${entry.code_prefix})? This cannot be undone.`)) return
    await deleteCabinetLibraryEntry(entry.id)
    await load()
  }

  const filtered = entries.filter((e) =>
    e.code_prefix.toLowerCase().includes(query.toLowerCase()) ||
    e.name.toLowerCase().includes(query.toLowerCase()) ||
    e.cabinet_type.toLowerCase().includes(query.toLowerCase())
  )

  if (editId === 'new') {
    return (
      <div className="border border-border rounded-md overflow-hidden">
        <div className="px-4 py-2 bg-surface-muted border-b border-border">
          <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">New Cabinet Type</p>
        </div>
        <CabinetForm
          initial={{ ...BLANK }}
          onSave={handleSaveNew}
          onCancel={() => setEditId(null)}
        />
      </div>
    )
  }

  const editEntry = editId ? entries.find((e) => e.id === editId) : null

  if (editEntry) {
    return (
      <div className="border border-border rounded-md overflow-hidden">
        <div className="px-4 py-2 bg-surface-muted border-b border-border flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
            Edit — {editEntry.code_prefix} {editEntry.name}
          </p>
          <button onClick={() => setEditId(null)} className="text-text-faint hover:text-text"><X size={14} /></button>
        </div>
        <CabinetForm
          initial={editEntry}
          onSave={(f) => handleSaveEdit(editEntry.id, f)}
          onCancel={() => setEditId(null)}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Cabinet Types</h3>
        <button
          onClick={() => setEditId('new')}
          className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover"
        >
          <Plus size={12} /> New Cabinet Type
        </button>
      </div>

      <ListFilters
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by code, name, or type…"
        resultCount={filtered.length}
        resultLabel={filtered.length === 1 ? 'cabinet type' : 'cabinet types'}
      />

      {loading ? (
        <p className="text-text-subtle text-sm p-6">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-md">
          <p className="text-text-subtle text-sm">{query ? 'No cabinet types match.' : 'No cabinet types yet.'}</p>
          {!query && (
            <button onClick={() => setEditId('new')} className="inline-flex items-center gap-2 mt-4 text-sm text-text underline hover:no-underline">
              Add your first cabinet type
            </button>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-muted border-b border-border">
              <tr className="text-left text-[10px] uppercase tracking-wider text-text-subtle">
                <th className="px-3 py-1.5 font-medium w-24">Code</th>
                <th className="px-3 py-1.5 font-medium">Name</th>
                <th className="px-3 py-1.5 font-medium w-20">Type</th>
                <th className="px-3 py-1.5 font-medium w-14 text-center">Doors</th>
                <th className="px-3 py-1.5 font-medium w-14 text-center">Drawers</th>
                <th className="px-3 py-1.5 font-medium w-20 text-right">Make hrs</th>
                <th className="px-3 py-1.5 font-medium w-20 text-right">Install hrs</th>
                <th className="px-3 py-1.5 font-medium w-16 text-center">Active</th>
                <th className="px-3 py-1.5 font-medium w-8"></th>
                <th className="px-3 py-1.5 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-surface-hover group">
                  <td className="px-3 py-1.5 text-sm font-mono font-medium text-text">{e.code_prefix}</td>
                  <td className="px-3 py-1.5 text-sm text-text">{e.name}</td>
                  <td className="px-3 py-1.5 text-xs text-text-muted capitalize">{e.cabinet_type}</td>
                  <td className="px-3 py-1.5 text-xs text-text-muted text-center">{e.door_count}</td>
                  <td className="px-3 py-1.5 text-xs text-text-muted text-center">{e.drawer_count}</td>
                  <td className="px-3 py-1.5 text-xs text-text-muted text-right">{e.labour_make_hrs}</td>
                  <td className="px-3 py-1.5 text-xs text-text-muted text-right">{e.labour_install_hrs}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${e.is_active ? 'bg-green-500' : 'bg-border'}`} />
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => setEditId(e.id)} className="text-text-faint hover:text-text"><Pencil size={13} /></button>
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => handleDelete(e)} className="text-text-faint hover:text-danger"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
