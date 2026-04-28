'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, ChevronRight } from 'lucide-react'
import { searchJobs, JobWithClient } from '@/lib/jobs'

const statusStyles: Record<string, string> = {
  'Inquiry': 'bg-info-bg text-info border-info-border',
  'Quote Sent': 'bg-info-bg text-info border-info-border',
  'Quote Accepted': 'bg-success-bg text-success border-success-border',
  'Was Not Quoted': 'bg-surface-muted text-text-muted border-border',
  'In Production': 'bg-warning-bg text-warning border-warning-border',
  'Completed': 'bg-success-bg text-success border-success-border',
  'Cancelled': 'bg-surface-muted text-text-muted border-border',
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobWithClient[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      searchJobs(query)
        .then(setJobs)
        .finally(() => setLoading(false))
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="p-10 max-w-7xl">
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <p className="text-xs uppercase tracking-widest text-text-subtle mb-2">
            Workspace
          </p>
          <h2 className="text-4xl font-medium text-text tracking-tight">
            Jobs
          </h2>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center gap-2 bg-accent text-accent-text px-4 py-2.5 rounded-md text-sm hover:bg-accent-hover transition-colors"
        >
          <Plus size={15} />
          <span>New Job</span>
        </Link>
      </div>
      <p className="text-text-muted mt-2 mb-8 text-sm">
        All jobs and their current status.
      </p>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by job number, title, or suburb..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border"
          />
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs text-text-subtle">
          <span>{jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}</span>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <p className="text-text-subtle text-sm">Loading...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-text-subtle text-sm">
              {query ? 'No jobs match your search.' : 'No jobs yet.'}
            </p>
            {!query && (
              <Link
                href="/jobs/new"
                className="inline-flex items-center gap-2 mt-4 text-sm text-text underline hover:no-underline"
              >
                Add your first job
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface-muted border-b border-border">
              <tr className="text-left text-[11px] uppercase tracking-wider text-text-subtle">
                <th className="px-4 py-2.5 font-medium">Job #</th>
                <th className="px-4 py-2.5 font-medium">Client</th>
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
                  <td className="px-4 py-2.5 text-sm font-medium text-text">
                    {job.client?.name || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-text-muted">
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
        )}
      </div>
    </div>
  )
}