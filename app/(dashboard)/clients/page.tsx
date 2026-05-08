'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight } from 'lucide-react'
import { searchClients, Client } from '@/lib/clients'
import ListFilters, { FilterDef } from '@/components/ListFilters'
import ResizableTable, { ColDef } from '@/components/ResizableTable'

const filters: FilterDef[] = [
  {
    id: 'client_type',
    label: 'Type',
    options: [
      { value: 'Residential', label: 'Residential' },
      { value: 'Commercial', label: 'Commercial' },
      { value: 'Property Manager', label: 'Property Manager' },
    ],
  },
  {
    id: 'client_source',
    label: 'Source',
    options: [
      { value: 'Referral', label: 'Referral' },
      { value: 'Walk In', label: 'Walk In' },
      { value: 'Website', label: 'Website' },
      { value: 'Repeat', label: 'Repeat' },
      { value: 'Unknown', label: 'Unknown' },
    ],
  },
]

const CLIENTS_COLUMNS: ColDef[] = [
  { key: 'name',   label: 'Name',   defaultWidth: 220, minWidth: 80 },
  { key: 'phone',  label: 'Phone',  defaultWidth: 140, minWidth: 80 },
  { key: 'email',  label: 'Email',  defaultWidth: 220, minWidth: 80 },
  { key: 'suburb', label: 'Suburb', defaultWidth: 140, minWidth: 60 },
  { key: 'type',   label: 'Type',   defaultWidth: 140, minWidth: 60 },
  { key: 'source', label: 'Source', defaultWidth: 120, minWidth: 60 },
  { key: 'arrow',  defaultWidth: 32, minWidth: 32, noResize: true },
]

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [query, setQuery] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      searchClients(query)
        .then(setClients)
        .finally(() => setLoading(false))
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (filterValues.client_type && c.client_type !== filterValues.client_type) return false
      if (filterValues.client_source && c.client_source !== filterValues.client_source) return false
      return true
    })
  }, [clients, filterValues])

  function handleFilterChange(id: string, value: string) {
    setFilterValues((prev) => ({ ...prev, [id]: value }))
  }

  return (
    <div className="p-10 max-w-7xl">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <p className="text-xs uppercase tracking-widest text-text-subtle mb-2">
            Workspace
          </p>
          <h2 className="text-4xl font-medium text-text tracking-tight">
            Clients
          </h2>
        </div>
        <Link
          href="/clients/new"
          className="flex items-center gap-2 bg-accent text-accent-text px-4 py-2 rounded-md text-sm hover:bg-accent-hover transition-colors"
        >
          <Plus size={15} />
          <span>New Client</span>
        </Link>
      </div>
      <p className="text-text-muted mt-2 mb-6 text-sm">
        All clients and their contact details.
      </p>

      <ListFilters
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by name, phone, email, or suburb..."
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        resultCount={filteredClients.length}
        resultLabel={filteredClients.length === 1 ? 'client' : 'clients'}
      />

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-text-subtle text-sm">Loading...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-text-subtle text-sm">
              {query || Object.values(filterValues).some(Boolean)
                ? 'No clients match.'
                : 'No clients yet.'}
            </p>
          </div>
        ) : (
          <ResizableTable storageKey="clients-list" columns={CLIENTS_COLUMNS}>
            <tbody className="divide-y divide-border">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-surface-hover transition-colors group">
                  <td className="px-3 py-1.5 text-sm font-medium text-text truncate">
                    <Link href={`/clients/${client.id}`} className="block">{client.name}</Link>
                  </td>
                  <td className="px-3 py-1.5 text-sm text-text-muted whitespace-nowrap truncate">
                    {client.phone || client.mobile || '—'}
                  </td>
                  <td className="px-3 py-1.5 text-sm text-text-muted truncate">{client.email || '—'}</td>
                  <td className="px-3 py-1.5 text-sm text-text-muted truncate">{client.suburb || '—'}</td>
                  <td className="px-3 py-1.5 text-sm text-text-muted truncate">{client.client_type || '—'}</td>
                  <td className="px-3 py-1.5 text-sm text-text-muted truncate">{client.client_source || '—'}</td>
                  <td className="px-3 py-1.5 text-text-faint group-hover:text-text">
                    <Link href={`/clients/${client.id}`}><ChevronRight size={16} /></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </ResizableTable>
        )}
      </div>
    </div>
  )
}