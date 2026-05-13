import { supabase } from './supabase'

export type ComponentType =
  | 'carcase_board' | 'door_board' | 'hinge' | 'hinge_plate' | 'runner'
  | 'handle' | 'toekick' | 'shelf' | 'back_panel' | 'labour_make' | 'labour_install' | 'other'

export type KitchenCabinetComponent = {
  id: string
  kitchen_quote_cabinet_id: string
  supplier_item_id: string | null
  supplier_id: string | null
  component_type: ComponentType
  item: string | null
  description: string | null
  item_code: string | null
  qty: number
  unit: 'ea' | 'sqm' | 'lm' | 'hrs'
  unit_cost: number
  markup_percent: number
  total_cost: number  // generated
  sell_price: number  // generated
  created_at: string
  updated_at: string
}

export async function getComponentsByQuoteCabinetId(
  kitchenQuoteCabinetId: string
): Promise<KitchenCabinetComponent[]> {
  const { data, error } = await supabase
    .from('kitchen_cabinet_components')
    .select('*')
    .eq('kitchen_quote_cabinet_id', kitchenQuoteCabinetId)
    .order('component_type')
  if (error) throw error
  return data ?? []
}

export async function getComponentsByQuoteItemId(
  quoteItemId: string
): Promise<KitchenCabinetComponent[]> {
  const { data, error } = await supabase
    .from('kitchen_cabinet_components')
    .select('*, kitchen_quote_cabinets!inner(quote_item_id)')
    .eq('kitchen_quote_cabinets.quote_item_id', quoteItemId)
  if (error) throw error
  return data ?? []
}

export async function deleteComponentsByQuoteCabinetId(
  kitchenQuoteCabinetId: string
): Promise<void> {
  const { error } = await supabase
    .from('kitchen_cabinet_components')
    .delete()
    .eq('kitchen_quote_cabinet_id', kitchenQuoteCabinetId)
  if (error) throw error
}

export async function insertComponents(
  components: Omit<KitchenCabinetComponent, 'id' | 'total_cost' | 'sell_price' | 'created_at' | 'updated_at'>[]
): Promise<KitchenCabinetComponent[]> {
  if (components.length === 0) return []
  const { data, error } = await supabase
    .from('kitchen_cabinet_components')
    .insert(components)
    .select()
  if (error) throw error
  return data ?? []
}
