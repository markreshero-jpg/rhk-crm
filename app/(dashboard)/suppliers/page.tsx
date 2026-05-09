'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Building2, ChevronDown } from 'lucide-react'
import { Supplier, getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/lib/suppliers'
import SupplierForm from '@/components/SupplierForm'
import SupplierItemsPortal from '@/components/SupplierItemsPortal'

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const data = await getSuppliers()
    setSuppliers(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = suppliers.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.company_name?.toLowerCase().includes(q) ||
      s.contact_name?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    )
  })

  const selected = suppliers.find((s) => s.id === selectedId) ?? null

  async function handleCreate(data: Partial<Supplier>) {
    const created = await createSupplier(data as Omit<Supplier, 'id' | 'created_at'>)
    await load()
    setShowNew(false)
    setSelectedId(created.id)
  }

  async function handleUpdate(data: Partial<Supplier>) {
    if (!selectedId) return
    await updateSupplier(selectedId, data)
    await load()
  }

  async function handleDelete() {
    if (!selectedId) return
    await deleteSupplier(selectedId)
    setSelectedId(null)
    await load()
  }

  return (
    <div className="flex h-full">
      {/* ── Left sidebar ────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r border-border flex flex-col">
        {/* Sidebar header */}
        <div className="px-4 pt-8 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Workspace</p>
              <h2 className="text-base font-semibold text-text mt-0.5">Suppliers</h2>
            </div>
            <button
              onClick={() => { setShowNew(true); setSelectedId(null) }}
              className="flex items-center gap-1 text-xs text-accent-text bg-accent px-2.5 py-1.5 rounded-md hover:bg-accent-hover transition-colors shrink-0"
            >
              <Plus size={12} /> New
            </button>
          </div>
          <input
            type="text"
            placeholder="Search suppliers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent"
          />
          {search && (
            <p className="text-[11px] text-text-faint mt-1.5 px-0.5">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Supplier list */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <p className="text-xs text-text-subtle px-4 py-3">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-text-faint italic px-4 py-3">
              {search ? 'No suppliers match.' : 'No suppliers yet.'}
            </p>
          ) : (
            <ul>
              {filtered.map((s) => {
                const isActive = selectedId === s.id && !showNew
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => { setSelectedId(s.id); setShowNew(false) }}
                      className={`w-full text-left px-4 py-2 transition-colors border-l-2 ${
                        isActive
                          ? 'bg-accent/10 border-accent'
                          : 'border-transparent hover:bg-surface-hover'
                      }`}
                    >
                      <p className="text-sm text-text truncate">{s.company_name}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Right panel ─────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {showNew ? (
          <div className="p-10 max-w-3xl">
            <div className="mb-8">
              <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-1">Suppliers</p>
              <h2 className="text-3xl font-medium text-text tracking-tight">New Supplier</h2>
            </div>
            <SupplierForm
              onSubmit={handleCreate}
              onCancel={() => setShowNew(false)}
              submitLabel="Create Supplier"
            />
          </div>
        ) : selected ? (
          <SupplierDetailPanel
            key={selected.id}
            supplier={selected}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-6">
            <Building2 size={32} className="text-text-faint mb-3" />
            <p className="text-text-subtle text-sm">Select a supplier from the list, or create a new one.</p>
          </div>
        )}
      </main>
    </div>
  )
}

// ── Supplier detail panel ─────────────────────────────────────────────────────

function SupplierDetailPanel({
  supplier,
  onUpdate,
  onDelete,
}: {
  supplier: Supplier
  onUpdate: (data: Partial<Supplier>) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="p-10 max-w-4xl space-y-8">
      {/* Header — company name only */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-1">Supplier</p>
        <h2 className="text-3xl font-medium text-text tracking-tight">{supplier.company_name}</h2>
      </div>

      {/* Details form */}
      <section>
        <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-5">Details</p>
        <SupplierForm
          key={`${supplier.id}-${expanded}`}
          initialData={supplier}
          onSubmit={onUpdate}
          onDelete={onDelete}
          submitLabel="Save Changes"
          compact={!expanded}
        />

        {/* Expand / collapse toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors"
        >
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
          {expanded ? 'Hide address & notes' : 'Show address & notes'}
        </button>
      </section>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Items */}
      <section className="pb-10">
        <SupplierItemsPortal supplierId={supplier.id} />
      </section>
    </div>
  )
}
