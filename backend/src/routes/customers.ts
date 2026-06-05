import { Router } from 'express'
import {
  fetchAllProfiles,
  fetchEmailEngagedNoOrderCustomers,
  fetchProfile,
  fetchProfileEvents,
  fetchSegments,
  fetchOverview,
  checkKlaviyoConnection,
} from '../klaviyo.js'

export const customersRouter = Router()

customersRouter.get('/overview', async (_req, res) => {
  try {
    const overview = await fetchOverview()
    res.json(overview)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch overview' })
  }
})

customersRouter.get('/segments', async (_req, res) => {
  try {
    const segments = await fetchSegments()
    res.json({ segments })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch segments' })
  }
})

customersRouter.get('/status/klaviyo', async (_req, res) => {
  try {
    const connected = await checkKlaviyoConnection()
    res.json({ connected })
  } catch {
    res.json({ connected: false })
  }
})

customersRouter.get('/reports/engaged-no-orders', async (_req, res) => {
  try {
    const customers = await fetchEmailEngagedNoOrderCustomers()
    res.json({ customers })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to fetch engaged no-order customers',
    })
  }
})

customersRouter.get('/', async (_req, res) => {
  try {
    const customers = await fetchAllProfiles()
    res.json({ customers })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch customers' })
  }
})

customersRouter.get('/:id', async (req, res) => {
  try {
    const profile = await fetchProfile(req.params.id)
    if (!profile) {
      res.status(404).json({ error: 'Customer not found' })
      return
    }
    const events = await fetchProfileEvents(req.params.id)
    res.json({ customer: profile, events })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch customer' })
  }
})
