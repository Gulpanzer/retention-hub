import { useState } from 'react'
import { ChevronDown, ChevronRight, Mail, Reply } from 'lucide-react'
import type { TimelineEvent, TimelineEventContent } from '../lib/api'

function formatDate(d: string | null) {
  if (!d) return '—'
  const parsed = new Date(d)
  if (Number.isNaN(parsed.getTime())) return d
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ContentChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full flex-col rounded-md bg-stone-100 px-2 py-1 text-xs">
      <span className="font-medium text-[var(--color-muted)]">{label}</span>
      <span className="truncate text-[var(--color-foreground)]">{value}</span>
    </span>
  )
}

function KlaviyoContent({ content, metricName }: { content: TimelineEventContent; metricName: string }) {
  const isEmailEvent =
    metricName.toLowerCase().includes('email') ||
    metricName.toLowerCase().includes('received') ||
    metricName.toLowerCase().includes('opened') ||
    metricName.toLowerCase().includes('clicked')

  return (
    <div className="mt-3 space-y-3 border-t border-[var(--color-border)] pt-3">
      {content.subject && (
        <div>
          <p className="text-xs font-medium text-[var(--color-muted)]">Subject</p>
          <p className="mt-0.5 text-sm">{content.subject}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {content.campaignName && (
          <ContentChip label="Campaign" value={content.campaignName} />
        )}
        {content.messageType && (
          <ContentChip label="Type" value={content.messageType} />
        )}
        {content.listName && <ContentChip label="List" value={content.listName} />}
        {content.formId && <ContentChip label="Form" value={content.formId} />}
      </div>
      {content.url && (
        <div>
          <p className="text-xs font-medium text-[var(--color-muted)]">Link</p>
          <a
            href={content.url}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 block truncate text-sm text-[var(--color-accent)] hover:underline"
          >
            {content.url}
          </a>
        </div>
      )}
      {content.page && (
        <div>
          <p className="text-xs font-medium text-[var(--color-muted)]">Page</p>
          <p className="mt-0.5 break-all text-xs text-[var(--color-muted)]">{content.page}</p>
        </div>
      )}
      {isEmailEvent && content.subject && (
        <p className="text-xs text-[var(--color-muted)]">
          Full email body is sent via Klaviyo — subject and campaign context shown here.
        </p>
      )}
    </div>
  )
}

export type KlaviyoTimelineItem = {
  kind: 'klaviyo'
  id: string
  title: string
  datetime: string
  content: TimelineEventContent | null
  event: TimelineEvent
}

export type GmailTimelineItem = {
  kind: 'gmail'
  id: string
  title: string
  datetime: string
  from: string
  to: string
  body: string
  snippet: string
  threadId: string
  subject: string
}

export type TimelineItemData = KlaviyoTimelineItem | GmailTimelineItem

export function TimelineItem({
  item,
  onReply,
}: {
  item: TimelineItemData
  onReply?: (subject: string, threadId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasContent =
    item.kind === 'gmail'
      ? Boolean(item.body || item.snippet)
      : Boolean(item.content && Object.keys(item.content).length > 0)

  const preview =
    item.kind === 'gmail'
      ? item.snippet || item.body.slice(0, 120)
      : item.content?.subject ?? null

  return (
    <li className="rounded-lg border border-[var(--color-border)] overflow-hidden">
      <button
        type="button"
        onClick={() => hasContent && setExpanded((e) => !e)}
        className={`flex w-full gap-3 p-3 text-left transition-colors ${
          hasContent ? 'hover:bg-stone-50/80 cursor-pointer' : 'cursor-default'
        }`}
      >
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            item.kind === 'gmail' ? 'bg-blue-50 text-blue-600' : 'bg-teal-50 text-teal-600'
          }`}
        >
          {item.kind === 'gmail' ? (
            <Mail className="h-4 w-4" />
          ) : (
            <span className="text-xs font-bold">K</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm">{item.title}</p>
            {hasContent &&
              (expanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
              ))}
          </div>
          {preview && !expanded && (
            <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-muted)]">{preview}</p>
          )}
          <p className="mt-1 text-xs text-[var(--color-muted)]">{formatDate(item.datetime)}</p>
        </div>
      </button>

      {expanded && item.kind === 'klaviyo' && item.content && (
        <div className="px-3 pb-3 pl-14">
          <KlaviyoContent content={item.content} metricName={item.title} />
        </div>
      )}

      {expanded && item.kind === 'gmail' && (
        <div className="px-3 pb-3 pl-14 space-y-3 border-t border-[var(--color-border)] pt-3">
          <div className="text-xs text-[var(--color-muted)] space-y-0.5">
            <p>
              <span className="font-medium">From:</span> {item.from}
            </p>
            {item.to && (
              <p>
                <span className="font-medium">To:</span> {item.to}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-stone-50 p-3 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
            {item.body || item.snippet || '(empty message)'}
          </div>
          {onReply && (
            <button
              type="button"
              onClick={() =>
                onReply(
                  item.subject.startsWith('Re:') ? item.subject : `Re: ${item.subject}`,
                  item.threadId
                )
              }
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline"
            >
              <Reply className="h-3.5 w-3.5" />
              Reply in compose
            </button>
          )}
        </div>
      )}

      {expanded && item.kind === 'klaviyo' && !item.content && (
        <div className="px-3 pb-3 pl-14 text-xs text-[var(--color-muted)]">
          No additional details for this event.
        </div>
      )}
    </li>
  )
}
