import cors from 'cors'
import express from 'express'
import { createHash } from 'node:crypto'
import { db } from './db.js'

const port = Number(process.env.PORT ?? 3001)
const app = express()
const listEvents = db.prepare(`
  SELECT
    e.id,
    e.title,
    e.description,
    e.starts_at,
    e.location,
    e.category,
    e.created_at,
    COALESCE(r.registrations_count, 0) AS registrations_count
  FROM events AS e
  LEFT JOIN (
    SELECT event_id, COUNT(*) AS registrations_count
    FROM registrations
    GROUP BY event_id
  ) AS r ON r.event_id = e.id
  ORDER BY e.starts_at ASC
`)
const getEventById = db.prepare(`
  SELECT
    e.id,
    e.title,
    e.description,
    e.starts_at,
    e.location,
    e.category,
    e.created_at,
    COALESCE(r.registrations_count, 0) AS registrations_count
  FROM events AS e
  LEFT JOIN (
    SELECT event_id, COUNT(*) AS registrations_count
    FROM registrations
    GROUP BY event_id
  ) AS r ON r.event_id = e.id
  WHERE e.id = ?
`)
const insertEvent = db.prepare(`
  INSERT INTO events (title, description, starts_at, location, category)
  VALUES (?, ?, ?, ?, ?)
`)
const updateEvent = db.prepare(`
  UPDATE events
  SET title = ?, description = ?, starts_at = ?, location = ?, category = ?
  WHERE id = ?
`)
const deleteEvent = db.prepare(`
  DELETE FROM events
  WHERE id = ?
`)
const insertRegistration = db.prepare(`
  INSERT INTO registrations (event_id, full_name, email)
  VALUES (?, ?, ?)
`)
const getRegistrationById = db.prepare(`
  SELECT id, event_id, full_name, email, created_at
  FROM registrations
  WHERE id = ?
`)
const listRegistrationsByEventId = db.prepare(`
  SELECT id, event_id, full_name, email, created_at
  FROM registrations
  WHERE event_id = ?
  ORDER BY created_at ASC, id ASC
`)

const getAdminByEmail = db.prepare(`
  SELECT id, email, password_hash
  FROM administrators
  WHERE email = ?
`)

function hashPassword(password) {
  return createHash('sha256').update(String(password)).digest('hex')
}

function createAuthToken(email, passwordHash) {
  return Buffer.from(`${email}:${passwordHash}`).toString('base64')
}

function parseAuthToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const [email, passwordHash] = decoded.split(':')
    return { email, passwordHash }
  } catch {
    return null
  }
}

function requireAdmin(request, response, next) {
  const header = request.header('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return response.status(401).json({ error: 'Authentification requise' })
  }

  const payload = parseAuthToken(token)

  if (!payload?.email || !payload?.passwordHash) {
    return response.status(401).json({ error: 'Authentification invalide' })
  }

  const admin = getAdminByEmail.get(payload.email.toLowerCase())

  if (!admin || admin.password_hash !== payload.passwordHash) {
    return response.status(401).json({ error: 'Authentification invalide' })
  }

  next()
}

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
    registrationsCount: Number(row.registrations_count ?? 0),
  }
}

function mapRegistration(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    fullName: row.full_name,
    email: row.email,
    createdAt: row.created_at,
  }
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.post('/api/auth/login', async (request, response) => {
  const { email, password } = request.body ?? {}

  if (!email || !password) {
    return response.status(400).json({ error: 'Email et mot de passe requis' })
  }

  const normalizedEmail = String(email).trim().toLowerCase()
  const admin = getAdminByEmail.get(normalizedEmail)

  if (!admin || hashPassword(password) !== admin.password_hash) {
    return response.status(401).json({ error: 'Identifiants invalides' })
  }

  response.json({ token: createAuthToken(normalizedEmail, admin.password_hash) })
})

app.get('/api/events', async (_request, response) => {
  try {
    response.json(listEvents.all().map(mapEvent))
  } catch (error) {
    response.status(500).json({ error: 'Impossible de lire les événements' })
  }
})

app.post('/api/events', requireAdmin, async (request, response) => {
  const { title, description, startsAt, location, category } = request.body ?? {}

  if (!title || !description || !startsAt || !location || !category) {
    return response.status(400).json({ error: 'Tous les champs sont obligatoires' })
  }

  const startsAtDate = new Date(startsAt)

  if (Number.isNaN(startsAtDate.getTime())) {
    return response.status(400).json({ error: 'La date de début est invalide' })
  }

  try {
    const result = insertEvent.run(title, description, startsAtDate.toISOString(), location, category)
    const createdEvent = getEventById.get(result.lastInsertRowid)

    response.status(201).json(mapEvent(createdEvent))
  } catch (error) {
    response.status(500).json({ error: 'Impossible de créer l’événement' })
  }
})

app.put('/api/events/:id', requireAdmin, async (request, response) => {
  const eventId = Number(request.params.id)

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return response.status(400).json({ error: 'Identifiant d’événement invalide' })
  }

  const { title, description, startsAt, location, category } = request.body ?? {}

  if (!title || !description || !startsAt || !location || !category) {
    return response.status(400).json({ error: 'Tous les champs sont obligatoires' })
  }

  const startsAtDate = new Date(startsAt)

  if (Number.isNaN(startsAtDate.getTime())) {
    return response.status(400).json({ error: 'La date de début est invalide' })
  }

  const existingEvent = getEventById.get(eventId)

  if (!existingEvent) {
    return response.status(404).json({ error: 'Événement introuvable' })
  }

  try {
    updateEvent.run(title, description, startsAtDate.toISOString(), location, category, eventId)
    const updatedEvent = getEventById.get(eventId)

    response.json(mapEvent(updatedEvent))
  } catch (error) {
    response.status(500).json({ error: 'Impossible de mettre à jour l’événement' })
  }
})

app.delete('/api/events/:id', requireAdmin, async (request, response) => {
  const eventId = Number(request.params.id)

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return response.status(400).json({ error: 'Identifiant d’événement invalide' })
  }

  const existingEvent = getEventById.get(eventId)

  if (!existingEvent) {
    return response.status(404).json({ error: 'Événement introuvable' })
  }

  try {
    deleteEvent.run(eventId)
    response.status(204).end()
  } catch (error) {
    response.status(500).json({ error: 'Impossible de supprimer l’événement' })
  }
})

app.get('/api/events/:id/registrations', requireAdmin, async (request, response) => {
  const eventId = Number(request.params.id)

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return response.status(400).json({ error: 'Identifiant d’événement invalide' })
  }

  const existingEvent = getEventById.get(eventId)

  if (!existingEvent) {
    return response.status(404).json({ error: 'Événement introuvable' })
  }

  try {
    const registrations = listRegistrationsByEventId.all(eventId).map(mapRegistration)

    response.json({
      event: mapEvent(existingEvent),
      registrations,
    })
  } catch (error) {
    response.status(500).json({ error: 'Impossible de lire les inscriptions' })
  }
})

app.post('/api/registrations', async (request, response) => {
  const { eventId, fullName, email } = request.body ?? {}

  if (!eventId || !fullName || !email) {
    return response.status(400).json({ error: 'Tous les champs sont obligatoires' })
  }

  const event = getEventById.get(Number(eventId))

  if (!event) {
    return response.status(404).json({ error: 'Événement introuvable' })
  }

  try {
    const result = insertRegistration.run(Number(eventId), fullName, email.toLowerCase().trim())
    const createdRegistration = getRegistrationById.get(result.lastInsertRowid)
    const updatedEvent = getEventById.get(Number(eventId))

    response.status(201).json({
      registration: mapRegistration(createdRegistration),
      event: mapEvent(updatedEvent),
    })
  } catch (error) {
    if (String(error?.message ?? '').includes('UNIQUE')) {
      return response.status(409).json({ error: 'Cette adresse email est déjà inscrite à cet événement' })
    }

    response.status(500).json({ error: 'Impossible d’enregistrer l’inscription' })
  }
})

async function startServer() {
  app.listen(port, () => {
    console.log(`Events API listening on http://localhost:${port}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start API server:', error)
  process.exit(1)
})