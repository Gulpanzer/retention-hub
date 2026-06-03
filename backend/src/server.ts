import express from 'express'
import api from './app.js'

const app = express()
const PORT = Number(process.env.PORT) || 8787

app.use('/api', api)

app.listen(PORT, () => {
  console.log(`Retention hub API listening on http://localhost:${PORT}`)
})
