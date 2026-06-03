import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Mail, MessageCircle, Send } from 'lucide-react'
import { api } from '../lib/api'
import { RetentionBadge } from '../components/RetentionBadge'
import { TimelineItem, type TimelineItemData } from '../components/TimelineItem'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatClv(v: number | null) {
  if (v == null) return '—'
  return `€${v.toFixed(2)}`
}

function parseGmailDate(dateStr: string): number {
  const t = new Date(dateStr).getTime()
  return Number.isNaN(t) ? 0 : t
}

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [threadId, setThreadId] = useState<string | undefined>()
  const [sendError, setSendError] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.getCustomer(id!),
    enabled: Boolean(id),
  })

  const { data: gmailStatus } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: api.getGmailStatus,
  })

  const { data: gmailThreads } = useQuery({
    queryKey: ['gmail-threads', data?.customer.email],
    queryFn: () => api.getGmailThreads(data!.customer.email),
    enabled: Boolean(gmailStatus?.connected && data?.customer.email),
  })

  const sendMutation = useMutation({
    mutationFn: () =>
      api.sendEmail({
        to: data!.customer.email,
        subject,
        body,
        threadId,
      }),
    onSuccess: () => {
      setSubject('')
      setBody('')
      setThreadId(undefined)
      setSendError(null)
      queryClient.invalidateQueries({ queryKey: ['gmail-threads', data?.customer.email] })
    },
    onError: (err: Error) => setSendError(err.message),
  })

  const handleReply = (replySubject: string, replyThreadId: string) => {
    setSubject(replySubject)
    setThreadId(replyThreadId)
    document.getElementById('compose-panel')?.scrollIntoView({ behavior: 'smooth' })
  }

  if (isLoading) {
    return <p className="text-sm text-[var(--color-muted)]">Loading customer…</p>
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-[var(--color-accent)]">
          <ArrowLeft className="h-4 w-4" /> Back to customers
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error?.message ?? 'Customer not found'}
        </div>
      </div>
    )
  }

  const { customer, events } = data

  const timelineItems: TimelineItemData[] = [
    ...events.map(
      (e): TimelineItemData => ({
        kind: 'klaviyo',
        id: e.id,
        title: e.metricName,
        datetime: e.datetime,
        content: e.content ?? null,
        event: e,
      })
    ),
    ...(gmailThreads?.threads ?? []).flatMap((t) =>
      t.messages.map(
        (m): TimelineItemData => ({
          kind: 'gmail',
          id: `gmail-${m.id}`,
          title: m.subject || t.subject,
          datetime: m.date,
          from: m.from,
          to: m.to,
          body: m.body,
          snippet: m.snippet,
          threadId: m.threadId,
          subject: m.subject || t.subject,
        })
      )
    ),
  ].sort((a, b) => {
    const ta =
      a.kind === 'gmail' ? parseGmailDate(a.datetime) : new Date(a.datetime).getTime()
    const tb =
      b.kind === 'gmail' ? parseGmailDate(b.datetime) : new Date(b.datetime).getTime()
    return tb - ta
  })

  return (
    <div className="space-y-8">
      <Link
        to="/customers"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
      >
        <ArrowLeft className="h-4 w-4" /> Customers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{customer.name}</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{customer.email}</p>
          {customer.location && (
            <p className="text-xs text-[var(--color-muted)]">{customer.location}</p>
          )}
        </div>
        <RetentionBadge status={customer.retentionStatus} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <p className="text-xs font-medium text-[var(--color-muted)]">Historic CLV</p>
          <p className="mt-1 text-lg font-semibold">{formatClv(customer.historicClv)}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <p className="text-xs font-medium text-[var(--color-muted)]">Predicted CLV</p>
          <p className="mt-1 text-lg font-semibold">{formatClv(customer.predictedClv)}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <p className="text-xs font-medium text-[var(--color-muted)]">Last activity</p>
          <p className="mt-1 text-lg font-semibold">{formatDate(customer.lastEventDate)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <h3 className="font-semibold">Comms timeline</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Click an item to view content · Klaviyo{' '}
            {gmailStatus?.connected ? '+ Gmail' : ''}
          </p>
          {timelineItems.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-muted)]">No activity yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {timelineItems.map((item) => (
                <TimelineItem
                  key={item.id}
                  item={item}
                  onReply={gmailStatus?.connected ? handleReply : undefined}
                />
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section
            id="compose-panel"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6"
          >
            <h3 className="flex items-center gap-2 font-semibold">
              <Mail className="h-4 w-4" /> Send email
            </h3>
            {!gmailStatus?.connected ? (
              <p className="mt-3 text-sm text-[var(--color-muted)]">
                Connect Gmail in{' '}
                <Link to="/settings" className="text-[var(--color-accent)] underline">
                  Settings
                </Link>{' '}
                to send from here.
              </p>
            ) : (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  sendMutation.mutate()
                }}
              >
                <input
                  type="text"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                  required
                />
                <textarea
                  placeholder="Message…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                  required
                />
                {threadId && (
                  <p className="text-xs text-[var(--color-muted)]">Replying in thread</p>
                )}
                {sendError && <p className="text-xs text-red-600">{sendError}</p>}
                <button
                  type="submit"
                  disabled={sendMutation.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {sendMutation.isPending ? 'Sending…' : 'Send'}
                </button>
              </form>
            )}
          </section>

          <section className="rounded-xl border border-dashed border-[var(--color-border)] bg-stone-50/50 p-6">
            <h3 className="flex items-center gap-2 font-semibold text-[var(--color-muted)]">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Coming once your WhatsApp Business API number is live. Unified send/receive here
              alongside email.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
