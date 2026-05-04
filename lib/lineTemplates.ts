import { supabase } from './supabase'

export type LineTemplate = {
  id: string
  created_at: string
  updated_at: string
  parent_template_id: string | null
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
  is_active: boolean
  category: string | null
}

// Get lines belonging to a parent template
export async function getLinesByParentId(parentId: string): Promise<LineTemplate[]> {
  const { data, error } = await supabase
    .from('quote_item_line_templates')
    .select('*')
    .eq('parent_template_id', parentId)
    .eq('is_active', true)
    .order('sort', { ascending: true })

  if (error) throw error
  return data || []
}

// Get all standalone library lines (no parent)
export async function getStandaloneLines(): Promise<LineTemplate[]> {
  const { data, error } = await supabase
    .from('quote_item_line_templates')
    .select('*')
    .is('parent_template_id', null)
    .eq('is_active', true)
    .order('sort', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createLineTemplate(line: Partial<LineTemplate>): Promise<LineTemplate> {
  // Auto-place at end if sort missing
  if (line.sort === undefined) {
    let existing: LineTemplate[]
    if (line.parent_template_id) {
      existing = await getLinesByParentId(line.parent_template_id)
    } else {
      existing = await getStandaloneLines()
    }
    const maxSort = existing.length > 0 ? Math.max(...existing.map((l) => l.sort)) : 0
    line.sort = maxSort + 1
  }

  const { data, error } = await supabase
    .from('quote_item_line_templates')
    .insert(line)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateLineTemplate(id: string, line: Partial<LineTemplate>): Promise<LineTemplate> {
  const { data, error } = await supabase
    .from('quote_item_line_templates')
    .update(line)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLineTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('quote_item_line_templates')
    .delete()
    .eq('id', id)

  if (error) throw error
}