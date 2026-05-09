import { supabase } from './supabase'

export type ClockType = 'in' | 'out'

export type ClockEvent = {
  id: string
  created_at: string
  staff_id: string
  type: ClockType
  latitude: number | null
  longitude: number | null
  accuracy_m: number | null
  notes: string | null
}

export type ClockEventWithStaff = ClockEvent & {
  staff: { display_name: string; colour: string | null } | null
}

export type GeoCoords = { lat: number; lng: number; accuracy: number }

export async function clockIn(staffId: string, coords?: GeoCoords): Promise<void> {
  const { error } = await supabase.from('staff_clock_events').insert({
    staff_id: staffId,
    type: 'in',
    latitude:   coords?.lat    ?? null,
    longitude:  coords?.lng    ?? null,
    accuracy_m: coords?.accuracy ?? null,
  })
  if (error) throw error
}

export async function clockOut(staffId: string, coords?: GeoCoords): Promise<void> {
  const { error } = await supabase.from('staff_clock_events').insert({
    staff_id: staffId,
    type: 'out',
    latitude:   coords?.lat    ?? null,
    longitude:  coords?.lng    ?? null,
    accuracy_m: coords?.accuracy ?? null,
  })
  if (error) throw error
}

export async function getLatestClockEvent(staffId: string): Promise<ClockEvent | null> {
  const { data, error } = await supabase
    .from('staff_clock_events')
    .select('*')
    .eq('staff_id', staffId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getCurrentlyClockedIn(): Promise<ClockEventWithStaff[]> {
  const { data, error } = await supabase
    .from('staff_clock_events')
    .select('*, staff:staff(display_name, colour)')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw error

  const seen = new Set<string>()
  const result: ClockEventWithStaff[] = []
  for (const evt of (data || []) as ClockEventWithStaff[]) {
    if (!seen.has(evt.staff_id)) {
      seen.add(evt.staff_id)
      if (evt.type === 'in') result.push(evt)
    }
  }
  return result
}

export async function getClockHistory(opts: {
  from?: string
  to?: string
  staffId?: string
  limit?: number
}): Promise<ClockEventWithStaff[]> {
  let q = supabase
    .from('staff_clock_events')
    .select('*, staff:staff(display_name, colour)')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 500)

  if (opts.from)    q = q.gte('created_at', opts.from)
  if (opts.to)      q = q.lte('created_at', opts.to + 'T23:59:59')
  if (opts.staffId) q = q.eq('staff_id', opts.staffId)

  const { data, error } = await q
  if (error) throw error
  return (data || []) as ClockEventWithStaff[]
}
