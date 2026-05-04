import { supabase } from './supabase'

export type SupplierItem = {
  id: string
  supplier_id: string
  sort: number
  item: string | null
  description: string | null
  item_code: string | null
  cost: number
  created_at: string
}

export async function getSupplierItems(supplierId: string): Promise<SupplierItem[]> {
  const { data, error } = await supabase
    .from('supplier_items')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('sort', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createSupplierItem(
  item: Omit<SupplierItem, 'id' | 'created_at'>
): Promise<SupplierItem> {
  const { data, error } = await supabase
    .from('supplier_items')
    .insert(item)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSupplierItem(
  id: string,
  updates: Partial<SupplierItem>
): Promise<void> {
  const { error } = await supabase
    .from('supplier_items')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteSupplierItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('supplier_items')
    .delete()
    .eq('id', id)
  if (error) throw error
}