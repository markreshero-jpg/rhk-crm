'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import ClientForm from '@/components/ClientForm'
import { createClient, Client } from '@/lib/clients'

export default function NewClientPage() {
  return (
    <div className="p-10 max-w-7xl">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 mb-4"
      >
        <ChevronLeft size={14} /> Back to clients
      </Link>

      <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">
        Workspace
      </p>
      <h2 className="text-4xl font-medium text-stone-900 tracking-tight mb-2">
        New Client
      </h2>
      <p className="text-stone-500 mt-2 mb-8 text-sm">
        Add a new client to your records.
      </p>

      <ClientForm
        onSubmit={async (data: Partial<Client>) => {
          await createClient(data)
        }}
        submitLabel="Create Client"
      />
    </div>
  )
}