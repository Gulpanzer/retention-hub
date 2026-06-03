import { Router } from 'express'
import { google } from 'googleapis'
import { extractBodyFromPayload } from '../gmailBody.js'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
]

interface StoredTokens {
  access_token?: string | null
  refresh_token?: string | null
  expiry_date?: number | null
  email?: string
}

let storedTokens: StoredTokens | null = null

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/gmail/callback`
      : 'http://localhost:8787/api/gmail/callback') // local dev uses /api mount

  if (!clientId || !clientSecret) {
    return null
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

function getGmailClient() {
  const oauth2 = getOAuthClient()
  if (!oauth2 || !storedTokens?.access_token) return null

  oauth2.setCredentials({
    access_token: storedTokens.access_token,
    refresh_token: storedTokens.refresh_token,
    expiry_date: storedTokens.expiry_date,
  })

  return google.gmail({ version: 'v1', auth: oauth2 })
}

export const gmailRouter = Router()

gmailRouter.get('/auth-url', (_req, res) => {
  const oauth2 = getOAuthClient()
  if (!oauth2) {
    res.status(400).json({
      error: 'Gmail OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      configured: false,
    })
    return
  }

  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })

  res.json({ url, configured: true })
})

gmailRouter.get('/callback', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const oauth2 = getOAuthClient()

  if (!oauth2) {
    res.redirect(`${frontendUrl}/settings?gmail=error&message=not_configured`)
    return
  }

  const code = req.query.code as string | undefined
  if (!code) {
    res.redirect(`${frontendUrl}/settings?gmail=error&message=no_code`)
    return
  }

  try {
    const { tokens } = await oauth2.getToken(code)
    oauth2.setCredentials(tokens)

    const oauth2User = google.oauth2({ version: 'v2', auth: oauth2 })
    const userInfo = await oauth2User.userinfo.get()

    storedTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      email: userInfo.data.email ?? undefined,
    }

    res.redirect(`${frontendUrl}/settings?gmail=connected`)
  } catch (err) {
    console.error('Gmail OAuth callback error:', err)
    res.redirect(`${frontendUrl}/settings?gmail=error&message=auth_failed`)
  }
})

gmailRouter.get('/status', (_req, res) => {
  const configured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  res.json({
    configured,
    connected: Boolean(storedTokens?.access_token),
    email: storedTokens?.email ?? null,
  })
})

gmailRouter.post('/disconnect', (_req, res) => {
  storedTokens = null
  res.json({ ok: true })
})

gmailRouter.get('/threads', async (req, res) => {
  const email = req.query.email as string | undefined
  if (!email) {
    res.status(400).json({ error: 'email query param required' })
    return
  }

  const gmail = getGmailClient()
  if (!gmail) {
    res.status(401).json({ error: 'Gmail not connected' })
    return
  }

  try {
    const list = await gmail.users.threads.list({
      userId: 'me',
      q: `from:${email} OR to:${email}`,
      maxResults: 10,
    })

    const threads = list.data.threads ?? []
    const results: Array<{
      id: string
      subject: string
      snippet: string
      date: string
      from: string
      messages: Array<{
        id: string
        threadId: string
        from: string
        to: string
        subject: string
        date: string
        snippet: string
        body: string
      }>
    }> = []

    for (const t of threads.slice(0, 5)) {
      if (!t.id) continue
      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: t.id,
        format: 'full',
      })

      const messages = (thread.data.messages ?? []).map((m) => {
        const headers = m.payload?.headers ?? []
        const get = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
        const body = extractBodyFromPayload(m.payload ?? undefined) || m.snippet || ''
        return {
          id: m.id ?? '',
          threadId: t.id!,
          from: get('From'),
          to: get('To'),
          subject: get('Subject') || '(no subject)',
          date: get('Date'),
          snippet: m.snippet ?? '',
          body,
        }
      })

      const first = messages[0]

      results.push({
        id: t.id,
        subject: first?.subject ?? '(no subject)',
        snippet: first?.snippet ?? '',
        date: first?.date ?? '',
        from: first?.from ?? '',
        messages,
      })
    }

    res.json({ threads: results })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch threads' })
  }
})

gmailRouter.post('/send', async (req, res) => {
  const { to, subject, body, threadId } = req.body as {
    to?: string
    subject?: string
    body?: string
    threadId?: string
  }

  if (!to || !subject || !body) {
    res.status(400).json({ error: 'to, subject, and body are required' })
    return
  }

  const gmail = getGmailClient()
  if (!gmail) {
    res.status(401).json({ error: 'Gmail not connected' })
    return
  }

  const fromEmail = storedTokens?.email ?? 'me'
  const lines = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ]

  const raw = Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  try {
    const sent = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
        threadId: threadId || undefined,
      },
    })
    res.json({ ok: true, messageId: sent.data.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to send email' })
  }
})
