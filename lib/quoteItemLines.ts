import { supabase } from './supabase'

export type QuoteItemLine = {
  id: string
  created_at: string
  updated_at: string
  quote_item_id: string
  sort: number
  item: string | null
  description: string | null
  written_quote_text: string | null
  supplier_id: string | null
  item_code: string | null
  price: number
  qty: number
  markup_percent: number
  is_allowance: boolean
}

export async function getQuoteItemLinesByQuoteItemId(quoteItemId: string): Promise<QuoteItemLine[]> {
  const { data, error } = await supabase
    .from('quote_item_lines')
    .select('*')
    .eq('quote_item_id', quoteItemId)
    .order('sort', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createQuoteItemLine(line: Partial<QuoteItemLine>): Promise<QuoteItemLine> {
  // Auto-place at end if sort not specified
  if (line.sort === undefined && line.quote_item_id) {
    const existing = await getQuoteItemLinesByQuoteItemId(line.quote_item_id)
    const maxSort = existing.length > 0 ? Math.max(...existing.map((l) => l.sort)) : 0
    line.sort = maxSort + 10
  }

  const { data, error } = await supabase
    .from('quote_item_lines')
    .insert(line)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateQuoteItemLine(id: string, line: Partial<QuoteItemLine>): Promise<QuoteItemLine> {
  const { data, error } = await supabase
    .from('quote_item_lines')
    .update(line)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteQuoteItemLine(id: string): Promise<void> {
  const { error } = await supabase
    .from('quote_item_lines')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function renumberQuoteItemLines(quoteItemId: string): Promise<void> {
  const lines = await getQuoteItemLinesByQuoteItemId(quoteItemId)
  for (let i = 0; i < lines.length; i++) {
    await updateQuoteItemLine(lines[i].id, { sort: (i + 1) * 10 })
  }
}

// ----- Calculation helpers -----

export function lineSubtotal(line: QuoteItemLine): number {
  return (line.price || 0) * (line.qty || 0)
}

export function lineSubtotalWithMarkup(line: QuoteItemLine): number {
  const sub = lineSubtotal(line)
  return sub * (1 + (line.markup_percent || 0) / 100)
}

export function lineGst(line: QuoteItemLine): number {
  return lineSubtotalWithMarkup(line) * 0.10
}

export function lineTotal(line: QuoteItemLine): number {
  return lineSubtotalWithMarkup(line) + lineGst(line)
}