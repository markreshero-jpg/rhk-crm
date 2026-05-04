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

export type DashboardData = {
  jobsByStatus: Record<string, number>
  totalJobs: number
  totalClients: number
  inProductionValue: number | null
  quotesOutValue: number | null
  recentJobs: JobSummary[]
  inProductionJobs: JobSummary[]
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
  const [jobsRes, clientsRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, job_number, title, status, site_suburb, created_at, client:clients(name), issues(total_ex_gst, status, issue_number)')
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true }),
  ])

  if (jobsRes.error) throw jobsRes.error
  if (clientsRes.error) throw clientsRes.error

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

  return {
    jobsByStatus,
    totalJobs: jobs.length,
    totalClients,
    inProductionValue: inProductionJobs.length ? sumValues(inProductionJobs) : null,
    quotesOutValue:    quotesOutJobs.length    ? sumValues(quotesOutJobs)    : null,
    recentJobs:        jobs.slice(0, 8).map(toSummary),
    inProductionJobs:  inProductionJobs.map(toSummary),
  }
}
