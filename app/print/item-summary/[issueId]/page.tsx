'use client'

import { use, useEffect, useState } from 'react'
import { Printer, ArrowLeft } from 'lucide-react'
import { getItemSummaryData, ItemSummaryData, SummaryItem } from '@/lib/itemSummary'

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtPct(n: number): string {
  return n === 0 ? '—' : n + '%'
}

export default function ItemSummaryPage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = use(params)
  const [data, setData] = useState<ItemSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getItemSummaryData(issueId)
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [issueId])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-sm text-gray-400">Loading...</div>
  }
  if (error || !data) {
    return <div className="flex items-center justify-center min-h-screen text-sm text-red-500">{error || 'Not found'}</div>
  }

  const { issue, job, client } = data
  const siteAddress = [
    job.site_address_line_1,
    job.site_address_line_2,
    [job.site_suburb, job.site_postcode].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ')

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .report-doc { box-shadow: none !important; margin: 0 !important; padding: 12mm 15mm !important; }
          .avoid-break { page-break-inside: avoid; }
        }
        @page { margin: 0; size: A4; }
      `}</style>

      {/* Action bar */}
      <div className="no-print fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[900px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href={`/jobs/${job.id}?tab=quote`}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={14} /> Back to quote
            </a>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-500">
              Item Summary · Issue #{issue.issue_number}{job.job_number ? ` · ${job.job_number}` : ''}
            </span>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <Printer size={14} /> Save as PDF
          </button>
        </div>
      </div>

      <div className="no-print h-16" />
      <div className="no-print bg-gray-100 min-h-screen py-8">
        <div className="report-doc bg-white mx-auto shadow-lg" style={{ maxWidth: '794px', padding: '20mm 18mm 18mm' }}>
          <ReportDocument data={data} siteAddress={siteAddress} />
        </div>
      </div>

      <div className="hidden print:block">
        <div className="report-doc" style={{ padding: '12mm 15mm' }}>
          <ReportDocument data={data} siteAddress={siteAddress} />
        </div>
      </div>
    </>
  )
}

function ReportDocument({ data, siteAddress }: { data: ItemSummaryData; siteAddress: string }) {
  const { issue, job, client, items, total_materials, total_labour, subtotal_ex_gst, gst, total_inc_gst } = data

  const th: React.CSSProperties = {
    fontSize: '9px',
    fontFamily: 'system-ui, sans-serif',
    fontWeight: 600,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    color: '#999',
    padding: '3px 6px 3px 0',
    textAlign: 'left',
    borderBottom: '1px solid #e0e0e0',
    whiteSpace: 'nowrap',
  }
  const thR: React.CSSProperties = { ...th, textAlign: 'right' }
  const td: React.CSSProperties = { fontSize: '10px', fontFamily: 'system-ui, sans-serif', color: '#333', padding: '2px 6px 2px 0', verticalAlign: 'top' }
  const tdR: React.CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' }
  const tdMuted: React.CSSProperties = { ...td, color: '#777' }

  return (
    <div style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a', lineHeight: 1.4 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px', fontFamily: 'system-ui, sans-serif' }}>RHK</div>
          <div style={{ fontSize: '10px', color: '#888', marginTop: '1px', fontFamily: 'system-ui, sans-serif' }}>Operations</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '2px', fontFamily: 'system-ui, sans-serif', color: '#111' }}>ITEM SUMMARY</div>
          <div style={{ fontSize: '11px', color: '#555', marginTop: '3px', fontFamily: 'system-ui, sans-serif' }}>
            <div>Ref: {job.job_number || '—'} · Issue #{issue.issue_number}</div>
            <div>Date: {fmtDate(issue.created_at)}</div>
          </div>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '2px solid #111', marginBottom: '12px' }} />

      {/* Job / client strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '9px', fontFamily: 'system-ui, sans-serif', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#999', marginBottom: '3px' }}>Client</div>
          <div style={{ fontSize: '12px', fontWeight: 700 }}>{client?.name || '—'}</div>
          {client?.contact_person && <div style={{ fontSize: '11px', color: '#555' }}>{client.contact_person}</div>}
        </div>
        <div>
          <div style={{ fontSize: '9px', fontFamily: 'system-ui, sans-serif', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#999', marginBottom: '3px' }}>Project</div>
          <div style={{ fontSize: '12px', fontWeight: 600 }}>{job.title || '—'}</div>
        </div>
        {siteAddress && (
          <div>
            <div style={{ fontSize: '9px', fontFamily: 'system-ui, sans-serif', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#999', marginBottom: '3px' }}>Site</div>
            <div style={{ fontSize: '11px', color: '#444' }}>{siteAddress}</div>
          </div>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #ddd', marginBottom: '14px' }} />

      {/* Items */}
      {items.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#aaa', fontStyle: 'italic' }}>No items on this quote.</div>
      ) : (
        items.map((item, idx) => (
          <ItemBlock key={item.id} item={item} idx={idx} th={th} thR={thR} td={td} tdR={tdR} tdMuted={tdMuted} />
        ))
      )}

      <hr style={{ border: 'none', borderTop: '1px solid #ddd', marginTop: '8px', marginBottom: '14px' }} />

      {/* Grand summary */}
      <div className="avoid-break">
        <div style={{ fontSize: '9px', fontFamily: 'system-ui, sans-serif', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#999', marginBottom: '8px' }}>
          Summary
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'system-ui, sans-serif' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: '22px' }}>#</th>
              <th style={th}>Item</th>
              <th style={thR}>Materials</th>
              <th style={thR}>Labour</th>
              <th style={thR}>Total (ex GST)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ ...td, color: '#aaa', fontSize: '10px' }}>{idx + 1}.</td>
                <td style={td}>
                  {item.name || 'Untitled'}
                  {item.qty > 1 && <span style={{ color: '#aaa' }}> × {item.qty}</span>}
                </td>
                <td style={tdR}>{item.materials_total > 0 ? fmt(item.materials_total) : '—'}</td>
                <td style={tdR}>{item.labour_total > 0 ? fmt(item.labour_total) : '—'}</td>
                <td style={{ ...tdR, fontWeight: 600 }}>{item.total_ex_gst > 0 ? fmt(item.total_ex_gst) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '1px solid #ccc' }}>
              <td colSpan={2} style={{ ...td, color: '#777', paddingTop: '8px' }}>Total materials</td>
              <td style={{ ...tdR, paddingTop: '8px' }}>{fmt(total_materials)}</td>
              <td colSpan={2} />
            </tr>
            <tr>
              <td colSpan={2} style={{ ...td, color: '#777' }}>Total labour</td>
              <td />
              <td style={tdR}>{fmt(total_labour)}</td>
              <td />
            </tr>
            <tr style={{ borderTop: '1px solid #ddd' }}>
              <td colSpan={4} style={{ ...td, color: '#777', paddingTop: '6px' }}>Subtotal (ex GST)</td>
              <td style={{ ...tdR, paddingTop: '6px' }}>{fmt(subtotal_ex_gst)}</td>
            </tr>
            <tr>
              <td colSpan={4} style={{ ...td, color: '#777' }}>GST (10%)</td>
              <td style={tdR}>{fmt(gst)}</td>
            </tr>
            <tr style={{ borderTop: '2px solid #111' }}>
              <td colSpan={4} style={{ ...td, fontWeight: 700, fontSize: '12px', paddingTop: '6px' }}>Total (inc GST)</td>
              <td style={{ ...tdR, fontWeight: 700, fontSize: '13px', paddingTop: '6px' }}>{fmt(total_inc_gst)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer */}
      <hr style={{ border: 'none', borderTop: '1px solid #eee', marginTop: '20px', marginBottom: '8px' }} />
      <div style={{ fontSize: '10px', color: '#bbb', fontFamily: 'system-ui, sans-serif', display: 'flex', justifyContent: 'space-between' }}>
        <span>Internal document — not for distribution</span>
        <span>{job.job_number} · Issue #{issue.issue_number}</span>
      </div>
    </div>
  )
}

function ItemBlock({
  item,
  idx,
  th, thR, td, tdR, tdMuted,
}: {
  item: SummaryItem
  idx: number
  th: React.CSSProperties
  thR: React.CSSProperties
  td: React.CSSProperties
  tdR: React.CSSProperties
  tdMuted: React.CSSProperties
}) {
  const hasLines = item.lines.length > 0
  const hasLabour = item.labour.length > 0

  return (
    <div className="avoid-break" style={{ marginBottom: '12px' }}>
      {/* Item header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', backgroundColor: '#f7f7f7', padding: '4px 8px', borderLeft: '3px solid #333', marginBottom: '4px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'system-ui, sans-serif' }}>
          <span style={{ color: '#999', marginRight: '6px', fontSize: '10px' }}>{idx + 1}.</span>
          {item.name || 'Untitled item'}
          {item.qty > 1 && <span style={{ fontWeight: 400, color: '#888', fontSize: '11px', marginLeft: '6px' }}>× {item.qty}</span>}
        </div>
        <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'system-ui, sans-serif' }}>
          {fmt(item.total_ex_gst)}
        </div>
      </div>

      {/* Materials */}
      {hasLines && (
        <div style={{ marginBottom: hasLabour ? '6px' : '0', paddingLeft: '11px' }}>
          <div style={{ fontSize: '9px', fontFamily: 'system-ui, sans-serif', fontWeight: 600, color: '#aaa', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '2px' }}>
            Materials
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Item</th>
                <th style={th}>Description</th>
                <th style={th}>Code</th>
                <th style={th}>Supplier</th>
                <th style={thR}>Cost</th>
                <th style={thR}>Qty</th>
                <th style={thR}>Mkup</th>
                <th style={thR}>Sell</th>
              </tr>
            </thead>
            <tbody>
              {item.lines.map((line, li) => (
                <tr key={li} style={{ borderBottom: '1px solid #f4f4f4' }}>
                  <td style={td}>{line.item || '—'}{line.is_allowance && <span style={{ color: '#aaa', fontSize: '9px', marginLeft: '4px' }}>(allow)</span>}</td>
                  <td style={tdMuted}>{line.description || ''}</td>
                  <td style={tdMuted}>{line.item_code || ''}</td>
                  <td style={tdMuted}>{line.supplier_name || ''}</td>
                  <td style={tdR}>{line.price > 0 ? fmt(line.price) : '—'}</td>
                  <td style={tdR}>{line.qty || '—'}</td>
                  <td style={tdR}>{fmtPct(line.markup_percent)}</td>
                  <td style={{ ...tdR, fontWeight: 500 }}>{line.sell_price > 0 ? fmt(line.sell_price) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={7} style={{ ...td, color: '#888', paddingTop: '2px' }}>Materials subtotal{item.qty > 1 ? ` (× ${item.qty})` : ''}</td>
                <td style={{ ...tdR, fontWeight: 600, paddingTop: '2px', borderTop: '1px solid #e8e8e8' }}>{fmt(item.materials_total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Labour */}
      {hasLabour && (
        <div style={{ paddingLeft: '11px' }}>
          <div style={{ fontSize: '9px', fontFamily: 'system-ui, sans-serif', fontWeight: 600, color: '#aaa', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '2px' }}>
            Labour
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Type</th>
                <th style={thR}>Rate/hr</th>
                <th style={thR}>Hrs</th>
                <th style={thR}>Mkup</th>
                <th style={thR}>Sell</th>
              </tr>
            </thead>
            <tbody>
              {item.labour.map((lab, li) => (
                <tr key={li} style={{ borderBottom: '1px solid #f4f4f4' }}>
                  <td style={td}>{lab.type || '—'}</td>
                  <td style={tdR}>{lab.price > 0 ? fmt(lab.price) : '—'}</td>
                  <td style={tdR}>{lab.qty || '—'}</td>
                  <td style={tdR}>{fmtPct(lab.markup_percent)}</td>
                  <td style={{ ...tdR, fontWeight: 500 }}>{lab.sell_price > 0 ? fmt(lab.sell_price) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ ...td, color: '#888', paddingTop: '2px' }}>Labour subtotal{item.qty > 1 ? ` (× ${item.qty})` : ''}</td>
                <td style={{ ...tdR, fontWeight: 600, paddingTop: '2px', borderTop: '1px solid #e8e8e8' }}>{fmt(item.labour_total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!hasLines && !hasLabour && (
        <div style={{ paddingLeft: '11px', fontSize: '10px', color: '#bbb', fontStyle: 'italic' }}>No lines entered.</div>
      )}
    </div>
  )
}
