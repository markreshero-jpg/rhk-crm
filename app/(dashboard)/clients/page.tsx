'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, ChevronRight } from 'lucide-react'
import { searchClients, Client } from '@/lib/clients'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      searchClients(query)
        .then(setClients)
        .finally(() => setLoading(false))
    }, 200) // debounce 200ms

    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="p-10 max-w-7xl">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">
            Workspace
          </p>
          <h2 className="text-4xl font-medium text-stone-900 tracking-tight">
            Clients
          </h2>
        </div>
        <Link
          href="/clients/new"
          className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2.5 rounded-md text-sm hover:bg-stone-800 transition-colors"
        >
          <Plus size={15} />
          <span>New Client</span>
        </Link>
      </div>
      <p className="text-stone-500 mt-2 mb-8 text-sm">
        All clients and their contact details.
      </p>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-200 rounded-md focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
          />
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs text-stone-500">
          <span>{clients.length} {clients.length === 1 ? 'client' : 'clients'}</span>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <p className="text-stone-500 text-sm">Loading...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-stone-500 text-sm">
              {query ? 'No clients match your search.' : 'No clients yet.'}
            </p>
            {!query && (
              <Link
                href="/clients/new"
                className="inline-flex items-center gap-2 mt-4 text-sm text-stone-900 underline hover:no-underline"
              >
                Add your first client
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr className="text-left text-[11px] uppercase tracking-wider text-stone-500">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="hover:bg-stone-50/70 transition-colors group"
                >
                  <td className="px-5 py-4 text-sm font-medium text-stone-900">
                    <Link href={`/clients/${client.id}`} className="block">
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">
                    {client.phone || client.mobile || '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">
                    {client.email || '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">
                    {client.client_type || '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">
                    {client.client_source || '—'}
                  </td>
                  <td className="px-5 py-4 text-stone-400 group-hover:text-stone-700">
                    <Link href={`/clients/${client.id}`}>
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}