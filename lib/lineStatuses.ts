import { supabase } from './supabase'

export type LineStatusOption = {
  id: string
  stage: string
  status: string
  sort: number
  is_active: boolean
}

export async function getAllLineStatusOptions(): Promise<LineStatusOption[]> {
  const { data, error } = await supabase
    .from('work_order_line_status_options')
    .select('id, stage, status, sort, is_active')
    .order('sort', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createLineStatusOption(opt: Partial<LineStatusOption>): Promise<LineStatusOption> {
  const { data, error } = await supabase
    .from('work_order_line_status_options')
    .insert(opt)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLineStatusOption(id: string, opt: Partial<LineStatusOption>): Promise<LineStatusOption> {
  const { data, error } = await supabase
    .from('work_order_line_status_options')
    .update(opt)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLineStatusOption(id: string): Promise<void> {
  const { error } = await supabase
    .from('work_order_line_status_options')
    .delete()
    .eq('id', id)
  if (error) throw error
}
