'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getQuoteItemById,
  getQuoteItemsByIssueId,
  createQuoteItem,
  updateQuoteItem,
  QuoteItemWithContext,
  QuoteItem,
} from '@/lib/quoteItems'
import QuoteItemDetail from '@/components/QuoteItemDetail'

export default function QuoteItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>
}) {
  const { itemId } = use(params)
  const router = useRouter()
  const [item, setItem] = useState<QuoteItemWithContext | null>(null)
  const [siblings, setSiblings] = useState<QuoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadItem = useCallback(async () => {
    try {
      const data = await getQuoteItemById(itemId)
      setItem(data)
      if (data) {
        const all = await getQuoteItemsByIssueId(data.issue.id)
        setSiblings(all)
      }
      setLoading(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load'
      setError(message)
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => {
    loadItem()
  }, [loadItem])

  async function handleUpdateField(field: 'name' | 'qty' | 'notes', value: string | number) {
    await updateQuoteItem(itemId, { [field]: value })
    await loadItem()
  }

  async function handleNewItem(name: string) {
    if (!item) return
    const newItem = await createQuoteItem({ issue_id: item.issue.id, name, qty: 1 })
    router.push(`/quote-items/${newItem.id}`)
  }

  if (loading) {
    return (
      <div className="p-10">
        <p className="text-text-subtle text-sm">Loading...</p>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="p-10">
        <p className="text-danger text-sm">{error || 'Quote item not found'}</p>
        <Link href="/jobs" className="text-sm underline mt-4 inline-block">
          Back to jobs
        </Link>
      </div>
    )
  }

  return (
    <div className="p-10 max-w-[1800px]">
      <QuoteItemDetail
        item={item}
        onUpdateField={handleUpdateField}
        siblings={siblings}
        onNewItem={handleNewItem}
      />
    </div>
  )
}
