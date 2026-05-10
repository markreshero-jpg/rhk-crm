import { supabase } from './supabase'

export type BreakSchedule = {
  id: string
  day_of_week: number   // 1=Mon … 5=Fri
  label: string
  break_start: string   // 'HH:MM'
  break_end: string     // 'HH:MM'
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function getBreakSchedules(): Promise<BreakSchedule[]> {
  const { data, error } = await supabase
    .from('break_schedules')
    .select('*')
    .order('day_of_week', { ascending: true })
  if (error) throw error
  return data || []
}

export async function updateBreakSchedule(id: string, patch: Partial<BreakSchedule>): Promise<BreakSchedule> {
  const { data, error } = await supabase
    .from('break_schedules')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Break deduction helper ────────────────────────────────────────────────────
// Returns how many hours of break overlap a session window (local time).
// Uses JS local time so the day-of-week and HH:MM comparison is correct
// for the device's timezone (where the work is happening).

export function calcBreakDeductionHours(
  startedAt: Date,
  endedAt: Date,
  schedules: BreakSchedule[],
): number {
  let deductionMs = 0

  // JS getDay(): 0=Sun, 1=Mon…6=Sat → convert to our 1=Mon…7=Sun
  const jsDow = startedAt.getDay()
  const dbDow = jsDow === 0 ? 7 : jsDow

  for (const s of schedules) {
    if (!s.is_active || s.day_of_week !== dbDow) continue

    // Build break window as Date objects on the session's local date
    const dateStr = localDateStr(startedAt)
    const breakStart = new Date(`${dateStr}T${s.break_start}:00`)
    const breakEnd   = new Date(`${dateStr}T${s.break_end}:00`)

    const overlapStart = Math.max(startedAt.getTime(), breakStart.getTime())
    const overlapEnd   = Math.min(endedAt.getTime(),   breakEnd.getTime())

    if (overlapEnd > overlapStart) {
      deductionMs += overlapEnd - overlapStart
    }
  }

  return deductionMs / 3_600_000
}

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
