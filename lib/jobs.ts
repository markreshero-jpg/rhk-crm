import { supabase } from './supabase'

export type JobStatus =
  | 'Inquiry'
  | 'Quote Sent'
  | 'Quote Accepted'
  | 'Was Not Quoted'
  | 'In Production'
  | 'Completed'
  | 'Cancelled'

export type Job = {
  id: string
  created_at: string
  updated_at: string
  client_id: string
  job_number: string
  title: string | null
  status: JobStatus | null
  site_address_line_1: string | null
  site_address_line_2: string | null
  site_suburb: string | null
  site_city: string | null
  site_postcode: string | null
  same_as_client_address: boolean
  notes: string | null
  internal_notes: string | null
}

export type JobWithClient = Job & {
  client: {
    id: string
    name: string
  } | null
}

export async function getAllJobs(): Promise<JobWithClient[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*, client:clients(id, name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as JobWithClient[]) || []
}

export async function searchJobs(query: string): Promise<JobWithClient[]> {
  if (!query.trim()) return getAllJobs()

  const { data: clientMatches } = await supabase
    .from('clients')
    .select('id')
    .ilike('name', `%${query}%`)

  const clientIds = (clientMatches || []).map((c) => c.id)

  const orFilter = [
    `job_number.ilike.%${query}%`,
    `title.ilike.%${query}%`,
    `site_suburb.ilike.%${query}%`,
    ...(clientIds.length > 0 ? [`client_id.in.(${clientIds.join(',')})`] : []),
  ].join(',')

  const { data, error } = await supabase
    .from('jobs')
    .select('*, client:clients(id, name)')
    .or(orFilter)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as JobWithClient[]) || []
}

export async function getJobById(id: string): Promise<JobWithClient | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*, client:clients(id, name)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as JobWithClient
}

export async function createJob(job: Partial<Job>): Promise<Job> {
  const { data, error } = await supabase
    .from('jobs')
    .insert(job)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateJob(id: string, job: Partial<Job>): Promise<Job> {
  const { data, error } = await supabase
    .from('jobs')
    .update(job)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', id)

  if (error) throw error
}
export async function getJobsByClientId(clientId: string): Promise<JobWithClient[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, client:clients(id, name)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
  
    if (error) throw error
    return (data as JobWithClient[]) || []
  }