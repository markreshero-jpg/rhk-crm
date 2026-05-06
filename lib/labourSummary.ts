import { supabase } from './supabase'

function sellPrice(price: number | null, qty: number | null, markup: number | null): number {
  return (price ?? 0) * (qty ?? 0) * (1 + (markup ?? 0) / 100)
}

export type LabourLine = {
  type: string | null
  price: number
  qty: number
  markup_percent: number
  sell_price: number
}

export type LabourItem = {
  id: string
  sort: number
  name: string
  qty: number
  labour: LabourLine[]
  labour_total: number
}

export type LabourSummaryData = {
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
  items: LabourItem[]
  total_hours: number
  total_labour: number
  gst: number
  total_inc_gst: number
}

export async function getLabourSummaryData(issueId: string): Promise<LabourSummaryData> {
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
      .select('id, sort, name, qty, labour:quote_item_labour(sort, type, price, qty, markup_percent)')
      .eq('issue_id', issueId)
      .order('sort', { ascending: true }),
  ])

  if (issueRes.error) throw issueRes.error
  if (itemsRes.error) throw itemsRes.error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = issueRes.data as any
  const job = raw.job
  const client = job?.client ?? null

  let total_hours = 0
  let total_labour = 0

  const allItems: LabourItem[] = (itemsRes.data || []).map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = item as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const labour: LabourLine[] = (r.labour || [])
      .filter((l: { qty: number | null }) => (l.qty ?? 0) > 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => a.sort - b.sort)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((l: any) => ({
        type: l.type,
        price: l.price ?? 0,
        qty: l.qty ?? 0,
        markup_percent: l.markup_percent ?? 0,
        sell_price: sellPrice(l.price, l.qty, l.markup_percent),
      }))

    const itemQty = r.qty ?? 1
    const labourSell = labour.reduce((s, l) => s + l.sell_price, 0)
    const labour_total = labourSell * itemQty
    const item_hours = labour.reduce((s, l) => s + l.qty, 0) * itemQty

    total_hours += item_hours
    total_labour += labour_total

    return { id: r.id, sort: r.sort, name: r.name, qty: itemQty, labour, labour_total }
  })

  // Only include items that have at least one labour line
  const items = allItems.filter((i) => i.labour.length > 0)

  const gst = total_labour * 0.1
  const total_inc_gst = total_labour + gst

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
    total_hours,
    total_labour,
    gst,
    total_inc_gst,
  }
}
