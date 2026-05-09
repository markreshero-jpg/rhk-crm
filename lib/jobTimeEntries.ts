import { supabase } from './supabase'

export type JobTimeEntry = {
  id: string
  created_at: string
  staff_id: string
  job_schedule_event_id: string
  started_at: string
  stopped_at: string | null
  notes: string | null
}

export async function getActiveTimeEntry(staffId: string): Promise<JobTimeEntry | null> {
  const { data, error } = await supabase
    .from('job_time_entries')
    .select('*')
    .eq('staff_id', staffId)
    .is('stopped_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function startTimeEntry(staffId: string, eventId: string): Promise<JobTimeEntry> {
  const { data, error } = await supabase
    .from('job_time_entries')
    .insert({
      staff_id: staffId,
      job_schedule_event_id: eventId,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function stopTimeEntry(entryId: string): Promise<void> {
  const stoppedAt = new Date().toISOString()

  const { data: entry, error: stopErr } = await supabase
    .from('job_time_entries')
    .update({ stopped_at: stoppedAt })
    .eq('id', entryId)
    .select()
    .single()
  if (stopErr) throw stopErr

  // Recalculate total actual_hours from all completed entries for this event
  const { data: entries, error: sumErr } = await supabase
    .from('job_time_entries')
    .select('started_at, stopped_at')
    .eq('job_schedule_event_id', entry.job_schedule_event_id)
    .not('stopped_at', 'is', null)
  if (sumErr) throw sumErr

  const totalHours = (entries ?? []).reduce((sum, e) => {
    const ms = new Date(e.stopped_at!).getTime() - new Date(e.started_at).getTime()
    return sum + ms / 3_600_000
  }, 0)

  const { error: updateErr } = await supabase
    .from('job_schedule_events')
    .update({ actual_hours: Math.round(totalHours * 100) / 100 })
    .eq('id', entry.job_schedule_event_id)
  if (updateErr) throw updateErr
}
