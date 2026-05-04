import { supabase } from './supabase'

export type QuoteItem = {
  id: string
  created_at: string
  updated_at: string
  issue_id: string
  sort: number
  name: string
  qty: number
  notes: string | null
}

export async function getQuoteItemsByIssueId(issueId: string): Promise<QuoteItem[]> {
  const { data, error } = await supabase
    .from('quote_items')
    .select('*')
    .eq('issue_id', issueId)
    .order('sort', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createQuoteItem(item: Partial<QuoteItem>): Promise<QuoteItem> {
  // If sort isn't provided, place new item at the end
  if (item.sort === undefined && item.issue_id) {
    const existing = await getQuoteItemsByIssueId(item.issue_id)
    const maxSort = existing.length > 0
      ? Math.max(...existing.map((i) => i.sort))
      : 0
    item.sort = maxSort + 1
  }

  const { data, error } = await supabase
    .from('quote_items')
    .insert(item)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateQuoteItem(id: string, item: Partial<QuoteItem>): Promise<QuoteItem> {
  const { data, error } = await supabase
    .from('quote_items')
    .update(item)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteQuoteItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('quote_items')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function renumberQuoteItems(issueId: string): Promise<void> {
  const items = await getQuoteItemsByIssueId(issueId)
  for (let i = 0; i < items.length; i++) {
    await updateQuoteItem(items[i].id, { sort: i + 1 })
  }
}
// ----- Per-item totals -----

type RawLine = { price: number | null; qty: number | null; markup_percent: number | null }

function lineSellPrice(l: RawLine): number {
  return (l.price ?? 0) * (l.qty ?? 0) * (1 + (l.markup_percent ?? 0) / 100)
}

export type QuoteItemWithTotal = QuoteItem & { total_ex_gst: number }

export async function getQuoteItemsWithTotals(issueId: string): Promise<QuoteItemWithTotal[]> {
  const { data, error } = await supabase
    .from('quote_items')
    .select('*, lines:quote_item_lines(price, qty, markup_percent), labour:quote_item_labour(price, qty, markup_percent)')
    .eq('issue_id', issueId)
    .order('sort', { ascending: true })

  if (error) throw error

  return (data || []).map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = item as any
    const linesTotal  = (raw.lines  || []).reduce((s: number, l: RawLine) => s + lineSellPrice(l), 0)
    const labourTotal = (raw.labour || []).reduce((s: number, l: RawLine) => s + lineSellPrice(l), 0)
    const total_ex_gst = (linesTotal + labourTotal) * (raw.qty ?? 1)
    return {
      id: raw.id, created_at: raw.created_at, updated_at: raw.updated_at,
      issue_id: raw.issue_id, sort: raw.sort, name: raw.name, qty: raw.qty,
      notes: raw.notes, total_ex_gst,
    } as QuoteItemWithTotal
  })
}

export type QuoteItemWithContext = QuoteItem & {
    issue: {
      id: string
      issue_number: number
      job: {
        id: string
        job_number: string
        title: string | null
      }
    }
  }
  
  export async function getQuoteItemById(id: string): Promise<QuoteItemWithContext | null> {
    const { data, error } = await supabase
      .from('quote_items')
      .select('*, issue:issues(id, issue_number, job:jobs(id, job_number, title))')
      .eq('id', id)
      .single()
  
    if (error) throw error
    return data as QuoteItemWithContext
  }