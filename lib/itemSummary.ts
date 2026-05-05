import { supabase } from './supabase'

function sellPrice(price: number | null, qty: number | null, markup: number | null): number {
  return (price ?? 0) * (qty ?? 0) * (1 + (markup ?? 0) / 100)
}

export type SummaryLine = {
  sort: number
  item: string | null
  description: string | null
  item_code: string | null
  supplier_name: string | null
  price: number
  qty: number
  markup_percent: number
  sell_price: number
  is_allowance: boolean
}

export type SummaryLabour = {
  sort: number
  type: string | null
  price: number
  qty: number
  markup_percent: number
  sell_price: number
}

export type SummaryItem = {
  id: string
  sort: number
  name: string
  qty: number
  lines: SummaryLine[]
  labour: SummaryLabour[]
  materials_total: number
  labour_total: number
  total_ex_gst: number
}

export type ItemSummaryData = {
  issue: {
    id: string
    issue_number: number
    status: string
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
  } | null
  items: SummaryItem[]
  total_materials: number
  total_labour: number
  subtotal_ex_gst: number
  gst: number
  total_inc_gst: number
}

export async function getItemSummaryData(issueId: string): Promise<ItemSummaryData> {
  const [issueRes, itemsRes] = await Promise.all([
    supabase
      .from('issues')
      .select(`
        id, issue_number, status, created_at,
        job:jobs(
          id, job_number, title,
          site_address_line_1, site_address_line_2, site_suburb, site_postcode,
          client:clients(name, contact_person)
        )
      `)
      .eq('id', issueId)
      .single(),
    supabase
      .from('quote_items')
      .select(`
        id, sort, name, qty,
        lines:quote_item_lines(sort, item, description, item_code, price, qty, markup_percent, is_allowance, supplier:suppliers(company_name)),
        labour:quote_item_labour(sort, type, price, qty, markup_percent)
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

  let total_materials = 0
  let total_labour = 0

  const items: SummaryItem[] = (itemsRes.data || []).map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = item as any

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lines: SummaryLine[] = (r.lines || []).filter((l: any) => (l.qty ?? 0) > 0).sort((a: any, b: any) => a.sort - b.sort).map((l: any) => ({
      sort: l.sort,
      item: l.item,
      description: l.description,
      item_code: l.item_code,
      supplier_name: l.supplier?.company_name ?? null,
      price: l.price ?? 0,
      qty: l.qty ?? 0,
      markup_percent: l.markup_percent ?? 0,
      sell_price: sellPrice(l.price, l.qty, l.markup_percent),
      is_allowance: l.is_allowance ?? false,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const labour: SummaryLabour[] = (r.labour || []).filter((l: any) => (l.qty ?? 0) > 0).sort((a: any, b: any) => a.sort - b.sort).map((l: any) => ({
      sort: l.sort,
      type: l.type,
      price: l.price ?? 0,
      qty: l.qty ?? 0,
      markup_percent: l.markup_percent ?? 0,
      sell_price: sellPrice(l.price, l.qty, l.markup_percent),
    }))

    const linesTotal = lines.reduce((s, l) => s + l.sell_price, 0)
    const labourTotal = labour.reduce((s, l) => s + l.sell_price, 0)
    const materials_total = linesTotal * (r.qty ?? 1)
    const labour_total = labourTotal * (r.qty ?? 1)

    total_materials += materials_total
    total_labour += labour_total

    return {
      id: r.id,
      sort: r.sort,
      name: r.name,
      qty: r.qty ?? 1,
      lines,
      labour,
      materials_total,
      labour_total,
      total_ex_gst: materials_total + labour_total,
    }
  })

  const subtotal_ex_gst = total_materials + total_labour
  const gst = subtotal_ex_gst * 0.1
  const total_inc_gst = subtotal_ex_gst + gst

  return {
    issue: { id: raw.id, issue_number: raw.issue_number, status: raw.status, created_at: raw.created_at },
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
    total_materials,
    total_labour,
    subtotal_ex_gst,
    gst,
    total_inc_gst,
  }
}
