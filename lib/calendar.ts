import { supabase } from './supabase'
import type { ScheduleEventStatus } from './jobSchedule'

export type CalendarEvent = {
  id: string
  title: string
  scheduled_date: string | null
  start_time: string | null
  end_time: string | null
  estimated_hours: number | null
  trade_type: string | null
  status: ScheduleEventStatus
  not_needed: boolean
  job_id: string
  job_number: string | null
  job_title: string | null
  client_name: string | null
  work_order_id: string | null
  work_order_number: string | null
  staff_id: string | null
  staff_name: string | null
  staff_colour: string | null
}

export type CalendarFilters = {
  staffIds: string[]
  tradeTypes: string[]
}

export const TRADE_TYPES = [
  'cut & edge',
  'assemble',
  'wrap',
  'install',
  'measure',
  'fabrication',
  'delivery',
  'survey',
]

export const TRADE_PALETTE: Record<string, string> = {
  'cut & edge':  '#22c55e',
  'assemble':    '#f59e0b',
  'load':        '#0ea5e9',
  'delivery':    '#14b8a6',
  'install':     '#3b82f6',
  'fix up':      '#f43f5e',
  'wrap':        '#6366f1',
  'measure':     '#8b5cf6',
  'fabrication': '#f97316',
  'survey':      '#ec4899',
}

export function tradeTypeColour(type: string | null): string {
  return TRADE_PALETTE[(type ?? '').toLowerCase()] ?? '#6b7280'
}

export function eventColour(e: CalendarEvent): string {
  if (e.staff_colour) return e.staff_colour
  return tradeTypeColour(e.trade_type)
}

export function fmtTradeType(type: string): string {
  return type.split(' ').map((w) => (w === '&' ? '&' : w.charAt(0).toUpperCase() + w.slice(1))).join(' ')
}

export function applyFilters(events: CalendarEvent[], f: CalendarFilters): CalendarEvent[] {
  return events.filter((e) => {
    if (f.staffIds.length && !f.staffIds.includes(e.staff_id ?? '__none__')) return false
    if (f.tradeTypes.length && !f.tradeTypes.includes((e.trade_type ?? '').toLowerCase())) return false
    return true
  })
}

// ── Date helpers ─────────────────────────────────────────────────────────────

export function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return d
}

// Returns the Monday of the week containing the 1st of the given month
export function startOfMonthGrid(year: number, month: number): Date {
  const first = new Date(year, month, 1)
  const dow = first.getDay()
  const offset = dow === 0 ? 6 : dow - 1
  return new Date(year, month, 1 - offset)
}

export function fmtTime(t: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${ap}` : `${h12}:${String(m).padStart(2, '0')}${ap}`
}

// ── Data fetching ─────────────────────────────────────────────────────────────

export async function getCalendarEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('job_schedule_events')
    .select('*, job:jobs(job_number, title, client:clients(name)), work_order:work_orders(work_order_number), staff:staff(display_name, colour)')
    .gte('scheduled_date', from)
    .lte('scheduled_date', to)
    .eq('not_needed', false)
    .order('start_time', { ascending: true, nullsFirst: true })

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((e: any) => ({
    id: e.id,
    title: e.title,
    scheduled_date: e.scheduled_date,
    start_time: e.start_time,
    end_time: e.end_time,
    estimated_hours: e.estimated_hours,
    trade_type: e.trade_type,
    status: e.status,
    not_needed: e.not_needed,
    job_id: e.job_id,
    job_number: e.job?.job_number ?? null,
    job_title: e.job?.title ?? null,
    client_name: e.job?.client?.name ?? null,
    work_order_id: e.work_order_id,
    work_order_number: e.work_order?.work_order_number ?? null,
    staff_id: e.staff_id,
    staff_name: e.staff?.display_name ?? null,
    staff_colour: e.staff?.colour ?? null,
  }))
}
