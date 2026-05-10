import { supabase } from './supabase'
import { BreakSchedule, calcBreakDeductionHours } from './breakSchedules'

export type WOSession = {
  id: string
  staff_id: string
  work_order_id: string
  started_at: string
  ended_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type WOSessionWithRelations = WOSession & {
  work_order_number: string | null
  work_order_title: string | null
  job_id: string | null
  job_number: string | null
  staff_name: string | null
}

export type ActiveWOSession = WOSessionWithRelations & {
  elapsed_minutes: number
}

// ── Clock on/off ──────────────────────────────────────────────────────────────

export async function clockOntoWO(staffId: string, workOrderId: string): Promise<WOSession> {
  // Close any open session for this staff member first
  await supabase
    .from('staff_wo_sessions')
    .update({ ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('staff_id', staffId)
    .is('ended_at', null)

  const { data, error } = await supabase
    .from('staff_wo_sessions')
    .insert({ staff_id: staffId, work_order_id: workOrderId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function clockOffWO(staffId: string): Promise<void> {
  const { error } = await supabase
    .from('staff_wo_sessions')
    .update({ ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('staff_id', staffId)
    .is('ended_at', null)
  if (error) throw error
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getActiveWOSession(staffId: string): Promise<WOSessionWithRelations | null> {
  const { data, error } = await supabase
    .from('staff_wo_sessions')
    .select('*, work_order:work_orders(work_order_number, title, job_id, job:jobs(job_number)), staff:staff(display_name)')
    .eq('staff_id', staffId)
    .is('ended_at', null)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any
  return {
    ...r,
    work_order_number: r.work_order?.work_order_number ?? null,
    work_order_title:  r.work_order?.title ?? null,
    job_id:            r.work_order?.job_id ?? null,
    job_number:        r.work_order?.job?.job_number ?? null,
    staff_name:        r.staff?.display_name ?? null,
  }
}

export async function getAllActiveWOSessions(): Promise<WOSessionWithRelations[]> {
  const { data, error } = await supabase
    .from('staff_wo_sessions')
    .select('*, work_order:work_orders(work_order_number, title, job_id, job:jobs(job_number)), staff:staff(display_name)')
    .is('ended_at', null)
    .order('started_at', { ascending: true })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    ...r,
    work_order_number: r.work_order?.work_order_number ?? null,
    work_order_title:  r.work_order?.title ?? null,
    job_id:            r.work_order?.job_id ?? null,
    job_number:        r.work_order?.job?.job_number ?? null,
    staff_name:        r.staff?.display_name ?? null,
  }))
}

export async function getWOSessionsByWorkOrder(workOrderId: string): Promise<WOSessionWithRelations[]> {
  const { data, error } = await supabase
    .from('staff_wo_sessions')
    .select('*, work_order:work_orders(work_order_number, title, job_id, job:jobs(job_number)), staff:staff(display_name)')
    .eq('work_order_id', workOrderId)
    .order('started_at', { ascending: false })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    ...r,
    work_order_number: r.work_order?.work_order_number ?? null,
    work_order_title:  r.work_order?.title ?? null,
    job_id:            r.work_order?.job_id ?? null,
    job_number:        r.work_order?.job?.job_number ?? null,
    staff_name:        r.staff?.display_name ?? null,
  }))
}

export async function getMyWOSessions(staffId: string, fromDate: string, toDate: string): Promise<WOSessionWithRelations[]> {
  const { data, error } = await supabase
    .from('staff_wo_sessions')
    .select('*, work_order:work_orders(work_order_number, title, job_id, job:jobs(job_number)), staff:staff(display_name)')
    .eq('staff_id', staffId)
    .gte('started_at', `${fromDate}T00:00:00`)
    .lte('started_at', `${toDate}T23:59:59`)
    .order('started_at', { ascending: false })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    ...r,
    work_order_number: r.work_order?.work_order_number ?? null,
    work_order_title:  r.work_order?.title ?? null,
    job_id:            r.work_order?.job_id ?? null,
    job_number:        r.work_order?.job?.job_number ?? null,
    staff_name:        r.staff?.display_name ?? null,
  }))
}

// ── Duration helpers ──────────────────────────────────────────────────────────

export function sessionDurationHours(
  session: Pick<WOSession, 'started_at' | 'ended_at'>,
  breakSchedules: BreakSchedule[],
  now = new Date(),
): number {
  const start  = new Date(session.started_at)
  const end    = session.ended_at ? new Date(session.ended_at) : now
  const gross  = (end.getTime() - start.getTime()) / 3_600_000
  const deduct = calcBreakDeductionHours(start, end, breakSchedules)
  return Math.max(0, gross - deduct)
}

export function totalLoggedHours(
  sessions: Pick<WOSession, 'started_at' | 'ended_at'>[],
  breakSchedules: BreakSchedule[],
): number {
  return sessions.reduce((sum, s) => sum + sessionDurationHours(s, breakSchedules), 0)
}

export function fmtHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ── Available WOs for field staff ─────────────────────────────────────────────

export type AvailableWO = {
  id: string
  work_order_number: string | null
  title: string | null
  job_number: string | null
  job_title: string | null
  client_name: string | null
  status: string
}

export async function getAvailableWorkOrders(): Promise<AvailableWO[]> {
  const { data, error } = await supabase
    .from('work_orders')
    .select('id, work_order_number, title, status, job:jobs(job_number, title, client:clients(name))')
    .in('status', ['Draft', 'Ready', 'In Progress'])
    .order('created_at', { ascending: false })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id:                r.id,
    work_order_number: r.work_order_number ?? null,
    title:             r.title ?? null,
    job_number:        r.job?.job_number ?? null,
    job_title:         r.job?.title ?? null,
    client_name:       r.job?.client?.name ?? null,
    status:            r.status,
  }))
}
