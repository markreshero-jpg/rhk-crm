import { supabase } from './supabase'

export const PO_STATUSES = ['Draft', 'Sent', 'Confirmed', 'Part Received', 'Received', 'Cancelled'] as const
export type POStatus = typeof PO_STATUSES[number]

export type PurchaseOrder = {
  id: string
  supplier_id: string
  po_number: string | null
  status: POStatus
  order_date: string
  required_by: string | null
  delivery_name: string | null
  delivery_address_line_1: string | null
  delivery_address_line_2: string | null
  delivery_suburb: string | null
  delivery_postcode: string | null
  notes: string | null
  internal_notes: string | null
  sent_at: string | null
  confirmed_at: string | null
  received_at: string | null
  created_at: string
  updated_at: string
  supplier_name?: string | null
}

export type PurchaseOrderLine = {
  id: string
  purchase_order_id: string
  job_id: string | null
  work_order_id: string | null
  work_order_line_id: string | null
  sort: number
  item_code: string | null
  item: string | null
  description: string | null
  qty: number
  unit_cost: number
  gst_rate: number
  received_qty: number
  notes: string | null
  created_at: string
  updated_at: string
  job_number?: string | null
  job_title?: string | null
  client_name?: string | null
  work_order_number?: string | null
  work_order_title?: string | null
}

export type JobOption = {
  id: string
  job_number: string
  title: string | null
  client_name: string | null
}

export type WorkOrderOption = {
  id: string
  job_id: string
  work_order_number: string | null
  title: string | null
}

// ── PO number generation ──────────────────────────────────────────────────────

export async function generatePONumber(): Promise<string> {
  const { data } = await supabase
    .from('purchase_orders')
    .select('po_number')
    .like('po_number', 'RH%')
    .order('po_number', { ascending: false })
    .limit(20)

  const nums = (data || [])
    .map((r) => parseInt((r.po_number || '').replace(/^RH/i, ''), 10))
    .filter((n) => !isNaN(n))

  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `RH${String(max + 1).padStart(3, '0')}`
}

// ── Purchase Orders ───────────────────────────────────────────────────────────

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(company_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({ ...r, supplier_name: r.supplier?.company_name ?? null }))
}

export async function createPurchaseOrder(po: Partial<PurchaseOrder> & { supplier_id: string }): Promise<PurchaseOrder> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert(po)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePurchaseOrder(id: string, po: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .update(po)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  const { error } = await supabase.from('purchase_orders').delete().eq('id', id)
  if (error) throw error
}

// ── Purchase Order Lines ──────────────────────────────────────────────────────

export async function getPurchaseOrderLines(poId: string): Promise<PurchaseOrderLine[]> {
  const { data, error } = await supabase
    .from('purchase_order_lines')
    .select('*, job:jobs(job_number, title, client:clients(name)), work_order:work_orders(work_order_number, title)')
    .eq('purchase_order_id', poId)
    .order('sort', { ascending: true })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    ...r,
    job_number: r.job?.job_number ?? null,
    job_title: r.job?.title ?? null,
    client_name: r.job?.client?.name ?? null,
    work_order_number: r.work_order?.work_order_number ?? null,
    work_order_title: r.work_order?.title ?? null,
  }))
}

export async function createPurchaseOrderLine(line: Partial<PurchaseOrderLine> & { purchase_order_id: string }): Promise<PurchaseOrderLine> {
  const { data, error } = await supabase
    .from('purchase_order_lines')
    .insert(line)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePurchaseOrderLine(id: string, line: Partial<PurchaseOrderLine>): Promise<PurchaseOrderLine> {
  const { data, error } = await supabase
    .from('purchase_order_lines')
    .update(line)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePurchaseOrderLine(id: string): Promise<void> {
  const { error } = await supabase.from('purchase_order_lines').delete().eq('id', id)
  if (error) throw error
}

// ── Reference data ────────────────────────────────────────────────────────────

export async function getJobOptions(): Promise<JobOption[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, job_number, title, client:clients(name)')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    job_number: r.job_number,
    title: r.title,
    client_name: r.client?.name ?? null,
  }))
}

export async function getWorkOrderOptions(): Promise<WorkOrderOption[]> {
  const { data, error } = await supabase
    .from('work_orders')
    .select('id, job_id, work_order_number, title')
    .order('created_at', { ascending: true })
    .limit(500)
  if (error) throw error
  return data || []
}
