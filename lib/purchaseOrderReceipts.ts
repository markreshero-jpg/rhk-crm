import { supabase } from './supabase'
import { updatePurchaseOrder } from './purchaseOrders'

export type POReceiptLine = {
  id: string
  receipt_id: string
  purchase_order_line_id: string
  qty_received: number
  notes: string | null
  // joined from purchase_order_lines
  item_code: string | null
  item: string | null
  description: string | null
  qty_ordered: number
}

export type POReceipt = {
  id: string
  purchase_order_id: string
  received_at: string
  received_by: string | null
  notes: string | null
  lines: POReceiptLine[]
  created_at: string
}

export async function getPOReceipts(poId: string): Promise<POReceipt[]> {
  const { data, error } = await supabase
    .from('purchase_order_receipts')
    .select(`
      *,
      lines:purchase_order_receipt_lines(
        *,
        pol:purchase_order_lines(item_code, item, description, qty)
      )
    `)
    .eq('purchase_order_id', poId)
    .order('received_at', { ascending: false })
  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    ...r,
    lines: (r.lines || []).map((l: any) => ({
      id: l.id,
      receipt_id: l.receipt_id,
      purchase_order_line_id: l.purchase_order_line_id,
      qty_received: l.qty_received,
      notes: l.notes,
      item_code: l.pol?.item_code ?? null,
      item: l.pol?.item ?? null,
      description: l.pol?.description ?? null,
      qty_ordered: l.pol?.qty ?? 0,
    })),
  }))
}

export type CreateReceiptInput = {
  purchase_order_id: string
  received_at: string
  received_by: string | null
  notes: string | null
  lines: { purchase_order_line_id: string; qty_received: number; notes: string | null }[]
}

export async function createPOReceipt(input: CreateReceiptInput): Promise<void> {
  // 1. Insert receipt header
  const { data: receipt, error: rErr } = await supabase
    .from('purchase_order_receipts')
    .insert({
      purchase_order_id: input.purchase_order_id,
      received_at: input.received_at,
      received_by: input.received_by || null,
      notes: input.notes || null,
    })
    .select()
    .single()
  if (rErr) throw rErr

  // 2. Insert receipt lines (only where qty > 0)
  const receiptLines = input.lines
    .filter((l) => l.qty_received > 0)
    .map((l) => ({ receipt_id: receipt.id, ...l }))

  if (receiptLines.length > 0) {
    const { error: lErr } = await supabase
      .from('purchase_order_receipt_lines')
      .insert(receiptLines)
    if (lErr) throw lErr
  }

  // 3. Update received_qty on each affected PO line by summing all receipts
  const lineIds = input.lines.filter((l) => l.qty_received > 0).map((l) => l.purchase_order_line_id)
  if (lineIds.length > 0) {
    const { data: allReceiptLines } = await supabase
      .from('purchase_order_receipt_lines')
      .select('purchase_order_line_id, qty_received')
      .in('purchase_order_line_id', lineIds)

    const totals = new Map<string, number>()
    for (const rl of (allReceiptLines || [])) {
      totals.set(rl.purchase_order_line_id, (totals.get(rl.purchase_order_line_id) || 0) + rl.qty_received)
    }

    await Promise.all(
      Array.from(totals.entries()).map(([id, total]) =>
        supabase.from('purchase_order_lines').update({ received_qty: total }).eq('id', id)
      )
    )
  }

  // 4. Auto-update PO status based on received totals
  const { data: allLines } = await supabase
    .from('purchase_order_lines')
    .select('qty, received_qty')
    .eq('purchase_order_id', input.purchase_order_id)

  const { data: currentPO } = await supabase
    .from('purchase_orders')
    .select('status')
    .eq('id', input.purchase_order_id)
    .single()

  if (currentPO?.status !== 'Cancelled' && currentPO?.status !== 'Draft') {
    const lines = allLines || []
    const allReceived = lines.length > 0 && lines.every((l) => (l.received_qty ?? 0) >= l.qty)
    const anyReceived = lines.some((l) => (l.received_qty ?? 0) > 0)
    const newStatus = allReceived ? 'Received' : anyReceived ? 'Part Received' : currentPO?.status
    if (newStatus && newStatus !== currentPO?.status) {
      await updatePurchaseOrder(input.purchase_order_id, { status: newStatus as never })
    }
  }
}
