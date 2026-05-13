import { supabase } from './supabase'

export type KitchenSetting = {
  id: string
  key: string
  value: string
  category: string
  created_at: string
  updated_at: string
}

export type KitchenSettingsMap = Record<string, number>

export async function getKitchenSettings(): Promise<KitchenSetting[]> {
  const { data, error } = await supabase
    .from('kitchen_settings')
    .select('*')
    .order('category')
    .order('key')
  if (error) throw error
  return data ?? []
}

export async function getKitchenSettingsMap(): Promise<KitchenSettingsMap> {
  const rows = await getKitchenSettings()
  return Object.fromEntries(rows.map((r) => [r.key, parseFloat(r.value)]))
}

export async function updateKitchenSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('kitchen_settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key)
  if (error) throw error
}
