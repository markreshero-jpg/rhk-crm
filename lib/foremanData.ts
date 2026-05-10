import { supabase } from './supabase'
import { FieldScheduleEvent, getMyScheduleEvents } from './jobSchedule'

export type { FieldScheduleEvent }

export type ForemanWO = {
  id: string
  work_order_number: string | null
  title: string | null
  status: string
  job_number: string | null
  job_title: string | null
  client_name: string | null
  staff_on: string[]
}

export async function getProductionBoard(): Promise<ForemanWO[]> {
  const [{ data: wos, error: woErr }, { data: sessions, error: sErr }] = await Promise.all([
    supabase
      .from('work_orders')
      .select('id, work_order_number, title, status, job:jobs(job_number, title, client:clients(name))')
      .in('status', ['Draft', 'Ready', 'In Progress'])
      .order('created_at', { ascending: false }),
    supabase
      .from('staff_wo_sessions')
      .select('work_order_id, staff:staff(display_name)')
      .is('ended_at', null),
  ])
  if (woErr) throw woErr
  if (sErr) throw sErr

  const sessionsByWO = new Map<string, string[]>()
  for (const s of (sessions || [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const name = (s.staff as any)?.display_name
    if (name) {
      const arr = sessionsByWO.get(s.work_order_id) || []
      arr.push(name)
      sessionsByWO.set(s.work_order_id, arr)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (wos || []).map((wo: any) => ({
    id: wo.id,
    work_order_number: wo.work_order_number ?? null,
    title: wo.title ?? null,
    status: wo.status,
    job_number: wo.job?.job_number ?? null,
    job_title: wo.job?.title ?? null,
    client_name: wo.job?.client?.name ?? null,
    staff_on: sessionsByWO.get(wo.id) || [],
  }))
}

export type ForemanInstall = {
  id: string
  title: string
  scheduled_date: string | null
  start_time: string | null
  status: string
  job_id: string | null
  job_number: string | null
  client_name: string | null
  staff_name: string | null
  work_order_id: string | null
  work_order_number: string | null
}

export async function getInstallsThisWeek(): Promise<ForemanInstall[]> {
  const today = new Date().toISOString().slice(0, 10)
  const end = new Date()
  end.setDate(end.getDate() + 14)
  const endIso = end.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('job_schedule_events')
    .select('id, title, scheduled_date, start_time, status, job_id, work_order_id, staff:staff(display_name), job:jobs(job_number, client:clients(name)), work_order:work_orders(work_order_number)')
    .ilike('trade_type', 'install')
    .gte('scheduled_date', today)
    .lte('scheduled_date', endIso)
    .not('status', 'in', '("Cancelled","Completed")')
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: true })
  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((e: any) => ({
    id: e.id,
    title: e.title,
    scheduled_date: e.scheduled_date,
    start_time: e.start_time,
    status: e.status,
    job_id: e.job_id ?? null,
    job_number: e.job?.job_number ?? null,
    client_name: e.job?.client?.name ?? null,
    staff_name: e.staff?.display_name ?? null,
    work_order_id: e.work_order_id ?? null,
    work_order_number: e.work_order?.work_order_number ?? null,
  }))
}

export type StaffWOStatus = {
  staff_id: string
  staff_name: string
  work_order_id: string | null
  work_order_number: string | null
  work_order_title: string | null
  job_number: string | null
  client_name: string | null
  started_at: string | null
}

export async function getFieldStaffStatus(): Promise<StaffWOStatus[]> {
  const [{ data: staff, error: sErr }, { data: sessions, error: sessErr }] = await Promise.all([
    supabase
      .from('staff')
      .select('id, display_name')
      .in('dashboard_role', ['field', 'factory'])
      .eq('is_active', true)
      .order('display_name', { ascending: true }),
    supabase
      .from('staff_wo_sessions')
      .select('staff_id, work_order_id, started_at, work_order:work_orders(work_order_number, title, job:jobs(job_number, client:clients(name)))')
      .is('ended_at', null),
  ])
  if (sErr) throw sErr
  if (sessErr) throw sessErr

  const sessionByStaff = new Map<string, typeof sessions[0]>()
  for (const s of (sessions || [])) sessionByStaff.set(s.staff_id, s)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (staff || []).map((s: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sess = sessionByStaff.get(s.id) as any
    return {
      staff_id: s.id,
      staff_name: s.display_name,
      work_order_id: sess?.work_order_id ?? null,
      work_order_number: sess?.work_order?.work_order_number ?? null,
      work_order_title: sess?.work_order?.title ?? null,
      job_number: sess?.work_order?.job?.job_number ?? null,
      client_name: sess?.work_order?.job?.client?.name ?? null,
      started_at: sess?.started_at ?? null,
    }
  })
}

export async function getForemanDashboardData(staffId: string) {
  const [wos, installs, myTasks, staffStatus] = await Promise.all([
    getProductionBoard(),
    getInstallsThisWeek(),
    getMyScheduleEvents(staffId),
    getFieldStaffStatus(),
  ])
  return { wos, installs, myTasks, staffStatus }
}
