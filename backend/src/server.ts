import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { customersRouter } from './routes/customers.js'
import { gmailRouter } from './routes/gmail.js'

const app = express()
const PORT = Number(process.env.PORT) || 8787

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/customers', customersRouter)
app.use('/api/gmail', gmailRouter)

app.listen(PORT, () => {
  console.log(`Retention hub API listening on http://localhost:${PORT}`)
})
