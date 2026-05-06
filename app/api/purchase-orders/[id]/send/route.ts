import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { createPOEmail, POSnapshot } from '@/lib/purchaseOrderEmails'
import { updatePurchaseOrder } from '@/lib/purchaseOrders'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: poId } = await params
  const body = await req.json() as { from: string; to: string[]; cc?: string[]; bcc?: string[]; subject: string }

  if (!body.to?.length) {
    return NextResponse.json({ error: 'At least one recipient required' }, { status: 400 })
  }
  if (!body.from) {
    return NextResponse.json({ error: 'From address is required' }, { status: 400 })
  }

  // Fetch PO with lines and supplier
  const { data: po, error: poErr } = await supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(company_name, email)')
    .eq('id', poId)
    .single()
  if (poErr || !po) return NextResponse.json({ error: 'PO not found' }, { status: 404 })

  const { data: rawLines, error: linesErr } = await supabase
    .from('purchase_order_lines')
    .select('*, job:jobs(job_number), work_order:work_orders(work_order_number)')
    .eq('purchase_order_id', poId)
    .order('sort', { ascending: true })
  if (linesErr) return NextResponse.json({ error: 'Failed to load lines' }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lines = (rawLines || []).map((l: any) => ({
    item_code: l.item_code,
    item: l.item,
    description: l.description,
    qty: l.qty ?? 0,
    unit_cost: l.unit_cost ?? 0,
    gst_rate: l.gst_rate ?? 0.1,
    job_number: l.job?.job_number ?? null,
    work_order_number: l.work_order?.work_order_number ?? null,
  }))

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unit_cost, 0)
  const gst      = lines.reduce((s, l) => s + l.qty * l.unit_cost * l.gst_rate, 0)
  const total    = subtotal + gst

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supplier = (po as any).supplier

  const snapshot: POSnapshot = {
    po_number: po.po_number,
    supplier_name: supplier?.company_name ?? null,
    order_date: po.order_date,
    delivery_name: po.delivery_name,
    delivery_suburb: po.delivery_suburb,
    delivery_postcode: po.delivery_postcode,
    notes: po.notes,
    lines,
    subtotal,
    gst,
    total,
  }

  const fmt = (n: number) => '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, sans-serif; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 22px; font-weight: 700; letter-spacing: 2px; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #888; border-bottom: 1px solid #ddd; padding: 4px 8px 4px 0; }
  th.r { text-align: right; }
  td { padding: 5px 8px 5px 0; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  td.r { text-align: right; white-space: nowrap; }
  .totals { margin-top: 16px; text-align: right; font-size: 13px; }
  .totals tr td { border: none; padding: 2px 0; }
  .total-row td { font-weight: 700; font-size: 14px; border-top: 2px solid #111; padding-top: 6px; }
  .notes { margin-top: 20px; padding: 12px; background: #f7f7f7; border-radius: 4px; font-size: 12px; }
</style></head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
    <div><h1>PURCHASE ORDER</h1><div class="meta">${po.po_number || '—'} · ${po.order_date || ''}</div></div>
    <div style="text-align:right;font-size:13px;font-weight:700;">RHK</div>
  </div>
  <hr style="border:none;border-top:2px solid #111;margin-bottom:16px;">

  <table>
    <thead>
      <tr>
        <th style="width:80px">Code</th>
        <th>Item</th>
        <th>Description</th>
        <th class="r" style="width:50px">Qty</th>
        <th class="r" style="width:80px">Unit Cost</th>
        <th class="r" style="width:80px">Ex GST</th>
      </tr>
    </thead>
    <tbody>
      ${lines.map(l => `
        <tr>
          <td style="font-family:monospace;color:#666">${l.item_code || ''}</td>
          <td>${l.item || ''}</td>
          <td style="color:#666">${l.description || ''}</td>
          <td class="r">${l.qty}</td>
          <td class="r">${fmt(l.unit_cost)}</td>
          <td class="r">${fmt(l.qty * l.unit_cost)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <table class="totals" style="width:280px;margin-left:auto;margin-top:16px;">
    <tr><td style="color:#666">Subtotal (ex GST)</td><td style="text-align:right">${fmt(subtotal)}</td></tr>
    <tr><td style="color:#666">GST</td><td style="text-align:right">${fmt(gst)}</td></tr>
    <tr class="total-row"><td>Total (inc GST)</td><td style="text-align:right">${fmt(total)}</td></tr>
  </table>

  ${snapshot.notes ? `<div class="notes"><strong>Notes:</strong> ${snapshot.notes}</div>` : ''}
  ${snapshot.delivery_name ? `<div class="notes" style="margin-top:8px;"><strong>Deliver to:</strong> ${[snapshot.delivery_name, snapshot.delivery_suburb, snapshot.delivery_postcode].filter(Boolean).join(', ')}</div>` : ''}
</body>
</html>`

  let resendMessageId: string | null = null
  const apiKey = process.env.RESEND_API_KEY

  if (apiKey) {
    try {
      const resend = new Resend(apiKey)
      const result = await resend.emails.send({
        from: body.from,
        to: body.to,
        cc: body.cc?.length ? body.cc : undefined,
        bcc: body.bcc?.length ? body.bcc : undefined,
        subject: body.subject,
        html,
      })
      resendMessageId = result.data?.id ?? null
    } catch (e) {
      console.error('Resend error:', e)
      // Still log the send attempt even if email fails
    }
  } else {
    console.warn('RESEND_API_KEY not configured — email not sent, but log recorded.')
  }

  // Log the email
  await createPOEmail({
    purchase_order_id: poId,
    sent_at: new Date().toISOString(),
    sent_from: body.from,
    sent_to: body.to,
    sent_cc: body.cc || [],
    sent_bcc: body.bcc || [],
    subject: body.subject,
    po_snapshot: snapshot,
    resend_message_id: resendMessageId,
  })

  // Update status to Sent
  await updatePurchaseOrder(poId, { status: 'Sent' })

  return NextResponse.json({ ok: true, resendMessageId })
}
