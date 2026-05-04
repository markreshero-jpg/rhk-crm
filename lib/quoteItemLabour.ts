import { supabase } from './supabase'

export type QuoteItemLabour = {
  id: string
  created_at: string
  updated_at: string
  quote_item_id: string
  sort: number
  type: string
  price: number
  qty: number
  markup_percent: number
}

export async function getLabourByQuoteItemId(quoteItemId: string): Promise<QuoteItemLabour[]> {
  const { data, error } = await supabase
    .from('quote_item_labour')
    .select('*')
    .eq('quote_item_id', quoteItemId)
    .order('sort', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createLabour(labour: Partial<QuoteItemLabour>): Promise<QuoteItemLabour> {
  if (labour.sort === undefined && labour.quote_item_id) {
    const existing = await getLabourByQuoteItemId(labour.quote_item_id)
    const maxSort = existing.length > 0 ? Math.max(...existing.map((l) => l.sort)) : 0
    labour.sort = maxSort + 1
  }

  const { data, error } = await supabase
    .from('quote_item_labour')
    .insert(labour)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateLabour(id: string, labour: Partial<QuoteItemLabour>): Promise<QuoteItemLabour> {
  const { data, error } = await supabase
    .from('quote_item_labour')
    .update(labour)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLabour(id: string): Promise<void> {
  const { error } = await supabase
    .from('quote_item_labour')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function renumberLabour(quoteItemId: string): Promise<void> {
  const labour = await getLabourByQuoteItemId(quoteItemId)
  for (let i = 0; i < labour.length; i++) {
    await updateLabour(labour[i].id, { sort: i + 1 })
  }
}

// ----- Calculation helpers -----

export function labourSubtotal(l: QuoteItemLabour): number {
  return (l.price || 0) * (l.qty || 0)
}

export function labourSubtotalWithMarkup(l: QuoteItemLabour): number {
  const sub = labourSubtotal(l)
  return sub * (1 + (l.markup_percent || 0) / 100)
}

export function labourGst(l: QuoteItemLabour): number {
  return labourSubtotalWithMarkup(l) * 0.10
}

export function labourTotal(l: QuoteItemLabour): number {
  return labourSubtotalWithMarkup(l) + labourGst(l)
}