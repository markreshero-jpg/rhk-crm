'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight } from 'lucide-react'
import { getSuppliers, Supplier } from '@/lib/suppliers'
import ListFilters from '@/components/ListFilters'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    getSuppliers()
      .then(setSuppliers)
      .finally(() => setLoading(false))
  }, [])

  const filtered = suppliers.filter((s) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      s.company_name?.toLowerCase().includes(q) ||
      s.contact_name?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text">Suppliers</h1>
          <p className="text-sm text-text-subtle mt-0.5">Manage your supplier contacts</p>
        </div>
        <Link
          href="/suppliers/new"
          className="flex items-center gap-1.5 text-sm text-accent-text bg-accent px-3 py-2 rounded-md hover:bg-accent-hover transition-colors"
        >
          <Plus size={14} />
          <span>New Supplier</span>
        </Link>
      </div>

      <ListFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search suppliers, contacts, cities..."
        resultCount={filtered.length}
        resultLabel="suppliers"
      />

      {loading ? (
        <div className="p-12 text-center">
          <p className="text-text-subtle text-sm">Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-border rounded-md">
          <p className="text-text-subtle text-sm">
            {searchQuery ? 'No suppliers match your search.' : 'No suppliers yet.'}
          </p>
          {!searchQuery && (
            <Link
              href="/suppliers/new"
              className="inline-flex items-center gap-2 mt-4 text-sm text-text underline hover:no-underline"
            >
              Add your first supplier
            </Link>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-muted border-b border-border">
              <tr className="text-left text-[11px] uppercase tracking-wider text-text-subtle">
                <th className="px-4 py-2.5 font-medium">Company</th>
                <th className="px-4 py-2.5 font-medium">Contact Name</th>
                <th className="px-4 py-2.5 font-medium">Phone</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">City</th>
                <th className="px-4 py-2.5 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((supplier) => (
                <tr
                  key={supplier.id}
                  className="hover:bg-surface-hover transition-colors group"
                >
                  <td className="px-4 py-2.5 text-sm font-medium text-text">
                    <Link href={`/suppliers/${supplier.id}`} className="block">
                      {supplier.company_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-text-muted">
                    {supplier.contact_name || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-text-muted">
                    {supplier.phone || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-text-muted">
                    {supplier.email || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-text-muted">
                    {supplier.city || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-text-faint group-hover:text-text">
                    <Link href={`/suppliers/${supplier.id}`}>
                      <ChevronRight size={16} />
                    </Link>
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