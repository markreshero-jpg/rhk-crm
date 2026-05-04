import { supabase } from './supabase'

export type LabourTemplate = {
  id: string
  created_at: string
  updated_at: string
  parent_template_id: string | null
  sort: number
  type: string
  price: number
  qty: number
  markup_percent: number
  is_active: boolean
  category: string | null
}

export async function getLabourByParentId(parentId: string): Promise<LabourTemplate[]> {
  const { data, error } = await supabase
    .from('labour_line_templates')
    .select('*')
    .eq('parent_template_id', parentId)
    .eq('is_active', true)
    .order('sort', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getStandaloneLabour(): Promise<LabourTemplate[]> {
  const { data, error } = await supabase
    .from('labour_line_templates')
    .select('*')
    .is('parent_template_id', null)
    .eq('is_active', true)
    .order('sort', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createLabourTemplate(l: Partial<LabourTemplate>): Promise<LabourTemplate> {
  if (l.sort === undefined) {
    let existing: LabourTemplate[]
    if (l.parent_template_id) {
      existing = await getLabourByParentId(l.parent_template_id)
    } else {
      existing = await getStandaloneLabour()
    }
    const maxSort = existing.length > 0 ? Math.max(...existing.map((x) => x.sort)) : 0
    l.sort = maxSort + 1
  }

  const { data, error } = await supabase
    .from('labour_line_templates')
    .insert(l)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateLabourTemplate(id: string, l: Partial<LabourTemplate>): Promise<LabourTemplate> {
  const { data, error } = await supabase
    .from('labour_line_templates')
    .update(l)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLabourTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('labour_line_templates')
    .delete()
    .eq('id', id)

  if (error) throw error
}