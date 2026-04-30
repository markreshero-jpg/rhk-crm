import { supabase } from './supabase'

export type SupplierType = 'External' | 'Stock' | 'Internal'

export type Supplier = {
  id: string
  created_at: string
  updated_at: string
  name: string
  supplier_type: SupplierType
  contact_phone: string | null
  contact_email: string | null
  notes: string | null
  is_active: boolean
}

export async function getAllSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .insert(supplier)
    .select()
    .single()

  if (error) throw error
  return data
}