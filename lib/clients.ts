import { supabase } from './supabase'

export type Client = {
  id: string
  created_at: string
  updated_at: string
  name: string
  contact_person: string | null
  phone: string | null
  mobile: string | null
  email: string | null
  address_line_1: string | null
  address_line_2: string | null
  suburb: string | null
  postcode: string | null
  client_type: string | null
  client_source: 'Referral' | 'Walk In' | 'Website' | 'Repeat' | 'Unknown' | null
  referred_by: string | null
  notes: string | null
  is_active: boolean
}

export async function getAllClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getClientById(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createClient(client: Partial<Client>): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .insert(client)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateClient(id: string, client: Partial<Client>): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update(client)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)

  if (error) throw error
}
export async function searchClients(query: string): Promise<Client[]> {
    if (!query.trim()) return getAllClients()
  
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .or(
        `name.ilike.%${query}%,phone.ilike.%${query}%,mobile.ilike.%${query}%,email.ilike.%${query}%`
      )
      .order('name', { ascending: true })
  
    if (error) throw error
    return data || []
  }