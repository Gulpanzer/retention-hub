import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Users, AlertTriangle, CheckCircle, XCircle, CircleDollarSign } from 'lucide-react'
import { api } from '../lib/api'
import { StatCard } from '../components/StatCard'
import { RetentionBadge } from '../components/RetentionBadge'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function Dashboard() {
  const { data: overview, isLoading, error } = useQuery({
    queryKey: ['overview'],
    queryFn: api.getOverview,
  })

  const { data: emailEngagedNoOrder } = useQuery({
    queryKey: ['reports', 'engaged-no-orders'],
    queryFn: api.getEmailEngagedNoOrderCustomers,
  })

  const { data: segments } = useQuery({
    queryKey: ['segments'],
    queryFn: api.getSegments,
  })

  if (isLoading) {
    return <p className="text-sm text-[var(--color-muted)]">Loading dashboard…</p>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Failed to load: {error.message}
      </div>
    )
  }

  if (!overview) return null

  const revenueAtRisk = overview.atRiskCustomers.reduce(
    (sum, customer) => sum + (customer.predictedClv ?? 0),
    0
  )

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Retention overview from Klaviyo
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total customers"
          value={overview.total}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Active"
          value={overview.active}
          sub="Activity in last 30 days"
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          label="At risk"
          value={overview.atRisk}
          sub="30–90 days since activity"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          label="Churned"
          value={overview.churned}
          sub="90+ days inactive"
          icon={<XCircle className="h-5 w-5" />}
        />
        <StatCard
          label="Revenue at risk"
          value={formatCurrency(revenueAtRisk)}
          sub="Predicted CLV of at-risk customers"
          icon={<CircleDollarSign className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <h3 className="font-semibold">Nurture this week</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            At-risk customers to reach out to
          </p>
          {overview.atRiskCustomers.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-muted)]">No at-risk customers right now.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--color-border)]">
              {overview.atRiskCustomers.slice(0, 8).map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3 first:pt-0">
                  <div>
                    <Link
                      to={`/customers/${c.id}`}
                      className="font-medium text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
                    >
                      {c.name}
                    </Link>
                    <p className="text-xs text-[var(--color-muted)]">{c.email}</p>
                  </div>
                  <div className="text-right">
                    <RetentionBadge status={c.retentionStatus} />
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Last: {formatDate(c.lastEventDate)}
                    </p>
                    <Link
                      to={`/customers/${c.id}?compose=1`}
                      className="mt-2 inline-flex rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-foreground)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    >
                      Send email
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <h3 className="font-semibold">Klaviyo segments</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Audience groups</p>
          {!segments?.length ? (
            <p className="mt-4 text-sm text-[var(--color-muted)]">No segments found.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {segments.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                >
                  <span className="font-medium">{s.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <h3 className="font-semibold">No order in 30 days, still opening emails</h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Customers with no recent purchase but active email engagement
        </p>
        {!emailEngagedNoOrder?.length ? (
          <p className="mt-4 text-sm text-[var(--color-muted)]">No matching customers right now.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-stone-50/80">
                  <th className="px-4 py-2.5 font-medium text-[var(--color-muted)]">Customer</th>
                  <th className="px-4 py-2.5 font-medium text-[var(--color-muted)]">Last order</th>
                  <th className="px-4 py-2.5 font-medium text-[var(--color-muted)]">Last email open</th>
                </tr>
              </thead>
              <tbody>
                {emailEngagedNoOrder.slice(0, 12).map(({ customer, lastOrderDate, lastEmailOpenDate }) => (
                  <tr key={customer.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/customers/${customer.id}`}
                        className="font-medium text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
                      >
                        {customer.name}
                      </Link>
                      <p className="text-xs text-[var(--color-muted)]">{customer.email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-muted)]">{formatDate(lastOrderDate)}</td>
                    <td className="px-4 py-2.5 text-[var(--color-muted)]">{formatDate(lastEmailOpenDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
