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
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-muted border-b border-border">
              <tr className="text-left text-[11px] uppercase tracking-wider text-text-subtle">
                <th className="px-4 py-2.5 font-medium">Job #</th>
                <th className="px-4 py-2.5 font-medium">Title</th>
                <th className="px-4 py-2.5 font-medium">Suburb</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="hover:bg-surface-hover transition-colors group"
                >
                  <td className="px-4 py-2.5 text-sm font-mono text-text-muted whitespace-nowrap">
                    <Link href={`/jobs/${job.id}`} className="block">
                      {job.job_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-text">
                    {job.title || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-text-muted">
                    {job.site_suburb || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {job.status ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          statusStyles[job.status] || 'bg-surface-muted text-text-muted border-border'
                        }`}
                      >
                        {job.status}
                      </span>
                    ) : (
                      <span className="text-text-faint text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-text-faint group-hover:text-text">
                    <Link href={`/jobs/${job.id}`}>
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