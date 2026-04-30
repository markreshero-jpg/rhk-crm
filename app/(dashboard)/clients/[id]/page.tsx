'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import ClientForm from '@/components/ClientForm'
import Tabs from '@/components/Tabs'
import ClientJobs from '@/components/ClientJobs'
import {
  getClientById,
  updateClient,
  deleteClient,
  Client,
} from '@/lib/clients'
import { getJobsByClientId } from '@/lib/jobs'

export default function ClientWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'details'

  const [client, setClient] = useState<Client | null>(null)
  const [jobCount, setJobCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      getClientById(id),
      getJobsByClientId(id),
    ])
      .then(([clientData, jobs]) => {
        setClient(clientData)
        setJobCount(jobs.length)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load client')
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="p-10">
        <p className="text-text-subtle text-sm">Loading...</p>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="p-10">
        <p className="text-danger text-sm">{error || 'Client not found'}</p>
        <Link href="/clients" className="text-sm underline mt-4 inline-block">
          Back to clients
        </Link>
      </div>
    )
  }

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'jobs', label: 'Jobs', count: jobCount },
  ]

  return (
    <div className="p-10 max-w-7xl">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-xs text-text-subtle hover:text-text mb-4"
      >
        <ChevronLeft size={14} /> Back to clients
      </Link>

      <p className="text-xs uppercase tracking-widest text-text-subtle mb-2">
        Workspace
      </p>
      <h2 className="text-4xl font-medium text-text tracking-tight mb-2">
        {client.name}
      </h2>
      <p className="text-text-muted mt-2 mb-8 text-sm">
        {client.client_type || 'Client'}{' '}
        {client.suburb && `· ${client.suburb}`}
      </p>

      <Tabs tabs={tabs} activeTab={activeTab}>
        {activeTab === 'details' && (
          <ClientForm
            initialData={client}
            onSubmit={async (data) => {
              await updateClient(id, data)
            }}
            onDelete={async () => {
              await deleteClient(id)
            }}
            submitLabel="Save Changes"
          />
        )}

        {activeTab === 'jobs' && <ClientJobs clientId={id} />}
      </Tabs>
    </div>
  )
}