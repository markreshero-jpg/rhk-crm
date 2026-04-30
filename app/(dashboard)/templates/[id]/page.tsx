'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import {
  getQuoteItemTemplateById,
  updateQuoteItemTemplate,
  QuoteItemTemplate,
} from '@/lib/quoteItemTemplates'
import QuoteItemTemplateDetail from '@/components/templates/QuoteItemTemplateDetail'

export default function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [template, setTemplate] = useState<QuoteItemTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getQuoteItemTemplateById(id)
      setTemplate(data)
      setLoading(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load'
      setError(message)
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleUpdate(field: keyof QuoteItemTemplate, value: string | null) {
    await updateQuoteItemTemplate(id, { [field]: value })
    await load()
  }

  if (loading) return <div className="p-10"><p className="text-text-subtle text-sm">Loading...</p></div>
  if (error || !template) {
    return (
      <div className="p-10">
        <p className="text-danger text-sm">{error || 'Template not found'}</p>
        <Link href="/templates" className="text-sm underline mt-4 inline-block">Back to templates</Link>
      </div>
    )
  }

  return (
    <div className="p-10 max-w-[1400px]">
      <Link
        href="/templates"
        className="inline-flex items-center gap-1 text-xs text-text-subtle hover:text-text mb-4"
      >
        <ChevronLeft size={14} /> Back to templates
      </Link>

      <p className="text-xs uppercase tracking-widest text-text-subtle mb-2">Template</p>

      <QuoteItemTemplateDetail template={template} onUpdate={handleUpdate} />
    </div>
  )
}