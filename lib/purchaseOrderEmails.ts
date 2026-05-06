import { supabase } from './supabase'

export type POEmail = {
  id: string
  purchase_order_id: string
  sent_at: string
  sent_from: string | null
  sent_to: string[]
  sent_cc: string[]
  sent_bcc: string[]
  subject: string | null
  po_snapshot: POSnapshot | null
  resend_message_id: string | null
  created_at: string
}

export type POSnapshot = {
  po_number: string | null
  supplier_name: string | null
  order_date: string | null
  delivery_name: string | null
  delivery_suburb: string | null
  delivery_postcode: string | null
  notes: string | null
  lines: POSnapshotLine[]
  subtotal: number
  gst: number
  total: number
}

export type POSnapshotLine = {
  item_code: string | null
  item: string | null
  description: string | null
  qty: number
  unit_cost: number
  gst_rate: number
  job_number: string | null
  work_order_number: string | null
}

export async function getPOEmails(poId: string): Promise<POEmail[]> {
  const { data, error } = await supabase
    .from('purchase_order_emails')
    .select('*')
    .eq('purchase_order_id', poId)
    .order('sent_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getPOEmailById(emailId: string): Promise<POEmail | null> {
  const { data, error } = await supabase
    .from('purchase_order_emails')
    .select('*')
    .eq('id', emailId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createPOEmail(record: Omit<POEmail, 'id' | 'created_at'>): Promise<POEmail> {
  const { data, error } = await supabase
    .from('purchase_order_emails')
    .insert(record)
    .select()
    .single()
  if (error) throw error
  return data
}
