'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight } from 'lucide-react'
import { getJobsByClientId, JobWithClient } from '@/lib/jobs'

const statusStyles: Record<string, string> = {
  'Inquiry': 'bg-info-bg text-info border-info-border',
  'Quote Sent': 'bg-info-bg text-info border-info-border',
  'Quote Accepted': 'bg-success-bg text-success border-success-border',
  'Was Not Quoted': 'bg-surface-muted text-text-muted border-border',
  'In Production': 'bg-warning-bg text-warning border-warning-border',
  'Completed': 'bg-success-bg text-success border-success-border',
  'Cancelled': 'bg-surface-muted text-text-muted border-border',
}

export default function ClientJobs({ clientId }: { clientId: string }) {
  const [jobs, setJobs] = useState<JobWithClient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getJobsByClientId(clientId)
      .then(setJobs)
      .finally(() => setLoading(false))
  }, [clientId])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
          Related Jobs
        </h3>
        <Link
          href={`/jobs/new?client_id=${clientId}`}
          className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover transition-colors"
        >
          <Plus size={12} />
          <span>New Job</span>
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <p className="text-text-subtle text-sm">Loading...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-text-subtle text-sm">No jobs yet for this client.</p>
          <Link
            href={`/jobs/new?client_id=${clientId}`}
            className="inline-flex items-center gap-2 mt-4 text-sm text-text underline hover:no-underline"
          >
            Create the first job
          </Link>
        </div>
      ) : (
        <div className="border border-border rounded-md overflow-hidden divide-y divide-border">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors group"
            >
              <div className="flex-1 flex items-center gap-2 min-w-0 text-sm">
                <span className="font-mono text-text-subtle shrink-0">{job.job_number}</span>
                {job.client?.name && (
                  <>
                    <span className="text-text-faint">·</span>
                    <span className="text-text-muted shrink-0">{job.client.name}</span>
                  </>
                )}
                <>
                  <span className="text-text-faint">·</span>
                  <span className="text-text font-medium truncate">{job.title || 'Untitled'}</span>
                </>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {job.status && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusStyles[job.status] || 'bg-surface-muted text-text-muted border-border'}`}>
                    {job.status}
                  </span>
                )}
                <ChevronRight size={16} className="text-text-faint group-hover:text-text transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}