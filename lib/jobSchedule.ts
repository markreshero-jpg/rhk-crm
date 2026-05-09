import { supabase } from './supabase'

type LabourRow = { quote_item_id: string; type: string | null; qty: number | null }
type QuoteItemRow = { id: string; name: string; qty: number; labour: LabourRow[] }

export type ScheduleEventStatus = 'Unscheduled' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled'

export const SCHEDULE_STATUSES: ScheduleEventStatus[] = [
  'Unscheduled', 'Scheduled', 'In Progress', 'Completed', 'Cancelled',
]

export type JobScheduleEvent = {
  id: string
  job_id: string
  work_order_id: string | null
  title: string
  trade_type: string | null
  scheduled_date: string | null
  start_time: string | null
  end_time: string | null
  staff_id: string | null
  status: ScheduleEventStatus
  estimated_hours: number | null
  actual_hours: number | null
  notes: string | null
  not_needed: boolean
  sort: number
  created_at: string
  updated_at: string
}

export type JobScheduleEventWithRelations = JobScheduleEvent & {
  staff: { display_name: string; colour: string | null } | null
  work_order: { work_order_number: string | null; title: string | null } | null
}

export type FieldScheduleEvent = JobScheduleEvent & {
  job: { job_number: string | null; title: string | null; client: { name: string } | null } | null
  work_order: { work_order_number: string | null; title: string | null } | null
}

export async function getMyScheduleEvents(staffId: string): Promise<FieldScheduleEvent[]> {
  const today = new Date().toISOString().slice(0, 10)
  const end = new Date()
  end.setDate(end.getDate() + 7)
  const endIso = end.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('job_schedule_events')
    .select('*, job:jobs(job_number, title, client:clients(name)), work_order:work_orders(work_order_number, title)')
    .eq('staff_id', staffId)
    .eq('not_needed', false)
    .gte('scheduled_date', today)
    .lte('scheduled_date', endIso)
    .order('scheduled_date', { ascending: true })
    .order('sort', { ascending: true })
  if (error) throw error
  return (data ?? []) as FieldScheduleEvent[]
}

export async function getScheduleEventsByWorkOrderId(workOrderId: string): Promise<JobScheduleEventWithRelations[]> {
  const { data, error } = await supabase
    .from('job_schedule_events')
    .select('*, staff:staff(display_name, colour), work_order:work_orders(work_order_number, title)')
    .eq('work_order_id', workOrderId)
    .order('sort', { ascending: true })
  if (error) throw error
  return (data || []) as JobScheduleEventWithRelations[]
}

export async function getScheduleEventsByJobId(jobId: string): Promise<JobScheduleEventWithRelations[]> {
  const { data, error } = await supabase
    .from('job_schedule_events')
    .select('*, staff:staff(display_name, colour), work_order:work_orders(work_order_number, title)')
    .eq('job_id', jobId)
    .order('scheduled_date', { ascending: true, nullsFirst: true })
    .order('start_time', { ascending: true, nullsFirst: true })
    .order('sort', { ascending: true })
  if (error) throw error
  return (data || []) as JobScheduleEventWithRelations[]
}

export async function createScheduleEvent(event: Partial<JobScheduleEvent>): Promise<JobScheduleEvent> {
  const { data, error } = await supabase
    .from('job_schedule_events')
    .insert(event)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateScheduleEvent(id: string, patch: Partial<JobScheduleEvent>): Promise<void> {
  const { error } = await supabase
    .from('job_schedule_events')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteScheduleEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('job_schedule_events')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// Fetches all quote_item_labour for an issue and creates draft schedule events
export async function importLabourFromIssue(jobId: string, workOrderId: string, issueId: string): Promise<void> {
  const { data, error } = await supabase
    .from('quote_items')
    .select('id, name, qty, labour:quote_item_labour(quote_item_id, type, qty)')
    .eq('issue_id', issueId)
    .order('sort', { ascending: true })
  if (error) throw error

  const rows: Partial<JobScheduleEvent>[] = []
  let sort = 0
  for (const item of (data || []) as QuoteItemRow[]) {
    for (const l of item.labour) {
      if (!l.qty) continue
      rows.push({
        job_id: jobId,
        work_order_id: workOrderId,
        title: item.name,
        trade_type: l.type || null,
        estimated_hours: l.qty,
        status: 'Unscheduled',
        sort: sort++,
      })
    }
  }

  if (rows.length === 0) return
  const { error: insErr } = await supabase.from('job_schedule_events').insert(rows)
  if (insErr) throw insErr
}

export async function importLabourToSchedule(
  jobId: string,
  workOrderId: string,
  labourLines: { title: string; trade_type: string | null; estimated_hours: number | null }[]
): Promise<void> {
  if (labourLines.length === 0) return
  const rows = labourLines.map((l, i) => ({
    job_id: jobId,
    work_order_id: workOrderId,
    title: l.title,
    trade_type: l.trade_type,
    estimated_hours: l.estimated_hours,
    status: 'Unscheduled' as ScheduleEventStatus,
    sort: i,
  }))
  const { error } = await supabase.from('job_schedule_events').insert(rows)
  if (error) throw error
}
