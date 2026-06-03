const KLAVIYO_BASE = 'https://a.klaviyo.com/api'
const REVISION = '2024-10-15'

export type RetentionStatus = 'active' | 'at_risk' | 'churned' | 'unknown'

export interface CustomerSummary {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  name: string
  location: string | null
  lastEventDate: string | null
  retentionStatus: RetentionStatus
  historicClv: number | null
  predictedClv: number | null
  churnProbability: number | null
  createdAt: string | null
}

export interface TimelineEventContent {
  subject?: string | null
  campaignName?: string | null
  messageType?: string | null
  listName?: string | null
  url?: string | null
  formId?: string | null
  page?: string | null
}

export interface TimelineEvent {
  id: string
  type: string
  metricName: string
  datetime: string
  properties: Record<string, unknown>
  content: TimelineEventContent | null
  source: 'klaviyo'
}

function extractEventContent(props: Record<string, unknown>): TimelineEventContent | null {
  const subject = (props.Subject ?? props.subject) as string | undefined
  const campaignName = (props['Campaign Name'] ?? props.campaign_name) as string | undefined
  const messageType = (props['Message Type'] ?? props.message_type) as string | undefined
  const listName = (props.list_name ?? props.List) as string | undefined
  const url = (props.URL ?? props.url) as string | undefined
  const formId = props.form_id as string | undefined
  const page = props.page as string | undefined

  const content: TimelineEventContent = {}
  if (subject) content.subject = subject
  if (campaignName) content.campaignName = campaignName
  if (messageType) content.messageType = messageType
  if (listName) content.listName = listName
  if (url) content.url = url
  if (formId) content.formId = formId
  if (page) content.page = page

  return Object.keys(content).length > 0 ? content : null
}

export interface SegmentSummary {
  id: string
  name: string
  profileCount: number | null
}

function getApiKey(): string {
  const key = process.env.KLAVIYO_API_KEY
  if (!key) throw new Error('KLAVIYO_API_KEY is not set')
  return key
}

async function klaviyoFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${KLAVIYO_BASE}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Klaviyo-API-Key ${getApiKey()}`,
      revision: REVISION,
      accept: 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Klaviyo API error ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

export function computeRetentionStatus(lastEventDate: string | null): RetentionStatus {
  const days = daysSince(lastEventDate)
  if (days === null) return 'unknown'
  if (days < 30) return 'active'
  if (days < 90) return 'at_risk'
  return 'churned'
}

interface KlaviyoProfileAttributes {
  email?: string
  first_name?: string | null
  last_name?: string | null
  location?: { city?: string; country?: string } | null
  last_event_date?: string | null
  created?: string | null
  predictive_analytics?: {
    historic_clv?: number | null
    predicted_clv?: number | null
    churn_probability?: number | null
  } | null
}

interface KlaviyoProfile {
  id: string
  attributes: KlaviyoProfileAttributes
}

function mapProfile(p: KlaviyoProfile): CustomerSummary {
  const attrs = p.attributes
  const firstName = attrs.first_name ?? null
  const lastName = attrs.last_name ?? null
  const name =
    [firstName, lastName].filter(Boolean).join(' ') || attrs.email || 'Unknown'
  const loc = attrs.location
  const location = loc
    ? [loc.city, loc.country].filter(Boolean).join(', ') || null
    : null
  const lastEventDate = attrs.last_event_date ?? null
  const pa = attrs.predictive_analytics

  return {
    id: p.id,
    email: attrs.email ?? '',
    firstName,
    lastName,
    name,
    location,
    lastEventDate,
    retentionStatus: computeRetentionStatus(lastEventDate),
    historicClv: pa?.historic_clv ?? null,
    predictedClv: pa?.predicted_clv ?? null,
    churnProbability: pa?.churn_probability ?? null,
    createdAt: attrs.created ?? null,
  }
}

export async function fetchAllProfiles(): Promise<CustomerSummary[]> {
  const customers: CustomerSummary[] = []
  let cursor: string | undefined

  do {
    const params: Record<string, string> = {
      'page[size]': '50',
      'additional-fields[profile]': 'predictive_analytics',
    }
    if (cursor) params['page[cursor]'] = cursor

    const data = await klaviyoFetch<{
      data: KlaviyoProfile[]
      links?: { next?: string | null }
    }>('/profiles/', params)

    for (const p of data.data ?? []) {
      customers.push(mapProfile(p))
    }

    const next = data.links?.next
    if (next) {
      const nextUrl = new URL(next)
      cursor = nextUrl.searchParams.get('page[cursor]') ?? undefined
    } else {
      cursor = undefined
    }
  } while (cursor)

  return customers
}

export async function fetchProfile(id: string): Promise<CustomerSummary | null> {
  try {
    const data = await klaviyoFetch<{ data: KlaviyoProfile }>(
      `/profiles/${id}/`,
      { 'additional-fields[profile]': 'predictive_analytics' }
    )
    if (!data.data) return null
    return mapProfile(data.data)
  } catch {
    return null
  }
}

export async function fetchProfileEvents(profileId: string): Promise<TimelineEvent[]> {
  const filter = `equals(profile_id,"${profileId}")`
  const data = await klaviyoFetch<{
    data: Array<{
      id: string
      attributes: {
        datetime: string
        event_properties?: Record<string, unknown>
      }
      relationships?: {
        metric?: { data?: { id: string } }
      }
    }>
    included?: Array<{
      id: string
      type: string
      attributes?: { name?: string }
    }>
  }>('/events/', {
    filter,
    sort: '-datetime',
    'page[size]': '30',
    include: 'metric',
  })

  const metricMap = new Map<string, string>()
  for (const inc of data.included ?? []) {
    if (inc.type === 'metric' && inc.attributes?.name) {
      metricMap.set(inc.id, inc.attributes.name)
    }
  }

  return (data.data ?? []).map((e) => {
    const metricId = e.relationships?.metric?.data?.id
    const metricName = metricId ? metricMap.get(metricId) ?? 'Event' : 'Event'
    const properties = e.attributes.event_properties ?? {}
    return {
      id: e.id,
      type: 'event',
      metricName,
      datetime: e.attributes.datetime,
      properties,
      content: extractEventContent(properties),
      source: 'klaviyo' as const,
    }
  })
}

export async function fetchSegments(): Promise<SegmentSummary[]> {
  const data = await klaviyoFetch<{
    data: Array<{
      id: string
      attributes: { name: string }
    }>
  }>('/segments/', { 'page[size]': '10' })

  return (data.data ?? []).map((s) => ({
    id: s.id,
    name: s.attributes.name,
    profileCount: null,
  }))
}

export interface OverviewStats {
  total: number
  active: number
  atRisk: number
  churned: number
  unknown: number
  atRiskCustomers: CustomerSummary[]
}

export async function fetchOverview(): Promise<OverviewStats> {
  const customers = await fetchAllProfiles()
  const stats: OverviewStats = {
    total: customers.length,
    active: 0,
    atRisk: 0,
    churned: 0,
    unknown: 0,
    atRiskCustomers: [],
  }

  for (const c of customers) {
    switch (c.retentionStatus) {
      case 'active':
        stats.active++
        break
      case 'at_risk':
        stats.atRisk++
        stats.atRiskCustomers.push(c)
        break
      case 'churned':
        stats.churned++
        break
      default:
        stats.unknown++
    }
  }

  stats.atRiskCustomers.sort((a, b) => {
    const da = a.lastEventDate ? new Date(a.lastEventDate).getTime() : 0
    const db = b.lastEventDate ? new Date(b.lastEventDate).getTime() : 0
    return da - db
  })

  return stats
}

export async function checkKlaviyoConnection(): Promise<boolean> {
  try {
    await klaviyoFetch<{ data: unknown[] }>('/profiles/', { 'page[size]': '1' })
    return true
  } catch {
    return false
  }
}
