import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { api } from '../lib/api'

export function Settings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const gmailParam = searchParams.get('gmail')

  const { data: klaviyo } = useQuery({
    queryKey: ['klaviyo-status'],
    queryFn: api.getKlaviyoStatus,
  })

  const { data: gmail, refetch: refetchGmail } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: api.getGmailStatus,
  })

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { url, configured } = await api.getGmailAuthUrl()
      if (!configured || !url) {
        throw new Error('Gmail OAuth is not configured on the server')
      }
      window.location.href = url
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: api.disconnectGmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-status'] })
    },
  })

  useEffect(() => {
    if (gmailParam === 'connected' || gmailParam === 'error') {
      refetchGmail()
      setSearchParams({}, { replace: true })
    }
  }, [gmailParam, refetchGmail, setSearchParams])

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Connect integrations for the retention hub
        </p>
      </div>

      {gmailParam === 'connected' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Gmail connected successfully.
        </div>
      )}
      {gmailParam === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Gmail connection failed. Check OAuth setup and try again.
        </div>
      )}

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">Klaviyo</h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Customer profiles, segments, and event timeline
            </p>
          </div>
          {klaviyo?.connected ? (
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
        <p className="mt-4 text-sm">
          Status:{' '}
          <span className={klaviyo?.connected ? 'text-emerald-700' : 'text-red-600'}>
            {klaviyo?.connected ? 'Connected' : 'Not connected — check KLAVIYO_API_KEY'}
          </span>
        </p>
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              <Mail className="h-4 w-4" /> Gmail
            </h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Read and send customer emails from the hub
            </p>
          </div>
          {gmail?.connected ? (
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          ) : (
            <XCircle className="h-5 w-5 text-stone-400" />
          )}
        </div>

        {gmail?.connected ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm">
              Connected as <span className="font-medium">{gmail.email}</span>
            </p>
            <button
              type="button"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="text-sm text-[var(--color-muted)] underline hover:text-red-600"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {!gmail?.configured && (
              <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                Server needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env
              </p>
            )}
            <button
              type="button"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending || !gmail?.configured}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <ExternalLink className="h-4 w-4" />
              Connect Gmail
            </button>
            {connectMutation.error && (
              <p className="text-xs text-red-600">{connectMutation.error.message}</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
