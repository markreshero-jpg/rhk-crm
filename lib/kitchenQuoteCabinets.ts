import { supabase } from './supabase'

export type KitchenQuoteCabinet = {
  id: string
  quote_item_id: string
  cabinet_library_id: string | null
  cabinet_code: string
  label: string | null
  sort: number
  width_mm: number
  height_mm: number
  depth_mm: number
  qty: number
  door_count_override: number | null
  drawer_count_override: number | null
  inner_drawer_count_override: number | null
  board_thickness_override: number | null
  is_directional_grain_override: boolean | null
  carcase_sqm: number | null
  door_sqm: number | null
  hinge_count: number | null
  runner_pair_count: number | null
  handle_count: number | null
  labour_make_hrs: number | null
  labour_install_hrs: number | null
  created_at: string
  updated_at: string
}

export async function getKitchenQuoteCabinets(quoteItemId: string): Promise<KitchenQuoteCabinet[]> {
  const { data, error } = await supabase
    .from('kitchen_quote_cabinets')
    .select('*')
    .eq('quote_item_id', quoteItemId)
    .order('sort')
  if (error) throw error
  return data ?? []
}

export async function createKitchenQuoteCabinet(
  cabinet: Omit<KitchenQuoteCabinet, 'id' | 'created_at' | 'updated_at'>
): Promise<KitchenQuoteCabinet> {
  const { data, error } = await supabase
    .from('kitchen_quote_cabinets')
    .insert(cabinet)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateKitchenQuoteCabinet(
  id: string,
  updates: Partial<KitchenQuoteCabinet>
): Promise<KitchenQuoteCabinet> {
  const { data, error } = await supabase
    .from('kitchen_quote_cabinets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteKitchenQuoteCabinet(id: string): Promise<void> {
  const { error } = await supabase
    .from('kitchen_quote_cabinets')
    .delete()
    .eq('id', id)
  if (error) throw error
}
