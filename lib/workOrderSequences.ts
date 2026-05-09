import { supabase } from './supabase'

export type WorkOrderSequence = {
  id: string
  name: string
  sort: number
  created_at: string
}

export type WorkOrderSequenceStep = {
  id: string
  sequence_id: string
  task_name: string
  sort: number
  created_at: string
}

export async function getWorkOrderSequences(): Promise<WorkOrderSequence[]> {
  const { data, error } = await supabase
    .from('work_order_sequences')
    .select('*')
    .order('sort')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createWorkOrderSequence(name: string): Promise<WorkOrderSequence> {
  const { data: existing } = await supabase.from('work_order_sequences').select('sort').order('sort', { ascending: false }).limit(1)
  const sort = existing && existing.length > 0 ? (existing[0].sort ?? 0) + 1 : 0
  const { data, error } = await supabase
    .from('work_order_sequences')
    .insert({ name, sort })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateWorkOrderSequence(id: string, patch: Partial<Pick<WorkOrderSequence, 'name' | 'sort'>>): Promise<void> {
  const { error } = await supabase.from('work_order_sequences').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteWorkOrderSequence(id: string): Promise<void> {
  const { error } = await supabase.from('work_order_sequences').delete().eq('id', id)
  if (error) throw error
}

export async function getSequenceSteps(sequenceId: string): Promise<WorkOrderSequenceStep[]> {
  const { data, error } = await supabase
    .from('work_order_sequence_steps')
    .select('*')
    .eq('sequence_id', sequenceId)
    .order('sort')
  if (error) throw error
  return data ?? []
}

export async function createSequenceStep(sequenceId: string, taskName: string, sort: number): Promise<WorkOrderSequenceStep> {
  const { data, error } = await supabase
    .from('work_order_sequence_steps')
    .insert({ sequence_id: sequenceId, task_name: taskName, sort })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSequenceStep(id: string, patch: Partial<Pick<WorkOrderSequenceStep, 'task_name' | 'sort'>>): Promise<void> {
  const { error } = await supabase.from('work_order_sequence_steps').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteSequenceStep(id: string): Promise<void> {
  const { error } = await supabase.from('work_order_sequence_steps').delete().eq('id', id)
  if (error) throw error
}
