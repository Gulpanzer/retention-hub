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

export interface TimelineEvent {
  id: string
  type: string
  metricName: string
  datetime: string
  properties: Record<string, unknown>
  source: 'klaviyo'
}

export interface SegmentSummary {
  id: string
  name: string
  profileCount: number | null
}

export interface OverviewStats {
  total: number
  active: number
  atRisk: number
  churned: number
  unknown: number
  atRiskCustomers: CustomerSummary[]
}

export interface GmailThread {
  id: string
  subject: string
  snippet: string
  date: string
  from: string
  messages: Array<{ id: string; from: string; date: string; snippet: string; body: string }>
}

const API_BASE = '/api'

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Request failed')
  }
  return res.json() as Promise<T>
}

export const api = {
  getOverview: () => fetchJson<OverviewStats>('/customers/overview'),
  getCustomers: () =>
    fetchJson<{ customers: CustomerSummary[] }>('/customers').then((r) => r.customers),
  getCustomer: (id: string) =>
    fetchJson<{ customer: CustomerSummary; events: TimelineEvent[] }>(`/customers/${id}`),
  getSegments: () =>
    fetchJson<{ segments: SegmentSummary[] }>('/customers/segments').then((r) => r.segments),
  getKlaviyoStatus: () => fetchJson<{ connected: boolean }>('/customers/status/klaviyo'),
  getGmailStatus: () =>
    fetchJson<{ configured: boolean; connected: boolean; email: string | null }>('/gmail/status'),
  getGmailAuthUrl: () =>
    fetchJson<{ url: string; configured: boolean }>('/gmail/auth-url'),
  disconnectGmail: () => fetchJson<{ ok: boolean }>('/gmail/disconnect', { method: 'POST' }),
  getGmailThreads: (email: string) =>
    fetchJson<{ threads: GmailThread[] }>(`/gmail/threads?email=${encodeURIComponent(email)}`),
  sendEmail: (payload: { to: string; subject: string; body: string; threadId?: string }) =>
    fetchJson<{ ok: boolean; messageId?: string }>('/gmail/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
