import { supabase } from './supabase'

export type CabinetLibraryEntry = {
  id: string
  code_prefix: string
  name: string
  cabinet_type: 'base' | 'tall' | 'wall'
  door_count: number
  drawer_count: number
  inner_drawer_count: number
  has_middle_shelf: boolean
  has_back_panel: boolean
  default_height_mm: number | null
  default_depth_mm: number | null
  default_width_mm: number | null
  board_thickness_mm: number
  is_directional_grain: boolean
  hinge_supplier_item_id: string | null
  hinge_plate_supplier_item_id: string | null
  runner_supplier_item_id: string | null
  handle_supplier_item_id: string | null
  carcase_board_supplier_item_id: string | null
  door_board_supplier_item_id: string | null
  toekick_supplier_item_id: string | null
  has_toekick: boolean
  toekick_height_mm: number
  labour_make_hrs: number
  labour_install_hrs: number
  hinge_override_count: number | null
  is_active: boolean
  notes: string | null
  custom_rules: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export async function getAllCabinetLibraryEntries(): Promise<CabinetLibraryEntry[]> {
  const { data, error } = await supabase
    .from('kitchen_cabinet_library')
    .select('*')
    .order('cabinet_type')
    .order('code_prefix')
  if (error) throw error
  return data ?? []
}

export async function getActiveCabinetLibraryEntries(): Promise<CabinetLibraryEntry[]> {
  const { data, error } = await supabase
    .from('kitchen_cabinet_library')
    .select('*')
    .eq('is_active', true)
    .order('cabinet_type')
    .order('code_prefix')
  if (error) throw error
  return data ?? []
}

export async function getCabinetLibraryEntryByPrefix(prefix: string): Promise<CabinetLibraryEntry | null> {
  const { data, error } = await supabase
    .from('kitchen_cabinet_library')
    .select('*')
    .eq('code_prefix', prefix)
    .eq('is_active', true)
    .single()
  if (error) return null
  return data
}

export async function createCabinetLibraryEntry(
  entry: Omit<CabinetLibraryEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<CabinetLibraryEntry> {
  const { data, error } = await supabase
    .from('kitchen_cabinet_library')
    .insert(entry)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCabinetLibraryEntry(
  id: string,
  updates: Partial<CabinetLibraryEntry>
): Promise<CabinetLibraryEntry> {
  const { data, error } = await supabase
    .from('kitchen_cabinet_library')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCabinetLibraryEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('kitchen_cabinet_library')
    .delete()
    .eq('id', id)
  if (error) throw error
}
