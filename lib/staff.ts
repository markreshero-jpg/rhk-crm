import { supabase } from './supabase'

export const EMPLOYMENT_TYPES = ['Employee', 'Contractor', 'Subcontractor', 'Casual', 'Other'] as const
export type EmploymentType = typeof EMPLOYMENT_TYPES[number]

export type DashboardRole = 'admin' | 'office' | 'field' | 'foreman' | 'factory'

export type Staff = {
  id: string
  user_id: string | null
  first_name: string
  last_name: string | null
  display_name: string
  role: string | null
  employment_type: EmploymentType | null
  dashboard_role: DashboardRole
  phone: string | null
  email: string | null
  colour: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function getStaff(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('display_name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getActiveStaff(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('is_active', true)
    .order('display_name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getStaffById(id: string): Promise<Staff | null> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createStaff(staff: Omit<Staff, 'id' | 'created_at' | 'updated_at'>): Promise<Staff> {
  const { data, error } = await supabase
    .from('staff')
    .insert(staff)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStaff(id: string, updates: Partial<Staff>): Promise<Staff> {
  const { data, error } = await supabase
    .from('staff')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteStaff(id: string): Promise<void> {
  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) throw error
}

export async function getStaffByUserId(userId: string): Promise<Staff | null> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) return null
  return data
}
