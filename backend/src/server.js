import cors from 'cors'
import express from 'express'
import { pool } from './db.js'

const port = Number(process.env.PORT ?? 3001)
const app = express()

app.use(cors())
app.use(express.json())

function mapEvent(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    location: row.location,
    category: row.category,
    createdAt: row.created_at,
  }
}

async function waitForDatabase(retries = 10) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query('SELECT 1')
      return
    } catch (error) {
      if (attempt === retries) {
        throw error
      }

      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.get('/api/events', async (_request, response) => {
  try {
    const result = await pool.query(
      `
        SELECT id, title, description, starts_at, location, category, created_at
        FROM events
        ORDER BY starts_at ASC
      `,
    )

    response.json(result.rows.map(mapEvent))
  } catch (error) {
    response.status(500).json({ error: 'Impossible de lire les événements' })
  }
})

app.post('/api/events', async (request, response) => {
  const { title, description, startsAt, location, category } = request.body ?? {}

  if (!title || !description || !startsAt || !location || !category) {
    return response.status(400).json({ error: 'Tous les champs sont obligatoires' })
  }

  const startsAtDate = new Date(startsAt)

  if (Number.isNaN(startsAtDate.getTime())) {
    return response.status(400).json({ error: 'La date de début est invalide' })
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO events (title, description, starts_at, location, category)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, title, description, starts_at, location, category, created_at
      `,
      [title, description, startsAtDate.toISOString(), location, category],
    )

    response.status(201).json(mapEvent(result.rows[0]))
  } catch (error) {
    response.status(500).json({ error: 'Impossible de créer l’événement' })
  }
})

async function startServer() {
  await waitForDatabase()

  app.listen(port, () => {
    console.log(`Events API listening on http://localhost:${port}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start API server:', error)
  process.exit(1)
})