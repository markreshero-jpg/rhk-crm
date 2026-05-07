import { supabase } from './supabase'
import { JobStatus } from './jobs'

export type JobSummary = {
  id: string
  job_number: string
  title: string | null
  status: JobStatus | null
  client_name: string | null
  site_suburb: string | null
  created_at: string
  total_ex_gst: number | null
}

export type WorkOrderSummary = {
  id: string
  work_order_number: string | null
  title: string | null
  status: string
  scheduled_start: string | null
  scheduled_end: string | null
  job_id: string
  job_number: string | null
  job_title: string | null
  client_name: string | null
}

export type PODraftSummary = {
  id: string
  po_number: string | null
  supplier_name: string | null
  order_date: string | null
  status: string
}

export type DashboardData = {
  jobsByStatus: Record<string, number>
  totalJobs: number
  totalClients: number
  inProductionValue: number | null
  quotesOutValue: number | null
  recentJobs: JobSummary[]
  inProductionJobs: JobSummary[]
  inquiryJobs: JobSummary[]
  activeWorkOrders: WorkOrderSummary[]
  upcomingInstallations: WorkOrderSummary[]
  draftPOs: PODraftSummary[]
}

// Pick the most relevant issue total: prefer Accepted, fall back to latest issue number
function getBestTotal(issues: { total_ex_gst: number | null; status: string; issue_number: number }[]): number | null {
  if (!issues || issues.length === 0) return null
  const accepted = issues.find((i) => i.status === 'Accepted')
  if (accepted?.total_ex_gst != null) return accepted.total_ex_gst
  const latest = [...issues].sort((a, b) => b.issue_number - a.issue_number)[0]
  return latest?.total_ex_gst ?? null
}

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date()
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const todayStr = now.toISOString().slice(0, 10)
  const in14DaysStr = in14Days.toISOString().slice(0, 10)

  const [jobsRes, clientsRes, workOrdersRes, installationsRes, draftPOsRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, job_number, title, status, site_suburb, created_at, client:clients(name), issues(total_ex_gst, status, issue_number)')
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('work_orders')
      .select('id, work_order_number, title, status, scheduled_start, scheduled_end, job:jobs(id, job_number, title, client:clients(name))')
      .in('status', ['Draft', 'Ready', 'In Progress'])
      .order('scheduled_start', { ascending: true })
      .limit(20),
    supabase
      .from('work_orders')
      .select('id, work_order_number, title, status, scheduled_start, scheduled_end, job:jobs(id, job_number, title, client:clients(name))')
      .gte('scheduled_start', todayStr)
      .lte('scheduled_start', in14DaysStr)
      .order('scheduled_start', { ascending: true })
      .limit(20),
    supabase
      .from('purchase_orders')
      .select('id, po_number, order_date, status, supplier:suppliers(company_name)')
      .eq('status', 'Draft')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (jobsRes.error) throw jobsRes.error
  if (clientsRes.error) throw clientsRes.error
  if (workOrdersRes.error) throw workOrdersRes.error
  if (installationsRes.error) throw installationsRes.error
  if (draftPOsRes.error) throw draftPOsRes.error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jobs = (jobsRes.data || []) as any[]
  const totalClients = clientsRes.count || 0

  const jobsByStatus: Record<string, number> = {}
  for (const job of jobs) {
    const s = job.status || 'Unknown'
    jobsByStatus[s] = (jobsByStatus[s] || 0) + 1
  }

  const toSummary = (j: typeof jobs[0]): JobSummary => ({
    id: j.id,
    job_number: j.job_number,
    title: j.title,
    status: j.status,
    client_name: j.client?.name ?? null,
    site_suburb: j.site_suburb,
    created_at: j.created_at,
    total_ex_gst: getBestTotal(j.issues ?? []),
  })

  const sumValues = (subset: typeof jobs) =>
    subset.reduce((acc: number, j: typeof jobs[0]) => acc + (getBestTotal(j.issues ?? []) ?? 0), 0)

  const inProductionJobs = jobs.filter((j) => j.status === 'In Production')
  const quotesOutJobs    = jobs.filter((j) => j.status === 'Quote Sent')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapWorkOrders = (rows: any[]): WorkOrderSummary[] => rows.map((wo: any) => ({
    id: wo.id,
    work_order_number: wo.work_order_number,
    title: wo.title,
    status: wo.status,
    scheduled_start: wo.scheduled_start,
    scheduled_end: wo.scheduled_end,
    job_id: wo.job?.id ?? '',
    job_number: wo.job?.job_number ?? null,
    job_title: wo.job?.title ?? null,
    client_name: wo.job?.client?.name ?? null,
  }))

  const inquiryJobs = jobs.filter((j) => j.status === 'Inquiry')

  return {
    jobsByStatus,
    totalJobs: jobs.length,
    totalClients,
    inProductionValue: inProductionJobs.length ? sumValues(inProductionJobs) : null,
    quotesOutValue:    quotesOutJobs.length    ? sumValues(quotesOutJobs)    : null,
    recentJobs:        jobs.slice(0, 8).map(toSummary),
    inProductionJobs:  inProductionJobs.map(toSummary),
    inquiryJobs:       inquiryJobs.map(toSummary),
    activeWorkOrders:  mapWorkOrders(workOrdersRes.data || []),
    upcomingInstallations: mapWorkOrders(installationsRes.data || []),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    draftPOs: (draftPOsRes.data || []).map((po: any) => ({
      id: po.id,
      po_number: po.po_number,
      supplier_name: po.supplier?.company_name ?? null,
      order_date: po.order_date,
      status: po.status,
    })),
  }
}
