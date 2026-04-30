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
    item.sort = maxSort + 10
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

// Renumber sort values to clean increments (10, 20, 30...)
export async function renumberQuoteItems(issueId: string): Promise<void> {
  const items = await getQuoteItemsByIssueId(issueId)
  for (let i = 0; i < items.length; i++) {
    await updateQuoteItem(items[i].id, { sort: (i + 1) * 10 })
  }
}
