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

export async function deleteQuoteItemTemplate(id: string): Promise<void> {
  // Soft delete — keeps templates referenced from older quote items working
  const { error } = await supabase
    .from('quote_item_templates')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}