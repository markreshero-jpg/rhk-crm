'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import JobForm from '@/components/JobForm'
import {
  getJobById,
  updateJob,
  deleteJob,
  JobWithClient,
} from '@/lib/jobs'

export default function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
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
      </p>
      <h2 className="text-4xl font-medium text-text tracking-tight mb-2">
        {job.title || job.client?.name || 'Job'}
      </h2>
      <p className="text-text-muted mt-2 mb-8 text-sm">
        Edit job details.
      </p>

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
    </div>
  )
}