import { supabase } from './supabase'

export type LookupValue = {
  id: string
  list_name: string
  value: string
  sort: number
  is_active: boolean
}

export async function getLookupValues(listName: string): Promise<LookupValue[]> {
  const { data, error } = await supabase
    .from('lookup_values')
    .select('*')
    .eq('list_name', listName)
    .eq('is_active', true)
    .order('sort', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createLookupValue(
  listName: string,
  value: string
): Promise<LookupValue> {
  // Get next sort number
  const existing = await getLookupValues(listName)
  const nextSort = existing.length > 0
    ? Math.max(...existing.map((v) => v.sort)) + 10
    : 10

  const { data, error } = await supabase
    .from('lookup_values')
    .insert({ list_name: listName, value, sort: nextSort })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLookupValue(id: string): Promise<void> {
  // Soft delete — we don't actually remove, just mark inactive,
  // so existing client records that reference this value still resolve
  const { error } = await supabase
    .from('lookup_values')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}