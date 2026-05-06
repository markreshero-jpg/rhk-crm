import { supabase } from './supabase'

export type POAttachment = {
  id: string
  purchase_order_id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  uploaded_at: string
  signed_url?: string | null
}

export async function getPOAttachments(poId: string): Promise<POAttachment[]> {
  const { data, error } = await supabase
    .from('purchase_order_attachments')
    .select('*')
    .eq('purchase_order_id', poId)
    .order('uploaded_at', { ascending: true })
  if (error) throw error
  const attachments = data || []
  if (attachments.length === 0) return []

  const { data: urls } = await supabase.storage
    .from('po-attachments')
    .createSignedUrls(attachments.map((a) => a.file_path), 3600)

  return attachments.map((a, i) => ({
    ...a,
    signed_url: urls?.[i]?.signedUrl ?? null,
  }))
}

export async function uploadPOAttachment(poId: string, file: File): Promise<POAttachment> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${poId}/${Date.now()}-${safeName}`

  const { error: uploadErr } = await supabase.storage
    .from('po-attachments')
    .upload(path, file, { contentType: file.type })
  if (uploadErr) throw uploadErr

  const { data, error } = await supabase
    .from('purchase_order_attachments')
    .insert({
      purchase_order_id: poId,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      mime_type: file.type || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePOAttachment(id: string, filePath: string): Promise<void> {
  await supabase.storage.from('po-attachments').remove([filePath])
  const { error } = await supabase.from('purchase_order_attachments').delete().eq('id', id)
  if (error) throw error
}

export async function getPOAttachmentsByIds(ids: string[]): Promise<POAttachment[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('purchase_order_attachments')
    .select('*')
    .in('id', ids)
  if (error) throw error
  return data || []
}

export function fmtFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
