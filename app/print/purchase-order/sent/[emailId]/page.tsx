'use client'

import { use, useEffect, useState } from 'react'
import { Printer, ArrowLeft } from 'lucide-react'
import { getPOEmailById, POEmail } from '@/lib/purchaseOrderEmails'
import { PODocument } from '@/app/print/purchase-order/[poId]/page'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SentPOPage({ params }: { params: Promise<{ emailId: string }> }) {
  const { emailId } = use(params)
  const [email, setEmail] = useState<POEmail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPOEmailById(emailId)
      .then(setEmail)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [emailId])

  if (loading) return <div className="flex items-center justify-center min-h-screen text-sm text-gray-400">Loading...</div>
  if (error || !email?.po_snapshot) return <div className="flex items-center justify-center min-h-screen text-sm text-red-500">{error || 'Not found'}</div>

  const { po_snapshot: snapshot } = email

  return (
    <>
      <style>{`
        @media print { .no-print { display: none !important; } body { background: white !important; } .report-doc { box-shadow: none !important; margin: 0 !important; } }
        @page { margin: 0; size: A4; }
      `}</style>

      <div className="no-print fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[794px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/purchase-orders" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <ArrowLeft size={14} /> Back
            </a>
            <span className="text-gray-300">|</span>
            <div className="text-xs text-gray-500 space-y-0.5">
              <div>Sent {fmtDate(email.sent_at)}{email.sent_from ? ` by ${email.sent_from}` : ''}</div>
              <div>To: {email.sent_to.join(', ')}</div>
              {email.sent_cc?.length > 0 && <div>CC: {email.sent_cc.join(', ')}</div>}
            </div>
          </div>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors">
            <Printer size={14} /> Save as PDF
          </button>
        </div>
      </div>

      <div className="no-print h-16" />

      {/* Sent-at banner */}
      <div className="no-print bg-amber-50 border-b border-amber-200 py-2 px-6 text-center text-xs text-amber-700">
        This is the version sent on {fmtDate(email.sent_at)} — it may differ from the current PO
      </div>

      <div className="no-print bg-gray-100 min-h-screen py-8">
        <div className="report-doc bg-white mx-auto shadow-lg" style={{ maxWidth: '794px', padding: '20mm 18mm 18mm' }}>
          <PODocument snapshot={snapshot} />
        </div>
      </div>

      <div className="hidden print:block">
        <div className="report-doc" style={{ padding: '14mm 16mm' }}>
          <PODocument snapshot={snapshot} />
        </div>
      </div>
    </>
  )
}
