'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDashboardData, DashboardData, WorkOrderSummary, ScheduleEventSummary, PODraftSummary } from '@/lib/dashboard'
import { createClient } from '@/lib/supabase-browser'
import { Staff, getStaffByUserId } from '@/lib/staff'
import FieldDashboard from '@/components/FieldDashboard'
import ForemanDashboard from '@/components/ForemanDashboard'

const PIPELINE_STAGES = ['Inquiry', 'Quote Sent', 'Quote Accepted', 'In Production', 'Completed']

const woStatusStyles: Record<string, string> = {
  'Draft':       'bg-surface-muted text-text-muted border-border',
  'Ready':       'bg-info-bg text-info border-info-border',
  'In Progress': 'bg-warning-bg text-warning border-warning-border',
}

function fmtCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return '$' + Math.round(value).toLocaleString('en-AU')
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function fmtTime(t: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`
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
  const [fieldStaff, setFieldStaff] = useState<Staff | null>(null)
  const [foremanStaff, setForemanStaff] = useState<Staff | null>(null)
  const [roleChecked, setRoleChecked] = useState(false)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const staff = await getStaffByUserId(session.user.id)
        if (staff?.dashboard_role === 'field') {
          setFieldStaff(staff)
          setRoleChecked(true)
          return
        }
        if (staff?.dashboard_role === 'foreman') {
          setForemanStaff(staff)
          setRoleChecked(true)
          return
        }
      }
      setRoleChecked(true)
      getDashboardData().then(setData).finally(() => setLoading(false))
    }
    init()
  }, [])

  if (!roleChecked) return null
  if (fieldStaff) return <FieldDashboard staff={fieldStaff} />
  if (foremanStaff) return <ForemanDashboard staff={foremanStaff} />

  const inProduction = data?.jobsByStatus['In Production'] ?? 0
  const quotesOut    = data?.jobsByStatus['Quote Sent'] ?? 0
  const inquiries    = data?.jobsByStatus['Inquiry'] ?? 0

  return (
    <div className="p-10 max-w-[1400px]">
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
            <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-4">Job Pipeline</p>
            <div className="flex gap-2">
              {PIPELINE_STAGES.map((stage) => {
                const count = data?.jobsByStatus[stage] ?? 0
                const isActive = count > 0
                return (
                  <Link
                    key={stage}
                    href="/jobs"
                    className={`flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-md border transition-colors hover:bg-surface-hover ${isActive ? 'border-border-strong' : 'border-border'}`}
                  >
                    <span className={`text-2xl font-semibold tracking-tight ${isActive ? 'text-text' : 'text-text-faint'}`}>{count}</span>
                    <span className="text-[10px] text-text-subtle text-center leading-tight">{stage}</span>
                  </Link>
                )
              })}
              {(['Cancelled', 'Was Not Quoted'] as const).map((stage) => {
                const count = data?.jobsByStatus[stage] ?? 0
                if (!count) return null
                return (
                  <Link key={stage} href="/jobs" className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-md border border-border transition-colors hover:bg-surface-hover">
                    <span className="text-2xl font-semibold tracking-tight text-text-faint">{count}</span>
                    <span className="text-[10px] text-text-faint text-center leading-tight">{stage}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Main content — 4 columns */}
          <div className="grid grid-cols-4 gap-5">

            {/* Quotes to Do */}
            <div className="col-span-1 bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
                <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Quotes to Do</p>
                <Link href="/jobs" className="text-xs text-text-muted hover:text-text transition-colors">View all</Link>
              </div>
              {(data?.inquiryJobs ?? []).length === 0 ? (
                <p className="px-5 py-10 text-sm text-text-faint text-center italic flex-1">No open enquiries</p>
              ) : (
                <div className="divide-y divide-border overflow-y-auto flex-1">
                  {(data?.inquiryJobs ?? []).map((job) => (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] text-text-subtle font-mono shrink-0">{job.job_number}</span>
                          <span className="text-sm text-text truncate">{job.title || 'Untitled'}</span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5 truncate">{job.client_name}{job.site_suburb ? ` · ${job.site_suburb}` : ''}</p>
                      </div>
                      {job.total_ex_gst != null && (
                        <span className="text-xs font-medium text-text-muted tabular-nums shrink-0">{fmtCurrency(job.total_ex_gst)}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Work Orders */}
            <div className="col-span-1 bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
                <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Work Orders</p>
                <span className="text-xs text-text-faint">{(data?.activeWorkOrders ?? []).length}</span>
              </div>
              {(data?.activeWorkOrders ?? []).length === 0 ? (
                <p className="px-5 py-10 text-sm text-text-faint text-center italic flex-1">No active work orders</p>
              ) : (
                <div className="divide-y divide-border overflow-y-auto flex-1">
                  {(data?.activeWorkOrders ?? []).map((wo) => (
                    <WorkOrderRow key={wo.id} wo={wo} />
                  ))}
                </div>
              )}
            </div>

            {/* Draft Purchase Orders */}
            <div className="col-span-1 bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
                <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Draft Purchase Orders</p>
                <Link href="/purchase-orders" className="text-xs text-text-muted hover:text-text transition-colors">{(data?.draftPOs ?? []).length}</Link>
              </div>
              {(data?.draftPOs ?? []).length === 0 ? (
                <p className="px-5 py-10 text-sm text-text-faint text-center italic flex-1">No draft orders</p>
              ) : (
                <div className="divide-y divide-border overflow-y-auto flex-1">
                  {(data?.draftPOs ?? []).map((po) => (
                    <PODraftRow key={po.id} po={po} />
                  ))}
                </div>
              )}
            </div>

            {/* Installations — next 14 days */}
            <div className="col-span-1 bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
                <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Installations · Next 14 Days</p>
                <span className="text-xs text-text-faint">{(data?.upcomingScheduleEvents ?? []).length}</span>
              </div>
              {(data?.upcomingScheduleEvents ?? []).length === 0 ? (
                <p className="px-5 py-10 text-sm text-text-faint text-center italic flex-1">Nothing scheduled</p>
              ) : (
                <div className="divide-y divide-border overflow-y-auto flex-1">
                  {(data?.upcomingScheduleEvents ?? []).map((evt) => (
                    <ScheduleEventRow key={evt.id} evt={evt} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function WorkOrderRow({ wo }: { wo: WorkOrderSummary }) {
  return (
    <Link href={`/jobs/${wo.job_id}?tab=work-orders`} className="block px-5 py-3 hover:bg-surface-hover transition-colors">
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <div className="flex items-center gap-2 min-w-0">
          {wo.work_order_number && (
            <span className="text-[10px] font-mono text-text-subtle shrink-0">{wo.work_order_number}</span>
          )}
          <span className="text-sm text-text truncate">{wo.title || 'Untitled'}</span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${woStatusStyles[wo.status] || 'bg-surface-muted text-text-muted border-border'}`}>
          {wo.status}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-text-muted truncate">
          {wo.client_name && <span>{wo.client_name} · </span>}
          {wo.job_number && <span className="font-mono">{wo.job_number}</span>}
          {wo.job_title && <span> · {wo.job_title}</span>}
        </p>
        {(wo.scheduled_start || wo.scheduled_end) && (
          <p className="text-[11px] text-text-subtle shrink-0 tabular-nums">
            {fmtDate(wo.scheduled_start)}{wo.scheduled_end ? ` – ${fmtDate(wo.scheduled_end)}` : ''}
          </p>
        )}
      </div>
    </Link>
  )
}

function ScheduleEventRow({ evt }: { evt: ScheduleEventSummary }) {
  const statusStyles: Record<string, string> = {
    'Unscheduled': 'bg-surface-muted text-text-muted border-border',
    'Scheduled':   'bg-info-bg text-info border-info-border',
    'In Progress': 'bg-warning-bg text-warning border-warning-border',
  }
  return (
    <Link href={`/jobs/${evt.job_id}?tab=schedule`} className="block px-5 py-3 hover:bg-surface-hover transition-colors">
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <div className="flex items-center gap-2 min-w-0">
          {evt.trade_type && (
            <span className="text-[10px] font-medium text-text-subtle shrink-0 bg-surface-muted px-1.5 py-0.5 rounded border border-border">{evt.trade_type}</span>
          )}
          <span className="text-sm text-text truncate">{evt.title || 'Untitled'}</span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${statusStyles[evt.status] || 'bg-surface-muted text-text-muted border-border'}`}>
          {evt.status}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-text-muted truncate">
          {evt.client_name && <span>{evt.client_name} · </span>}
          {evt.job_number && <span className="font-mono">{evt.job_number}</span>}
          {evt.job_title && <span> · {evt.job_title}</span>}
        </p>
        <p className="text-[11px] text-text-subtle shrink-0 tabular-nums">
          {evt.scheduled_date ? fmtDate(evt.scheduled_date) : ''}
          {evt.start_time ? ` ${fmtTime(evt.start_time)}` : ''}
          {evt.staff_name ? ` · ${evt.staff_name}` : ''}
        </p>
      </div>
    </Link>
  )
}

function PODraftRow({ po }: { po: PODraftSummary }) {
  return (
    <Link href="/purchase-orders" className="block px-5 py-3 hover:bg-surface-hover transition-colors">
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="text-sm font-semibold font-mono tracking-tight text-text">{po.po_number || 'Draft'}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-gray-100 text-gray-500 border-gray-200 whitespace-nowrap shrink-0">
          {po.status}
        </span>
      </div>
      <p className="text-xs text-text-muted truncate">{po.supplier_name || '—'}</p>
      {po.order_date && <p className="text-[11px] text-text-subtle mt-0.5">{fmtDate(po.order_date)}</p>}
    </Link>
  )
}

type Variant = 'default' | 'accent' | 'info'

function StatCard({ label, display, sub, href, variant = 'default' }: {
  label: string; display: string; sub: string; href: string; variant?: Variant
}) {
  const styles: Record<Variant, { wrap: string; label: string; value: string; sub: string }> = {
    default: { wrap: 'bg-surface border-border', label: 'text-text-subtle', value: 'text-text', sub: 'text-text-subtle' },
    accent:  { wrap: 'bg-accent border-transparent', label: 'text-accent-text-muted', value: 'text-accent-text', sub: 'text-accent-text-muted' },
    info:    { wrap: 'bg-info-bg border-info-border', label: 'text-info', value: 'text-info', sub: 'text-info' },
  }
  const s = styles[variant]
  return (
    <Link href={href} className={`block rounded-lg border px-5 py-4 hover:opacity-90 transition-opacity ${s.wrap}`}>
      <p className={`text-[10px] uppercase tracking-widest font-medium mb-3 ${s.label}`}>{label}</p>
      <p className={`text-3xl font-semibold tracking-tight tabular-nums ${s.value}`}>{display}</p>
      <p className={`text-xs mt-1.5 ${s.sub}`}>{sub}</p>
    </Link>
  )
}
