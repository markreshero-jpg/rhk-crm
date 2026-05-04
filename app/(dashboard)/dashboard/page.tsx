'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDashboardData, DashboardData } from '@/lib/dashboard'

const PIPELINE_STAGES = [
  'Inquiry',
  'Quote Sent',
  'Quote Accepted',
  'In Production',
  'Completed',
]

function fmtCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return '$' + Math.round(value).toLocaleString('en-AU')
}

function statusBadgeClass(status: string | null): string {
  switch (status) {
    case 'In Production':  return 'bg-accent text-accent-text'
    case 'Quote Accepted': return 'bg-success-bg text-success border border-success-border'
    case 'Quote Sent':     return 'bg-info-bg text-info border border-info-border'
    case 'Completed':      return 'bg-surface-muted text-text-subtle border border-border'
    case 'Cancelled':      return 'bg-danger-bg text-danger border border-danger-border'
    case 'Was Not Quoted': return 'bg-surface-muted text-text-faint border border-border'
    default:               return 'bg-surface-muted text-text-subtle border border-border'
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardData()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const inProduction = data?.jobsByStatus['In Production'] ?? 0
  const quotesOut    = data?.jobsByStatus['Quote Sent'] ?? 0
  const inquiries    = data?.jobsByStatus['Inquiry'] ?? 0

  const recentJobsTotal = (data?.recentJobs ?? []).reduce(
    (sum, j) => sum + (j.total_ex_gst ?? 0),
    0
  )
  const inProductionTotal = (data?.inProductionJobs ?? []).reduce(
    (sum, j) => sum + (j.total_ex_gst ?? 0),
    0
  )

  return (
    <div className="p-10 max-w-7xl">
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-1">Overview</p>
        <h2 className="text-4xl font-medium text-text tracking-tight">Dashboard</h2>
      </div>

      {loading ? (
        <p className="text-text-subtle text-sm">Loading...</p>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              label="In Production"
              display={fmtCurrency(data?.inProductionValue)}
              sub={`${inProduction} active job${inProduction !== 1 ? 's' : ''} · ex GST`}
              href="/jobs"
              variant="accent"
            />
            <StatCard
              label="Quotes Out"
              display={fmtCurrency(data?.quotesOutValue)}
              sub={`${quotesOut} quote${quotesOut !== 1 ? 's' : ''} awaiting response · ex GST`}
              href="/jobs"
              variant="info"
            />
            <StatCard
              label="New Inquiries"
              display={String(inquiries)}
              sub="to action"
              href="/jobs"
              variant="default"
            />
            <StatCard
              label="Total Clients"
              display={String(data?.totalClients ?? 0)}
              sub="in the system"
              href="/clients"
              variant="default"
            />
          </div>

          {/* Pipeline strip */}
          <div className="bg-surface border border-border rounded-lg mb-6 px-5 pt-4 pb-5">
            <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-4">
              Job Pipeline
            </p>
            <div className="flex gap-2">
              {PIPELINE_STAGES.map((stage) => {
                const count = data?.jobsByStatus[stage] ?? 0
                const isActive = count > 0
                return (
                  <Link
                    key={stage}
                    href="/jobs"
                    className={`flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-md border transition-colors hover:bg-surface-hover ${
                      isActive ? 'border-border-strong' : 'border-border'
                    }`}
                  >
                    <span className={`text-2xl font-semibold tracking-tight ${isActive ? 'text-text' : 'text-text-faint'}`}>
                      {count}
                    </span>
                    <span className="text-[10px] text-text-subtle text-center leading-tight">{stage}</span>
                  </Link>
                )
              })}
              {(['Cancelled', 'Was Not Quoted'] as const).map((stage) => {
                const count = data?.jobsByStatus[stage] ?? 0
                if (!count) return null
                return (
                  <Link
                    key={stage}
                    href="/jobs"
                    className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-md border border-border transition-colors hover:bg-surface-hover"
                  >
                    <span className="text-2xl font-semibold tracking-tight text-text-faint">{count}</span>
                    <span className="text-[10px] text-text-faint text-center leading-tight">{stage}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Two-column bottom section */}
          <div className="grid grid-cols-3 gap-6">
            {/* Recent jobs */}
            <div className="col-span-2 bg-surface border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Recent Jobs</p>
                <Link href="/jobs" className="text-xs text-text-muted hover:text-text transition-colors">
                  View all
                </Link>
              </div>

              {(data?.recentJobs ?? []).length === 0 ? (
                <p className="px-5 py-10 text-sm text-text-faint text-center italic">No jobs yet</p>
              ) : (
                <>
                  <div className="divide-y divide-border">
                    {(data?.recentJobs ?? []).map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-surface-hover transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[11px] text-text-subtle font-mono shrink-0">{job.job_number}</span>
                            <span className="text-sm text-text truncate">{job.title || 'Untitled'}</span>
                          </div>
                          <p className="text-xs text-text-muted mt-0.5">
                            {job.client_name}
                            {job.site_suburb ? ` · ${job.site_suburb}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {job.total_ex_gst != null && (
                            <span className="text-sm font-medium text-text tabular-nums">
                              {fmtCurrency(job.total_ex_gst)}
                            </span>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadgeClass(job.status)}`}>
                            {job.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Total row */}
                  <div className="flex items-center justify-between px-5 py-3 bg-surface-muted border-t border-border-strong">
                    <span className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
                      Total (shown · ex GST)
                    </span>
                    <span className="text-sm font-semibold text-text tabular-nums">
                      {fmtCurrency(recentJobsTotal || null)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* In Production */}
            <div className="col-span-1 bg-surface border border-border rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">In Production</p>
              </div>

              {(data?.inProductionJobs ?? []).length === 0 ? (
                <p className="px-5 py-10 text-sm text-text-faint text-center italic">No active jobs</p>
              ) : (
                <>
                  <div className="divide-y divide-border">
                    {(data?.inProductionJobs ?? []).map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="block px-5 py-3 hover:bg-surface-hover transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-text truncate">{job.title || 'Untitled'}</p>
                          {job.total_ex_gst != null && (
                            <span className="text-xs font-medium text-text-muted tabular-nums shrink-0">
                              {fmtCurrency(job.total_ex_gst)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          {job.client_name}
                          {job.site_suburb ? ` · ${job.site_suburb}` : ''}
                        </p>
                      </Link>
                    ))}
                  </div>

                  {/* In Production total */}
                  <div className="flex items-center justify-between px-5 py-3 bg-surface-muted border-t border-border-strong">
                    <span className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
                      Total · ex GST
                    </span>
                    <span className="text-sm font-semibold text-text tabular-nums">
                      {fmtCurrency(inProductionTotal || null)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

type Variant = 'default' | 'accent' | 'info'

function StatCard({
  label,
  display,
  sub,
  href,
  variant = 'default',
}: {
  label: string
  display: string
  sub: string
  href: string
  variant?: Variant
}) {
  const styles: Record<Variant, { wrap: string; label: string; value: string; sub: string }> = {
    default: {
      wrap:  'bg-surface border-border',
      label: 'text-text-subtle',
      value: 'text-text',
      sub:   'text-text-subtle',
    },
    accent: {
      wrap:  'bg-accent border-transparent',
      label: 'text-accent-text-muted',
      value: 'text-accent-text',
      sub:   'text-accent-text-muted',
    },
    info: {
      wrap:  'bg-info-bg border-info-border',
      label: 'text-info',
      value: 'text-info',
      sub:   'text-info',
    },
  }
  const s = styles[variant]

  return (
    <Link
      href={href}
      className={`block rounded-lg border px-5 py-4 hover:opacity-90 transition-opacity ${s.wrap}`}
    >
      <p className={`text-[10px] uppercase tracking-widest font-medium mb-3 ${s.label}`}>{label}</p>
      <p className={`text-3xl font-semibold tracking-tight tabular-nums ${s.value}`}>{display}</p>
      <p className={`text-xs mt-1.5 ${s.sub}`}>{sub}</p>
    </Link>
  )
}
