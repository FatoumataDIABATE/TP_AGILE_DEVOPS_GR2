import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import './App.css'

type EventItem = {
  id: number
  title: string
  description: string
  startsAt: string
  location: string
  category: string
  createdAt: string
}

type EventForm = {
  title: string
  description: string
  startsAt: string
  location: string
  category: string
}

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const initialForm: EventForm = {
  title: '',
  description: '',
  startsAt: '',
  location: '',
  category: 'Conférence',
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'full',
  timeStyle: 'short',
})

function App() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [form, setForm] = useState<EventForm>(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadEvents()
  }, [])

  async function loadEvents() {
    try {
      setLoading(true)
      const response = await fetch(`${apiBase}/api/events`)

      if (!response.ok) {
        throw new Error('Impossible de charger les événements')
      }

      const data = (await response.json()) as EventItem[]
      setEvents(data)
      setError(null)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Une erreur inattendue est survenue',
      )
    } finally {
      setLoading(false)
    }
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setSaving(true)

      const response = await fetch(`${apiBase}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          startsAt: new Date(form.startsAt).toISOString(),
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null

        throw new Error(payload?.error ?? 'Impossible de créer l’événement')
      }

      const createdEvent = (await response.json()) as EventItem
      setEvents((currentEvents) => [createdEvent, ...currentEvents])
      setForm(initialForm)
      setError(null)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Une erreur inattendue est survenue',
      )
    } finally {
      setSaving(false)
    }
  }

  const nextEvent = events[0]

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Events Hub</span>
          <h1>Dockerisé avec PostgreSQL pour stocker les événements.</h1>
          <p>
            L’application lit et crée des événements via une API Node connectée à
            une base PostgreSQL, le tout orchestré avec Docker Compose.
          </p>
          <div className="hero-stats">
            <article>
              <strong>{events.length}</strong>
              <span>événements en base</span>
            </article>
            <article>
              <strong>{nextEvent ? 'À venir' : 'Vide'}</strong>
              <span>{nextEvent ? nextEvent.title : 'Aucun événement chargé'}</span>
            </article>
          </div>
        </div>

        <aside className="hero-card">
          <span className="card-label">Prochain événement</span>
          {nextEvent ? (
            <>
              <h2>{nextEvent.title}</h2>
              <p>{nextEvent.description}</p>
              <dl>
                <div>
                  <dt>Date</dt>
                  <dd>{dateFormatter.format(new Date(nextEvent.startsAt))}</dd>
                </div>
                <div>
                  <dt>Lieu</dt>
                  <dd>{nextEvent.location}</dd>
                </div>
                <div>
                  <dt>Catégorie</dt>
                  <dd>{nextEvent.category}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p>Aucun événement pour le moment. Ajoute-en un via le formulaire.</p>
          )}
        </aside>
      </section>

      <section className="content-grid">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <div className="section-heading">
            <span className="eyebrow">Ajouter</span>
            <h2>Créer un événement</h2>
          </div>

          <div className="form-grid">
            <label>
              Titre
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Conférence DevOps"
                required
              />
            </label>
            <label>
              Catégorie
              <select name="category" value={form.category} onChange={handleChange}>
                <option>Conférence</option>
                <option>Meetup</option>
                <option>Atelier</option>
                <option>Formation</option>
                <option>Webinaire</option>
              </select>
            </label>
            <label className="span-2">
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Décris le sujet et les intervenants..."
                rows={5}
                required
              />
            </label>
            <label>
              Date et heure
              <input
                name="startsAt"
                type="datetime-local"
                value={form.startsAt}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Lieu
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Paris, salle 204"
                required
              />
            </label>
          </div>

          {error ? <p className="error-box">{error}</p> : null}

          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer dans la base'}
          </button>
        </form>

        <section className="panel list-panel">
          <div className="section-heading">
            <span className="eyebrow">Base PostgreSQL</span>
            <h2>Événements enregistrés</h2>
          </div>

          {loading ? <p className="muted">Chargement des événements...</p> : null}
          {!loading && events.length === 0 ? (
            <p className="muted">La table est vide pour l’instant.</p>
          ) : null}

          <div className="event-list">
            {events.map((eventItem) => (
              <article key={eventItem.id} className="event-card">
                <div className="event-card__header">
                  <span>{eventItem.category}</span>
                  <strong>{dateFormatter.format(new Date(eventItem.startsAt))}</strong>
                </div>
                <h3>{eventItem.title}</h3>
                <p>{eventItem.description}</p>
                <footer>
                  <span>{eventItem.location}</span>
                  <small>Ajouté le {dateFormatter.format(new Date(eventItem.createdAt))}</small>
                </footer>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
