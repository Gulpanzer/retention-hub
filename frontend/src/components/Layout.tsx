import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Users, Settings } from 'lucide-react'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-card)] px-4 py-6">
        <div className="mb-8 px-2">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
            Retention Hub
          </h1>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">Customer comms</p>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                    : 'text-[var(--color-muted)] hover:bg-stone-100 hover:text-[var(--color-foreground)]'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="border-b border-[var(--color-border)] bg-[var(--color-card)] px-8 py-4">
          <p className="text-sm text-[var(--color-muted)]">
            Unified retention &amp; comms — alongside Klaviyo
          </p>
        </header>
        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
