'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import JobForm from '@/components/JobForm'
import { createJob, Job } from '@/lib/jobs'

export default function NewJobPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-text-subtle">Loading...</div>}>
      <NewJobPageContent />
    </Suspense>
  )
}

function NewJobPageContent() {
  const searchParams = useSearchParams()
  const prefilledClientId = searchParams.get('client_id')

  return (
    <div className="p-10 max-w-7xl">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1 text-xs text-text-subtle hover:text-text mb-4"
      >
        <ChevronLeft size={14} /> Back to jobs
      </Link>

      <p className="text-xs uppercase tracking-widest text-text-subtle mb-2">
        Workspace
      </p>
      <h2 className="text-4xl font-medium text-text tracking-tight mb-2">
        New Job
      </h2>
      <p className="text-text-muted mt-2 mb-8 text-sm">
        Create a new job and link it to a client.
      </p>

      <JobForm
        initialData={prefilledClientId ? { client_id: prefilledClientId } : {}}
        onSubmit={async (data: Partial<Job>) => {
          await createJob(data)
        }}
        submitLabel="Create Job"
      />
    </div>
  )
}
