'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import JobForm from '@/components/JobForm'
import JobQuoteTab from '@/components/JobQuoteTab'
import Tabs from '@/components/Tabs'
import {
  getJobById,
  updateJob,
  deleteJob,
  JobWithClient,
} from '@/lib/jobs'

export default function JobWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'details'

  const [job, setJob] = useState<JobWithClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getJobById(id)
      .then((data) => {
        setJob(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load job')
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

  if (error || !job) {
    return (
      <div className="p-10">
        <p className="text-danger text-sm">{error || 'Job not found'}</p>
        <Link href="/jobs" className="text-sm underline mt-4 inline-block">
          Back to jobs
        </Link>
      </div>
    )
  }

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'quote', label: 'Quote' },
    { id: 'work-orders', label: 'Work Orders' },
    { id: 'calendar', label: 'Calendar' },
  ]

  return (
    <div className="p-10 max-w-7xl">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1 text-xs text-text-subtle hover:text-text mb-4"
      >
        <ChevronLeft size={14} /> Back to jobs
      </Link>

      <p className="text-xs uppercase tracking-widest text-text-subtle mb-2">
        {job.job_number}
        {job.client?.name && ` · ${job.client.name}`}
      </p>
      <h2 className="text-4xl font-medium text-text tracking-tight mb-2">
        {job.title || 'Untitled job'}
      </h2>
      <p className="text-text-muted mt-2 mb-8 text-sm">
        {job.status || 'No status set'}
      </p>

      <Tabs tabs={tabs} activeTab={activeTab}>
        {activeTab === 'details' && (
          <JobForm
            initialData={job}
            onSubmit={async (data) => {
              await updateJob(id, data)
            }}
            onDelete={async () => {
              await deleteJob(id)
            }}
            submitLabel="Save Changes"
          />
        )}

        {activeTab === 'quote' && <JobQuoteTab jobId={id} />}

        {activeTab === 'work-orders' && (
          <div className="text-text-subtle text-sm p-12 text-center">
            Work Orders — coming soon
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="text-text-subtle text-sm p-12 text-center">
            Calendar — coming soon
          </div>
        )}
      </Tabs>
    </div>
  )
}