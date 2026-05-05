import { supabase } from './supabase'

export type QuoteItemTemplate = {
  id: string
  created_at: string
  updated_at: string
  name: string
  description: string | null
  category: string | null
  is_active: boolean
}

export async function getAllQuoteItemTemplates(): Promise<QuoteItemTemplate[]> {
  const { data, error } = await supabase
    .from('quote_item_templates')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getQuoteItemTemplateById(id: string): Promise<QuoteItemTemplate | null> {
  const { data, error } = await supabase
    .from('quote_item_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createQuoteItemTemplate(t: Partial<QuoteItemTemplate>): Promise<QuoteItemTemplate> {
  const { data, error } = await supabase
    .from('quote_item_templates')
    .insert(t)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateQuoteItemTemplate(id: string, t: Partial<QuoteItemTemplate>): Promise<QuoteItemTemplate> {
  const { data, error } = await supabase
    .from('quote_item_templates')
    .update(t)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function saveQuoteItemAsTemplate(
  quoteItemId: string,
  templateName: string
): Promise<QuoteItemTemplate> {
  const template = await createQuoteItemTemplate({ name: templateName, is_active: true })

  const [{ data: lines }, { data: labour }] = await Promise.all([
    supabase.from('quote_item_lines').select('*').eq('quote_item_id', quoteItemId).order('sort', { ascending: true }),
    supabase.from('quote_item_labour').select('*').eq('quote_item_id', quoteItemId).order('sort', { ascending: true }),
  ])

  if (lines && lines.length > 0) {
    const { error } = await supabase.from('quote_item_line_templates').insert(
      lines.map((l) => ({
        parent_template_id: template.id,
        sort: l.sort,
        item: l.item,
        description: l.description,
        written_quote_text: l.written_quote_text,
        supplier_id: l.supplier_id,
        item_code: l.item_code,
        price: l.price,
        qty: l.qty,
        markup_percent: l.markup_percent,
        is_allowance: l.is_allowance,
        is_active: true,
      }))
    )
    if (error) throw error
  }

  if (labour && labour.length > 0) {
    const { error } = await supabase.from('labour_line_templates').insert(
      labour.map((l) => ({
        parent_template_id: template.id,
        sort: l.sort,
        type: l.type,
        price: l.price,
        qty: l.qty,
        markup_percent: l.markup_percent,
        is_active: true,
      }))
    )
    if (error) throw error
  }

  return template
}

export async function deleteQuoteItemTemplate(id: string): Promise<void> {
  // Soft delete — keeps templates referenced from older quote items working
  const { error } = await supabase
    .from('quote_item_templates')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}

export async function importTemplateToIssue(
  templateId: string,
  issueId: string,
  name: string
): Promise<string> {
  // Find next sort position in the issue
  const { data: existing, error: sortError } = await supabase
    .from('quote_items')
    .select('sort')
    .eq('issue_id', issueId)
    .order('sort', { ascending: false })
    .limit(1)

  if (sortError) throw sortError
  const nextSort = existing && existing.length > 0 ? existing[0].sort + 1 : 1

  // Create the quote item
  const { data: quoteItem, error: itemError } = await supabase
    .from('quote_items')
    .insert({ issue_id: issueId, name, sort: nextSort, qty: 1 })
    .select()
    .single()

  if (itemError) throw itemError

  // Fetch material lines and labour lines in parallel
  const [
    { data: templateLines, error: linesError },
    { data: labourLines, error: labourError },
  ] = await Promise.all([
    supabase
      .from('quote_item_line_templates')
      .select('*')
      .eq('parent_template_id', templateId)
      .eq('is_active', true)
      .order('sort', { ascending: true }),
    supabase
      .from('labour_line_templates')
      .select('*')
      .eq('parent_template_id', templateId)
      .eq('is_active', true)
      .order('sort', { ascending: true }),
  ])

  if (linesError) throw linesError
  if (labourError) throw labourError

  // Bulk-insert material lines
  if (templateLines && templateLines.length > 0) {
    const { error: insertError } = await supabase
      .from('quote_item_lines')
      .insert(
        templateLines.map((tl) => ({
          quote_item_id: quoteItem.id,
          sort: tl.sort,
          item: tl.item,
          description: tl.description,
          written_quote_text: tl.written_quote_text,
          supplier_id: tl.supplier_id,
          item_code: tl.item_code,
          price: tl.price,
          qty: tl.qty,
          markup_percent: tl.markup_percent,
          is_allowance: tl.is_allowance,
        }))
      )
    if (insertError) throw insertError
  }

  // Bulk-insert labour lines
  if (labourLines && labourLines.length > 0) {
    const { error: insertError } = await supabase
      .from('quote_item_labour')
      .insert(
        labourLines.map((ll) => ({
          quote_item_id: quoteItem.id,
          sort: ll.sort,
          type: ll.type,
          price: ll.price,
          qty: ll.qty,
          markup_percent: ll.markup_percent,
        }))
      )
    if (insertError) throw insertError
  }

  return quoteItem.id
}