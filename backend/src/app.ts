import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { customersRouter } from './routes/customers.js'
import { gmailRouter } from './routes/gmail.js'

function allowedOrigins(): string[] {
  const origins = new Set<string>(['http://localhost:5173'])
  if (process.env.FRONTEND_URL) origins.add(process.env.FRONTEND_URL)
  if (process.env.VERCEL_URL) origins.add(`https://${process.env.VERCEL_URL}`)
  if (process.env.VERCEL_BRANCH_URL) origins.add(`https://${process.env.VERCEL_BRANCH_URL}`)
  return [...origins]
}

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true)
          return
        }
        const allowed = allowedOrigins()
        if (allowed.includes(origin)) {
          callback(null, true)
          return
        }
        callback(new Error(`CORS blocked for origin: ${origin}`))
      },
      credentials: true,
    })
  )
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use('/customers', customersRouter)
  app.use('/gmail', gmailRouter)

  return app
}

const app = createApp()
export default app
