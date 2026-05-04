import { supabase } from './supabase'

export type TermsTemplate = {
  id: string
  created_at: string
  updated_at: string
  sort: number
  title: string
  body: string
  category: string | null
  is_active: boolean
}

export async function getAllTermsTemplates(): Promise<TermsTemplate[]> {
  const { data, error } = await supabase
    .from('terms_templates')
    .select('*')
    .eq('is_active', true)
    .order('sort', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createTermsTemplate(t: Partial<TermsTemplate>): Promise<TermsTemplate> {
  const { data, error } = await supabase
    .from('terms_templates')
    .insert(t)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTermsTemplate(id: string, t: Partial<TermsTemplate>): Promise<TermsTemplate> {
  const { data, error } = await supabase
    .from('terms_templates')
    .update(t)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTermsTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('terms_templates')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}
