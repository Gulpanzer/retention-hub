import type { RetentionStatus } from '../lib/api'

const styles: Record<RetentionStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  at_risk: 'bg-amber-50 text-amber-800',
  churned: 'bg-stone-100 text-stone-600',
  unknown: 'bg-stone-100 text-stone-500',
}

const labels: Record<RetentionStatus, string> = {
  active: 'Active',
  at_risk: 'At risk',
  churned: 'Churned',
  unknown: 'Unknown',
}

export function RetentionBadge({ status }: { status: RetentionStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  )
}
