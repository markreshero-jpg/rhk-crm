import { supabase } from './supabase'

export const WORK_ORDER_STATUSES = ['Draft', 'Ready', 'In Progress', 'Completed', 'Cancelled'] as const
export type WorkOrderStatus = typeof WORK_ORDER_STATUSES[number]

export type WorkOrderWithJob = WorkOrder & {
  job_number: string | null
  job_title: string | null
  client_name: string | null
}

export type WorkOrder = {
  id: string
  job_id: string
  work_order_number: string | null
  title: string | null
  status: WorkOrderStatus
  scheduled_start: string | null
  scheduled_end: string | null
  revision_number: number
  is_locked: boolean
  notes: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
}

export type WorkOrderLine = {
  id: string
  work_order_id: string
  source_quote_item_id: string | null
  source_quote_item_line_id: string | null
  supplier_id: string | null
  supplier_item_id: string | null
  group_name: string | null
  sort: number
  item_code: string | null
  item: string | null
  description: string | null
  qty: number
  unit_cost: number
  stage: string
  status: string
  required_by: string | null
  include_on_po: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type LineStatusOption = {
  id: string
  stage: string
  status: string
  sort: number
}

// ── Work Orders ──────────────────────────────────────────────────────────────

export async function searchWorkOrders(query: string): Promise<WorkOrderWithJob[]> {
  let jobIds: string[] = []

  if (query.trim()) {
    const [jobRes, clientRes] = await Promise.all([
      supabase.from('jobs').select('id').ilike('job_number', `%${query}%`),
      supabase.from('clients').select('id').ilike('name', `%${query}%`),
    ])
    const directJobIds = (jobRes.data || []).map((j) => j.id)
    const clientIds = (clientRes.data || []).map((c) => c.id)
    if (clientIds.length > 0) {
      const { data } = await supabase.from('jobs').select('id').in('client_id', clientIds)
      jobIds = [...new Set([...directJobIds, ...(data || []).map((j) => j.id)])]
    } else {
      jobIds = directJobIds
    }
  }

  let q = supabase
    .from('work_orders')
    .select('*, job:jobs(id, job_number, title, client:clients(name))')
    .order('created_at', { ascending: false })

  if (query.trim()) {
    const orParts = [
      `work_order_number.ilike.%${query}%`,
      `title.ilike.%${query}%`,
      ...(jobIds.length > 0 ? [`job_id.in.(${jobIds.join(',')})`] : []),
    ]
    q = q.or(orParts.join(','))
  }

  const { data, error } = await q
  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    ...r,
    job_number: r.job?.job_number ?? null,
    job_title: r.job?.title ?? null,
    client_name: r.job?.client?.name ?? null,
  }))
}

export async function getWorkOrdersByJobId(jobId: string): Promise<WorkOrder[]> {
  const { data, error } = await supabase
    .from('work_orders')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createWorkOrder(wo: Partial<WorkOrder>): Promise<WorkOrder> {
  const { data, error } = await supabase
    .from('work_orders')
    .insert(wo)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateWorkOrder(id: string, wo: Partial<WorkOrder>): Promise<WorkOrder> {
  const { data, error } = await supabase
    .from('work_orders')
    .update(wo)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteWorkOrder(id: string): Promise<void> {
  const { error } = await supabase.from('work_orders').delete().eq('id', id)
  if (error) throw error
}

// ── Work Order Lines ─────────────────────────────────────────────────────────

export async function getWorkOrderLinesByWorkOrderId(workOrderId: string): Promise<WorkOrderLine[]> {
  const { data, error } = await supabase
    .from('work_order_lines')
    .select('*')
    .eq('work_order_id', workOrderId)
    .order('sort', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createWorkOrderLine(line: Partial<WorkOrderLine>): Promise<WorkOrderLine> {
  if (line.sort === undefined && line.work_order_id) {
    const existing = await getWorkOrderLinesByWorkOrderId(line.work_order_id)
    line.sort = existing.length > 0 ? Math.max(...existing.map((l) => l.sort)) + 1 : 1
  }
  const { data, error } = await supabase
    .from('work_order_lines')
    .insert(line)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateWorkOrderLine(id: string, line: Partial<WorkOrderLine>): Promise<WorkOrderLine> {
  const { data, error } = await supabase
    .from('work_order_lines')
    .update(line)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteWorkOrderLine(id: string): Promise<void> {
  const { error } = await supabase.from('work_order_lines').delete().eq('id', id)
  if (error) throw error
}

export async function getLineStatusOptions(): Promise<LineStatusOption[]> {
  const { data, error } = await supabase
    .from('work_order_line_status_options')
    .select('id, stage, status, sort')
    .eq('is_active', true)
    .order('sort', { ascending: true })
  if (error) throw error
  return data || []
}

// ── Import helpers ───────────────────────────────────────────────────────────

export type QuoteItemForImport = {
  id: string
  name: string
  sort: number
  qty: number
  line_count: number
}

export async function getQuoteItemsForImport(issueId: string): Promise<QuoteItemForImport[]> {
  const { data, error } = await supabase
    .from('quote_items')
    .select('id, name, sort, qty, lines:quote_item_lines(id, qty)')
    .eq('issue_id', issueId)
    .order('sort', { ascending: true })
  if (error) throw error
  return (data || []).map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = item as any
    return {
      id: r.id,
      name: r.name || 'Untitled',
      sort: r.sort,
      qty: r.qty ?? 1,
      line_count: (r.lines || []).filter((l: { qty: number | null }) => (l.qty ?? 0) > 0).length,
    }
  })
}

export async function importQuoteItemsToWorkOrder(
  workOrderId: string,
  issueId: string,
  selectedItemIds: string[]
): Promise<void> {
  const { data: items, error } = await supabase
    .from('quote_items')
    .select('id, name, sort, lines:quote_item_lines(id, sort, item, description, item_code, supplier_id, price, qty)')
    .eq('issue_id', issueId)
    .in('id', selectedItemIds)
    .order('sort', { ascending: true })
  if (error) throw error

  const existing = await getWorkOrderLinesByWorkOrderId(workOrderId)
  let sort = existing.length > 0 ? Math.max(...existing.map((l) => l.sort)) + 1 : 1

  const toInsert: Partial<WorkOrderLine>[] = []
  for (const item of (items || [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = item as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lines = (r.lines || []).filter((l: any) => (l.qty ?? 0) > 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const line of lines as any[]) {
      toInsert.push({
        work_order_id: workOrderId,
        group_name: r.name || 'Untitled',
        source_quote_item_id: r.id,
        source_quote_item_line_id: line.id,
        supplier_id: line.supplier_id ?? null,
        item_code: line.item_code ?? null,
        item: line.item ?? null,
        description: line.description ?? null,
        qty: line.qty ?? 1,
        unit_cost: line.price ?? 0,
        include_on_po: true,
        sort: sort++,
      })
    }
  }

  if (toInsert.length === 0) return
  const { error: insertError } = await supabase.from('work_order_lines').insert(toInsert)
  if (insertError) throw insertError
}

// ── Grouping helper ──────────────────────────────────────────────────────────

export type LineGroup = {
  name: string
  lines: WorkOrderLine[]
  total: number
}

export type WOLineWithContext = WorkOrderLine & {
  work_order_number: string | null
  job_id: string | null
  job_number: string | null
  supplier_name: string | null
}

export type WOLinePOStatus = {
  purchase_order_id: string
  po_number: string | null
}

export function groupWorkOrderLines(lines: WorkOrderLine[]): LineGroup[] {
  const order: string[] = []
  const map = new Map<string, WorkOrderLine[]>()
  for (const line of lines) {
    const key = line.group_name || 'Other'
    if (!map.has(key)) { map.set(key, []); order.push(key) }
    map.get(key)!.push(line)
  }
  return order.map((name) => {
    const groupLines = map.get(name)!
    return {
      name,
      lines: groupLines,
      total: groupLines.reduce((s, l) => s + (l.qty || 0) * (l.unit_cost || 0), 0),
    }
  })
}

// ── PO integration helpers ────────────────────────────────────────────────────

export async function countIncludeOnPOLines(): Promise<number> {
  const { count, error } = await supabase
    .from('work_order_lines')
    .select('id', { count: 'exact', head: true })
    .eq('include_on_po', true)
  if (error) return 0
  return count ?? 0
}

export async function getIncludeOnPOLines(): Promise<WOLineWithContext[]> {
  const { data, error } = await supabase
    .from('work_order_lines')
    .select('*, work_order:work_orders(work_order_number, job_id, job:jobs(job_number)), supplier:suppliers(company_name)')
    .eq('include_on_po', true)
    .order('sort', { ascending: true })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    ...r,
    work_order_number: r.work_order?.work_order_number ?? null,
    job_id: r.work_order?.job_id ?? null,
    job_number: r.work_order?.job?.job_number ?? null,
    supplier_name: r.supplier?.company_name ?? null,
  }))
}

export async function getPOStatusForWOLines(lineIds: string[]): Promise<Map<string, WOLinePOStatus>> {
  if (!lineIds.length) return new Map()
  const { data, error } = await supabase
    .from('purchase_order_lines')
    .select('work_order_line_id, purchase_order_id, po:purchase_orders(po_number)')
    .in('work_order_line_id', lineIds)
  if (error) return new Map()
  const map = new Map<string, WOLinePOStatus>()
  for (const r of (data || [])) {
    if (r.work_order_line_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.set(r.work_order_line_id, { purchase_order_id: r.purchase_order_id, po_number: (r.po as any)?.po_number ?? null })
    }
  }
  return map
}
