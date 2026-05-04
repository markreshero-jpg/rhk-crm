import { supabase } from './supabase'

type RawLine = {
  sort: number
  written_quote_text: string | null
  price: number | null
  qty: number | null
  markup_percent: number | null
  is_allowance: boolean
}

type RawLabour = {
  price: number | null
  qty: number | null
  markup_percent: number | null
}

function sellPrice(price: number | null, qty: number | null, markup: number | null): number {
  return (price ?? 0) * (qty ?? 0) * (1 + (markup ?? 0) / 100)
}

export type WrittenQuoteLine = {
  sort: number
  text: string
  is_allowance: boolean
}

export type WrittenQuoteItem = {
  id: string
  sort: number
  name: string
  qty: number
  total_ex_gst: number
  written_lines: WrittenQuoteLine[]
}

export type WrittenQuoteData = {
  issue: {
    id: string
    issue_number: number
    status: string
    terms_text: string | null
    created_at: string
  }
  job: {
    id: string
    job_number: string
    title: string | null
    site_address_line_1: string | null
    site_address_line_2: string | null
    site_suburb: string | null
    site_postcode: string | null
  }
  client: {
    name: string
    contact_person: string | null
    email: string | null
    phone: string | null
    mobile: string | null
    address_line_1: string | null
    address_line_2: string | null
    suburb: string | null
    postcode: string | null
  } | null
  items: WrittenQuoteItem[]
  subtotal_ex_gst: number
  gst: number
  total_inc_gst: number
}

export async function getWrittenQuoteData(issueId: string): Promise<WrittenQuoteData> {
  const [issueRes, itemsRes] = await Promise.all([
    supabase
      .from('issues')
      .select(`
        id, issue_number, status, terms_text, created_at,
        job:jobs(
          id, job_number, title,
          site_address_line_1, site_address_line_2, site_suburb, site_postcode,
          client:clients(name, contact_person, email, phone, mobile, address_line_1, address_line_2, suburb, postcode)
        )
      `)
      .eq('id', issueId)
      .single(),
    supabase
      .from('quote_items')
      .select(`
        id, sort, name, qty,
        lines:quote_item_lines(sort, written_quote_text, price, qty, markup_percent, is_allowance),
        labour:quote_item_labour(price, qty, markup_percent)
      `)
      .eq('issue_id', issueId)
      .order('sort', { ascending: true }),
  ])

  if (issueRes.error) throw issueRes.error
  if (itemsRes.error) throw itemsRes.error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = issueRes.data as any
  const job = raw.job
  const client = job?.client ?? null

  const items: WrittenQuoteItem[] = (itemsRes.data || []).map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = item as any
    const lines: RawLine[] = r.lines || []
    const labour: RawLabour[] = r.labour || []

    const linesTotal  = lines.reduce((s, l) => s + sellPrice(l.price, l.qty, l.markup_percent), 0)
    const labourTotal = labour.reduce((s, l) => s + sellPrice(l.price, l.qty, l.markup_percent), 0)
    const total_ex_gst = (linesTotal + labourTotal) * (r.qty ?? 1)

    const written_lines: WrittenQuoteLine[] = lines
      .filter((l) => l.written_quote_text?.trim())
      .sort((a, b) => a.sort - b.sort)
      .map((l) => ({
        sort: l.sort,
        text: l.written_quote_text!.trim(),
        is_allowance: l.is_allowance ?? false,
      }))

    return { id: r.id, sort: r.sort, name: r.name, qty: r.qty, total_ex_gst, written_lines }
  })

  const subtotal_ex_gst = items.reduce((s, i) => s + i.total_ex_gst, 0)
  const gst             = subtotal_ex_gst * 0.1
  const total_inc_gst   = subtotal_ex_gst + gst

  return {
    issue: {
      id: raw.id,
      issue_number: raw.issue_number,
      status: raw.status,
      terms_text: raw.terms_text,
      created_at: raw.created_at,
    },
    job: {
      id: job?.id,
      job_number: job?.job_number,
      title: job?.title,
      site_address_line_1: job?.site_address_line_1,
      site_address_line_2: job?.site_address_line_2,
      site_suburb: job?.site_suburb,
      site_postcode: job?.site_postcode,
    },
    client,
    items,
    subtotal_ex_gst,
    gst,
    total_inc_gst,
  }
}
