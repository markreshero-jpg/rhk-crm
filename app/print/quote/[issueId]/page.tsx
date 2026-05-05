'use client'

import { use, useEffect, useState } from 'react'
import { Printer, Mail, ArrowLeft } from 'lucide-react'
import { getWrittenQuoteData, WrittenQuoteData } from '@/lib/writtenQuote'

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-AU')
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function WrittenQuotePage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = use(params)
  const [data, setData] = useState<WrittenQuoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getWrittenQuoteData(issueId)
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load quote'))
      .finally(() => setLoading(false))
  }, [issueId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-gray-400">
        Loading quote...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-red-500">
        {error || 'Quote not found'}
      </div>
    )
  }

  const { issue, job, client, items } = data

  const mailtoHref = client?.email
    ? `mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent(
        `Quote ${job.job_number}${job.title ? ' – ' + job.title : ''}`
      )}&body=${encodeURIComponent(
        `Dear ${client.contact_person || client.name},\n\nPlease find attached our quotation for the above project.\n\nWe would be happy to discuss any aspect of the quote at your convenience. Please don't hesitate to get in touch.\n\nKind regards`
      )}`
    : null

  const siteAddress = [
    job.site_address_line_1,
    job.site_address_line_2,
    [job.site_suburb, job.site_postcode].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ')

  const clientAddress = client
    ? [
        client.address_line_1,
        client.address_line_2,
        [client.suburb, client.postcode].filter(Boolean).join(' '),
      ]
        .filter(Boolean)
        .join('\n')
    : null

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .quote-doc { box-shadow: none !important; margin: 0 !important; padding: 15mm 18mm !important; }
          .page-break-before { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
        }
        @page {
          margin: 0;
          size: A4;
        }
      `}</style>

      {/* ── Action bar (screen only) ── */}
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
              Issue #{issue.issue_number}{job.job_number ? ` · ${job.job_number}` : ''}
            </span>
          </div>
          <div className="flex gap-2">
            {mailtoHref && (
              <a
                href={mailtoHref}
                onClick={() => {
                  // Small delay so user sees the tip
                }}
                title="Opens your email client. Save as PDF first, then attach it."
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Mail size={14} /> Email to client
              </a>
            )}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <Printer size={14} /> Save as PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Quote document ── */}
      <div className="no-print h-16" /> {/* spacer for fixed bar */}
      <div className="no-print bg-gray-100 min-h-screen py-8">
        <div
          className="quote-doc bg-white mx-auto shadow-lg"
          style={{ maxWidth: '794px', padding: '30mm 20mm 20mm' }}
        >
          <QuoteDocument data={data} siteAddress={siteAddress} clientAddress={clientAddress} />
        </div>
      </div>

      {/* Print version — no wrapper chrome */}
      <div className="hidden print:block">
        <div className="quote-doc" style={{ padding: '15mm 18mm' }}>
          <QuoteDocument data={data} siteAddress={siteAddress} clientAddress={clientAddress} />
        </div>
      </div>
    </>
  )
}

function QuoteDocument({
  data,
  siteAddress,
  clientAddress,
}: {
  data: WrittenQuoteData
  siteAddress: string
  clientAddress: string | null
}) {
  const { issue, job, client, items, subtotal_ex_gst, gst, total_inc_gst } = data

  return (
    <div style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a', lineHeight: 1.6 }}>

      {/* ── Document header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px', fontFamily: 'system-ui, sans-serif' }}>
            RHK
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px', fontFamily: 'system-ui, sans-serif' }}>
            Operations
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '2px', fontFamily: 'system-ui, sans-serif', color: '#111' }}>
            QUOTE
          </div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '4px', fontFamily: 'system-ui, sans-serif' }}>
            <div>Ref: {job.job_number || '—'} · Issue #{issue.issue_number}</div>
            <div>Date: {fmtDate(issue.created_at)}</div>
          </div>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '2px solid #111', marginBottom: '24px' }} />

      {/* ── Client + site details ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div>
          <div style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>
            Prepared for
          </div>
          {client ? (
            <div style={{ fontSize: '13px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{client.name}</div>
              {client.contact_person && (
                <div style={{ color: '#444' }}>Attn: {client.contact_person}</div>
              )}
              {clientAddress && (
                <div style={{ color: '#444', marginTop: '4px', whiteSpace: 'pre-line' }}>{clientAddress}</div>
              )}
              {(client.phone || client.mobile) && (
                <div style={{ color: '#666', marginTop: '4px', fontSize: '12px' }}>
                  {client.phone || client.mobile}
                </div>
              )}
              {client.email && (
                <div style={{ color: '#666', fontSize: '12px' }}>{client.email}</div>
              )}
            </div>
          ) : (
            <div style={{ color: '#aaa', fontSize: '13px' }}>No client on record</div>
          )}
        </div>
        <div>
          {job.title && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>
                Project
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{job.title}</div>
            </div>
          )}
          {siteAddress && (
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>
                Site address
              </div>
              <div style={{ fontSize: '13px', color: '#444' }}>{siteAddress}</div>
            </div>
          )}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #ddd', marginBottom: '32px' }} />

      {/* ── Scope of works ── */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', marginBottom: '20px' }}>
          Scope of works
        </div>

        {items.length === 0 ? (
          <div style={{ color: '#aaa', fontSize: '13px' }}>No items on this quote.</div>
        ) : (
          items.map((item, idx) => (
            <div key={item.id} className="avoid-break" style={{ marginBottom: '14px' }}>
              {/* Item header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif', color: '#999', fontWeight: 600, minWidth: '18px' }}>
                    {idx + 1}.
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'system-ui, sans-serif' }}>
                    {item.name || 'Untitled item'}
                  </span>
                  {item.qty > 1 && (
                    <span style={{ fontSize: '12px', color: '#888', fontFamily: 'system-ui, sans-serif' }}>
                      × {item.qty}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'system-ui, sans-serif' }}>
                  {item.total_ex_gst > 0 ? fmt(item.total_ex_gst) : '—'}
                </span>
              </div>

              {/* Written lines */}
              {item.written_lines.length > 0 ? (
                <ul style={{ margin: '0', padding: '0 0 0 28px', listStyle: 'none' }}>
                  {item.written_lines.map((line, li) => (
                    <li key={li} style={{ fontSize: '13px', color: '#333', marginBottom: '1px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '-16px', color: '#bbb' }}>•</span>
                      {line.text}
                      {line.is_allowance && (
                        <span style={{ marginLeft: '6px', fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
                          (allowance)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: '13px', color: '#bbb', fontStyle: 'italic', margin: '0', paddingLeft: '28px' }}>
                  No description provided.
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #ddd', marginTop: '8px', marginBottom: '28px' }} />

      {/* ── Summary table ── */}
      <div className="avoid-break" style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', marginBottom: '14px' }}>
          Summary
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '6px 0', color: '#555', width: '28px', verticalAlign: 'top', fontFamily: 'system-ui, sans-serif', fontSize: '12px' }}>
                  {idx + 1}.
                </td>
                <td style={{ padding: '6px 8px 6px 0' }}>
                  {item.name || 'Untitled'}
                  {item.qty > 1 && (
                    <span style={{ color: '#999', fontSize: '12px', fontFamily: 'system-ui, sans-serif' }}> × {item.qty}</span>
                  )}
                </td>
                <td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>
                  {item.total_ex_gst > 0 ? fmt(item.total_ex_gst) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ padding: '12px 0 4px', fontSize: '12px', color: '#888', fontFamily: 'system-ui, sans-serif', borderTop: '1px solid #ddd' }}>
                Subtotal (ex GST)
              </td>
              <td style={{ padding: '12px 0 4px', textAlign: 'right', fontFamily: 'system-ui, sans-serif', borderTop: '1px solid #ddd' }}>
                {fmt(subtotal_ex_gst)}
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ padding: '4px 0', fontSize: '12px', color: '#888', fontFamily: 'system-ui, sans-serif' }}>
                GST (10%)
              </td>
              <td style={{ padding: '4px 0', textAlign: 'right', fontFamily: 'system-ui, sans-serif', color: '#555' }}>
                {fmt(gst)}
              </td>
            </tr>
            <tr style={{ borderTop: '2px solid #111' }}>
              <td colSpan={2} style={{ padding: '10px 0 0', fontWeight: 700, fontSize: '15px', fontFamily: 'system-ui, sans-serif' }}>
                Total (inc GST)
              </td>
              <td style={{ padding: '10px 0 0', textAlign: 'right', fontWeight: 700, fontSize: '17px', fontFamily: 'system-ui, sans-serif' }}>
                {fmt(total_inc_gst)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Terms & Conditions ── */}
      {issue.terms_text && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid #ddd', marginBottom: '28px' }} />
          <div className="avoid-break">
            <div style={{ fontSize: '10px', fontFamily: 'system-ui, sans-serif', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', marginBottom: '14px' }}>
              Terms &amp; Conditions
            </div>
            <div style={{ fontSize: '12px', color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {issue.terms_text}
            </div>
          </div>
        </>
      )}

      {/* ── Footer ── */}
      <hr style={{ border: 'none', borderTop: '1px solid #eee', marginTop: '32px', marginBottom: '16px' }} />
      <div style={{ fontSize: '11px', color: '#aaa', fontFamily: 'system-ui, sans-serif', display: 'flex', justifyContent: 'space-between' }}>
        <span>This quote is valid for 30 days from the date of issue.</span>
        <span>{job.job_number} · Issue #{issue.issue_number}</span>
      </div>
    </div>
  )
}
