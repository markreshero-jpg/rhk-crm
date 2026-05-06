'use client'

import { use, useEffect, useState } from 'react'
import { Printer, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { POSnapshot } from '@/lib/purchaseOrderEmails'

function fmt(n: number) {
  return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function POPrintPage({ params }: { params: Promise<{ poId: string }> }) {
  const { poId } = use(params)
  const [snapshot, setSnapshot] = useState<POSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .select('*, supplier:suppliers(company_name)')
        .eq('id', poId)
        .single()
      if (poErr || !po) { setError('PO not found'); setLoading(false); return }

      const { data: rawLines } = await supabase
        .from('purchase_order_lines')
        .select('*, job:jobs(job_number), work_order:work_orders(work_order_number)')
        .eq('purchase_order_id', poId)
        .order('sort', { ascending: true })

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supplier = (po as any).supplier

      setSnapshot({
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
        total: subtotal + gst,
      })
      setLoading(false)
    }
    load().catch((e) => { setError(e.message); setLoading(false) })
  }, [poId])

  if (loading) return <div className="flex items-center justify-center min-h-screen text-sm text-gray-400">Loading...</div>
  if (error || !snapshot) return <div className="flex items-center justify-center min-h-screen text-sm text-red-500">{error || 'Not found'}</div>

  return (
    <>
      <style>{`
        @media print { .no-print { display: none !important; } body { background: white !important; } .report-doc { box-shadow: none !important; margin: 0 !important; } }
        @page { margin: 0; size: A4; }
      `}</style>

      <div className="no-print fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[794px] mx-auto px-6 py-3 flex items-center justify-between">
          <a href="/purchase-orders" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={14} /> Back to Purchase Orders
          </a>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors">
            <Printer size={14} /> Save as PDF
          </button>
        </div>
      </div>

      <div className="no-print h-16" />
      <div className="no-print bg-gray-100 min-h-screen py-8">
        <div className="report-doc bg-white mx-auto shadow-lg" style={{ maxWidth: '794px', padding: '20mm 18mm 18mm' }}>
          <PODocument snapshot={snapshot} live />
        </div>
      </div>

      <div className="hidden print:block">
        <div className="report-doc" style={{ padding: '14mm 16mm' }}>
          <PODocument snapshot={snapshot} live />
        </div>
      </div>
    </>
  )
}

export function PODocument({ snapshot, live = false }: { snapshot: POSnapshot; live?: boolean }) {
  const th: React.CSSProperties = { fontSize: '9px', fontFamily: 'system-ui', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#999', padding: '3px 8px 3px 0', textAlign: 'left', borderBottom: '1px solid #e0e0e0', whiteSpace: 'nowrap' }
  const thR: React.CSSProperties = { ...th, textAlign: 'right' }
  const td: React.CSSProperties  = { fontSize: '11px', fontFamily: 'system-ui', color: '#333', padding: '4px 8px 4px 0', verticalAlign: 'top', borderBottom: '1px solid #f4f4f4' }
  const tdR: React.CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' }

  const deliveryParts = [snapshot.delivery_name, snapshot.delivery_suburb, snapshot.delivery_postcode].filter(Boolean)

  return (
    <div style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a', lineHeight: 1.4 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px', fontFamily: 'system-ui' }}>RHK</div>
          <div style={{ fontSize: '10px', color: '#888', fontFamily: 'system-ui' }}>Operations</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '2px', fontFamily: 'system-ui', color: '#111' }}>PURCHASE ORDER</div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '4px', fontFamily: 'system-ui' }}>
            <div>{snapshot.po_number || '—'}</div>
            <div>{snapshot.order_date || ''}</div>
          </div>
          {live && <div style={{ marginTop: '4px', fontSize: '10px', color: '#aaa', fontFamily: 'system-ui' }}>Current version</div>}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '2px solid #111', marginBottom: '14px' }} />

      {/* Supplier / Delivery */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '9px', fontFamily: 'system-ui', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#999', marginBottom: '4px' }}>Supplier</div>
          <div style={{ fontSize: '13px', fontWeight: 700 }}>{snapshot.supplier_name || '—'}</div>
        </div>
        {deliveryParts.length > 0 && (
          <div>
            <div style={{ fontSize: '9px', fontFamily: 'system-ui', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#999', marginBottom: '4px' }}>Deliver To</div>
            <div style={{ fontSize: '12px', color: '#444' }}>{deliveryParts.join(', ')}</div>
          </div>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #ddd', marginBottom: '14px' }} />

      {/* Lines table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...th, width: '70px', fontFamily: 'monospace' }}>Code</th>
            <th style={th}>Item</th>
            <th style={th}>Description</th>
            <th style={thR}>Qty</th>
            <th style={thR}>Unit Cost</th>
            <th style={thR}>Ex GST</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.lines.map((l, i) => (
            <tr key={i}>
              <td style={{ ...td, fontFamily: 'monospace', color: '#666', fontSize: '10px' }}>{l.item_code || ''}</td>
              <td style={td}>{l.item || ''}</td>
              <td style={{ ...td, color: '#666' }}>{l.description || ''}</td>
              <td style={tdR}>{l.qty}</td>
              <td style={tdR}>{fmt(l.unit_cost)}</td>
              <td style={{ ...tdR, fontWeight: 600 }}>{fmt(l.qty * l.unit_cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
        <table style={{ width: '260px', borderCollapse: 'collapse', fontFamily: 'system-ui', fontSize: '12px' }}>
          <tbody>
            <tr>
              <td style={{ color: '#666', padding: '3px 0' }}>Subtotal (ex GST)</td>
              <td style={{ textAlign: 'right', padding: '3px 0' }}>{fmt(snapshot.subtotal)}</td>
            </tr>
            <tr>
              <td style={{ color: '#666', padding: '3px 0' }}>GST</td>
              <td style={{ textAlign: 'right', padding: '3px 0' }}>{fmt(snapshot.gst)}</td>
            </tr>
            <tr style={{ borderTop: '2px solid #111' }}>
              <td style={{ fontWeight: 700, fontSize: '14px', paddingTop: '6px' }}>Total (inc GST)</td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '14px', paddingTop: '6px' }}>{fmt(snapshot.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {snapshot.notes && (
        <div style={{ marginTop: '20px', padding: '10px 12px', background: '#f7f7f7', borderRadius: '4px', fontFamily: 'system-ui', fontSize: '11px', color: '#444' }}>
          <strong>Notes:</strong> {snapshot.notes}
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid #eee', marginTop: '24px', marginBottom: '8px' }} />
      <div style={{ fontSize: '10px', color: '#bbb', fontFamily: 'system-ui', display: 'flex', justifyContent: 'space-between' }}>
        <span>RHK — Internal document</span>
        <span>{snapshot.po_number}</span>
      </div>
    </div>
  )
}
