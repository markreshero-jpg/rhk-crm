'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight } from 'lucide-react'
import { searchJobs, JobWithClient } from '@/lib/jobs'
import ListFilters, { FilterDef } from '@/components/ListFilters'

const statusStyles: Record<string, string> = {
  'Inquiry': 'bg-info-bg text-info border-info-border',
  'Quote Sent': 'bg-info-bg text-info border-info-border',
  'Quote Accepted': 'bg-success-bg text-success border-success-border',
  'Was Not Quoted': 'bg-surface-muted text-text-muted border-border',
  'In Production': 'bg-warning-bg text-warning border-warning-border',
  'Completed': 'bg-success-bg text-success border-success-border',
  'Cancelled': 'bg-surface-muted text-text-muted border-border',
}

const STATUS_OPTIONS = [
  'Inquiry',
  'Quote Sent',
  'Quote Accepted',
  'Was Not Quoted',
  'In Production',
  'Completed',
  'Cancelled',
]

const filters: FilterDef[] = [
  {
    id: 'status',
    label: 'Status',
    options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
  },
]

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobWithClient[]>([])
  const [query, setQuery] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      searchJobs(query)
        .then(setJobs)
        .finally(() => setLoading(false))
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  // Apply client-side status filter on top of search results
  const filteredJobs = useMemo(() => {
    if (!filterValues.status) return jobs
    return jobs.filter((j) => j.status === filterValues.status)
  }, [jobs, filterValues])

  function handleFilterChange(id: string, value: string) {
    setFilterValues((prev) => ({ ...prev, [id]: value }))
  }

  function formatAddress(job: JobWithClient): string {
    const parts = [job.site_address_line_1, job.site_suburb, job.site_postcode].filter(Boolean)
    return parts.join(', ') || '—'
  }

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
          className="flex items-center gap-2 bg-accent text-accent-text px-4 py-2 rounded-md text-sm hover:bg-accent-hover transition-colors"
        >
          <Plus size={15} />
          <span>New Job</span>
        </Link>
      </div>
      <p className="text-text-muted mt-2 mb-6 text-sm">
        All jobs and their current status.
      </p>

      <ListFilters
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by job number, title, or suburb..."
        filters={filters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        resultCount={filteredJobs.length}
        resultLabel={filteredJobs.length === 1 ? 'job' : 'jobs'}
      />

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-text-subtle text-sm">Loading...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-text-subtle text-sm">
              {query || filterValues.status ? 'No jobs match.' : 'No jobs yet.'}
            </p>
            {!query && !filterValues.status && (
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
                <th className="px-3 py-1.5 font-medium w-24">Job #</th>
                <th className="px-3 py-1.5 font-medium w-48">Client</th>
                <th className="px-3 py-1.5 font-medium">Title</th>
                <th className="px-3 py-1.5 font-medium">Address</th>
                <th className="px-3 py-1.5 font-medium w-32">Status</th>
                <th className="px-3 py-1.5 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredJobs.map((job) => (
                <tr
                  key={job.id}
                  className="hover:bg-surface-hover transition-colors group"
                >
                  <td className="px-3 py-1.5 text-sm font-mono text-text-muted whitespace-nowrap">
                    <Link href={`/jobs/${job.id}`} className="block">
                      {job.job_number}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5 text-sm font-medium text-text truncate">
                    {job.client?.name || '—'}
                  </td>
                  <td className="px-3 py-1.5 text-sm text-text-muted truncate">
                    {job.title || '—'}
                  </td>
                  <td className="px-3 py-1.5 text-sm text-text-muted truncate">
                    {formatAddress(job)}
                  </td>
                  <td className="px-3 py-1.5">
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
                  <td className="px-3 py-1.5 text-text-faint group-hover:text-text">
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