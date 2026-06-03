import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { api } from '../lib/api'
import { RetentionBadge } from '../components/RetentionBadge'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatClv(v: number | null) {
  if (v == null) return '—'
  return `€${v.toFixed(0)}`
}

export function Customers() {
  const [search, setSearch] = useState('')
  const { data: customers, isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: api.getCustomers,
  })

  const filtered = useMemo(() => {
    if (!customers) return []
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    )
  }, [customers, search])

  if (isLoading) {
    return <p className="text-sm text-[var(--color-muted)]">Loading customers…</p>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Failed to load: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Customers</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {customers?.length ?? 0} profiles from Klaviyo
          </p>
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            type="search"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-stone-50/80">
              <th className="px-4 py-3 font-medium text-[var(--color-muted)]">Customer</th>
              <th className="px-4 py-3 font-medium text-[var(--color-muted)]">Retention</th>
              <th className="px-4 py-3 font-medium text-[var(--color-muted)]">CLV</th>
              <th className="px-4 py-3 font-medium text-[var(--color-muted)]">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="border-b border-[var(--color-border)] last:border-0 hover:bg-stone-50/50"
              >
                <td className="px-4 py-3">
                  <Link
                    to={`/customers/${c.id}`}
                    className="font-medium hover:text-[var(--color-accent)]"
                  >
                    {c.name}
                  </Link>
                  <p className="text-xs text-[var(--color-muted)]">{c.email}</p>
                </td>
                <td className="px-4 py-3">
                  <RetentionBadge status={c.retentionStatus} />
                </td>
                <td className="px-4 py-3 text-[var(--color-muted)]">
                  {formatClv(c.historicClv ?? c.predictedClv)}
                </td>
                <td className="px-4 py-3 text-[var(--color-muted)]">
                  {formatDate(c.lastEventDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">
            No customers match your search.
          </p>
        )}
      </div>
    </div>
  )
}
