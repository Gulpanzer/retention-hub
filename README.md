# Retention Hub (demo)

Customer retention + comms hub for The Spanish Alchemist demo. Klaviyo profiles/events + optional Gmail OAuth for unified email.

## Stack

- **Backend:** Express + TypeScript (`:8787`)
- **Frontend:** Vite + React 19 + Tailwind v4 (`:5173`)

## Setup

```bash
cd retention-hub
npm install
```

Copy env and set your Klaviyo key:

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — KLAVIYO_API_KEY is required
```

### Gmail OAuth (optional)

1. Google Cloud Console → create OAuth 2.0 Web client
2. Enable Gmail API
3. Redirect URI: `http://localhost:8787/api/gmail/callback`
4. Consent screen: Testing mode, add test user emails
5. Scopes: `gmail.readonly`, `gmail.send`, `userinfo.email`
6. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`

## Run

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:8787

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/customers/overview` | Retention dashboard stats |
| `GET /api/customers` | All profiles |
| `GET /api/customers/:id` | Profile + Klaviyo events |
| `GET /api/customers/segments` | Klaviyo segments |
| `GET /api/customers/status/klaviyo` | Connection check |
| `GET /api/gmail/auth-url` | OAuth URL |
| `GET /api/gmail/callback` | OAuth callback |
| `GET /api/gmail/status` | Gmail connection status |
| `GET /api/gmail/threads?email=` | Threads with customer |
| `POST /api/gmail/send` | Send email |

## Security

- Never commit `backend/.env`
- Rotate the Klaviyo API key after the demo if it was shared in chat
