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

export async function duplicateQuoteItem(quoteItemId: string): Promise<QuoteItem> {
  const { data: source, error: srcErr } = await supabase
    .from('quote_items').select('*').eq('id', quoteItemId).single()
  if (srcErr) throw srcErr

  const { data: siblings } = await supabase
    .from('quote_items').select('sort').eq('issue_id', source.issue_id)
    .order('sort', { ascending: false }).limit(1)
  const nextSort = siblings && siblings.length > 0 ? siblings[0].sort + 1 : source.sort + 1

  const { data: newItem, error: newErr } = await supabase
    .from('quote_items')
    .insert({ issue_id: source.issue_id, name: `${source.name || 'Untitled'} (Duplicate)`, qty: source.qty, notes: source.notes, sort: nextSort })
    .select().single()
  if (newErr) throw newErr

  const [{ data: lines }, { data: labour }] = await Promise.all([
    supabase.from('quote_item_lines').select('*').eq('quote_item_id', quoteItemId).order('sort', { ascending: true }),
    supabase.from('quote_item_labour').select('*').eq('quote_item_id', quoteItemId).order('sort', { ascending: true }),
  ])

  if (lines && lines.length > 0) {
    await supabase.from('quote_item_lines').insert(
      lines.map((l) => ({ quote_item_id: newItem.id, sort: l.sort, item: l.item, description: l.description, written_quote_text: l.written_quote_text, supplier_id: l.supplier_id, item_code: l.item_code, price: l.price, qty: l.qty, markup_percent: l.markup_percent, is_allowance: l.is_allowance }))
    )
  }

  if (labour && labour.length > 0) {
    await supabase.from('quote_item_labour').insert(
      labour.map((l) => ({ quote_item_id: newItem.id, sort: l.sort, type: l.type, price: l.price, qty: l.qty, markup_percent: l.markup_percent }))
    )
  }

  return newItem
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