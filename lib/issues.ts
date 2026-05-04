import { supabase } from './supabase'

export type IssueStatus = 'Draft' | 'Sent' | 'Accepted' | 'Locked' | 'Superseded'

export type Issue = {
  id: string
  created_at: string
  updated_at: string
  job_id: string
  issue_number: number
  name: string | null
  status: IssueStatus
  quoted_by: string | null
  terms_text: string | null
  notes: string | null
  total_ex_gst: number | null
  total_inc_gst: number | null
  accepted_at: string | null
}

export async function getIssuesByJobId(jobId: string): Promise<Issue[]> {
  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .eq('job_id', jobId)
    .order('issue_number', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getIssueById(id: string): Promise<Issue | null> {
  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createIssue(issue: Partial<Issue>): Promise<Issue> {
  const { data, error } = await supabase
    .from('issues')
    .insert(issue)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function duplicateIssue(sourceIssueId: string): Promise<Issue> {
  // 1. Load source issue
  const source = await getIssueById(sourceIssueId)
  if (!source) throw new Error('Source issue not found')

  // 2. Create new issue (issue_number auto-generates)
  const { data: newIssue, error: newIssueError } = await supabase
    .from('issues')
    .insert({
      job_id: source.job_id,
      status: 'Draft',
      quoted_by: source.quoted_by,
      terms_text: source.terms_text,
      notes: source.notes,
    })
    .select()
    .single()

  if (newIssueError) throw newIssueError

  // 3. Load source quote items
  const { data: sourceItems, error: itemsError } = await supabase
    .from('quote_items')
    .select('*')
    .eq('issue_id', sourceIssueId)

  if (itemsError) throw itemsError

  // 4. For each source item, create a copy under the new issue,
  //    then copy its lines and labour
  for (const sourceItem of sourceItems || []) {
    const { data: newItem, error: itemError } = await supabase
      .from('quote_items')
      .insert({
        issue_id: newIssue.id,
        sort: sourceItem.sort,
        name: sourceItem.name,
        qty: sourceItem.qty,
        notes: sourceItem.notes,
      })
      .select()
      .single()

    if (itemError) throw itemError

    // Copy lines
    const { data: sourceLines } = await supabase
      .from('quote_item_lines')
      .select('*')
      .eq('quote_item_id', sourceItem.id)

    if (sourceLines && sourceLines.length > 0) {
      const newLines = sourceLines.map((line) => ({
        quote_item_id: newItem.id,
        sort: line.sort,
        item: line.item,
        description: line.description,
        written_quote_text: line.written_quote_text,
        supplier_id: line.supplier_id,
        item_code: line.item_code,
        price: line.price,
        qty: line.qty,
        markup_percent: line.markup_percent,
        is_allowance: line.is_allowance,
      }))
      await supabase.from('quote_item_lines').insert(newLines)
    }

    // Copy labour
    const { data: sourceLabour } = await supabase
      .from('quote_item_labour')
      .select('*')
      .eq('quote_item_id', sourceItem.id)

    if (sourceLabour && sourceLabour.length > 0) {
      const newLabour = sourceLabour.map((lab) => ({
        quote_item_id: newItem.id,
        sort: lab.sort,
        type: lab.type,
        price: lab.price,
        qty: lab.qty,
        markup_percent: lab.markup_percent,
      }))
      await supabase.from('quote_item_labour').insert(newLabour)
    }
  }

  return newIssue
}

export async function updateIssue(id: string, issue: Partial<Issue>): Promise<Issue> {
  const { data, error } = await supabase
    .from('issues')
    .update(issue)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteIssue(id: string): Promise<void> {
  const { error } = await supabase
    .from('issues')
    .delete()
    .eq('id', id)

  if (error) throw error
}