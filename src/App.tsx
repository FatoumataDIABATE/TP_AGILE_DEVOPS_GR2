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
  registrationsCount: number
}

type RegistrationForm = {
  fullName: string
  email: string
  eventId: string
}

type EventForm = {
  title: string
  description: string
  startsAt: string
  location: string
  category: string
}

type Route = 'visitor' | 'admin'

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const initialForm: RegistrationForm = {
  fullName: '',
  email: '',
  eventId: '',
}

const initialEventForm: EventForm = {
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
  const [form, setForm] = useState<RegistrationForm>(initialForm)
  const [eventForm, setEventForm] = useState<EventForm>(initialEventForm)
  const [route, setRoute] = useState<Route>(() =>
    window.location.pathname === '/admin' ? 'admin' : 'visitor',
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null)

  useEffect(() => {
    void loadEvents()
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname === '/admin' ? 'admin' : 'visitor')
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  function navigateTo(pathname: '/' | '/admin') {
    if (window.location.pathname !== pathname) {
      window.history.pushState({}, '', pathname)
    }

    setRoute(pathname === '/admin' ? 'admin' : 'visitor')
  }

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
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  function handleEventChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target
    setEventForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.eventId) {
      setError('Choisis un événement avant de t’inscrire')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const response = await fetch(`${apiBase}/api/registrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          eventId: Number(form.eventId),
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null

        throw new Error(payload?.error ?? 'Impossible d’enregistrer l’inscription')
      }

      const payload = (await response.json()) as {
        registration: { fullName: string; email: string }
        event: EventItem
      }

      setEvents((currentEvents) =>
        currentEvents.map((currentEvent) =>
          currentEvent.id === payload.event.id
            ? {
                ...currentEvent,
                registrationsCount: payload.event.registrationsCount,
              }
            : currentEvent,
        ),
      )
      setForm(initialForm)
      setSuccess(`Inscription confirmée pour ${payload.registration.fullName}`)
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

  async function handleAdminSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setCreating(true)
      setError(null)
      setAdminSuccess(null)

      const response = await fetch(`${apiBase}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...eventForm,
          startsAt: new Date(eventForm.startsAt).toISOString(),
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null

        throw new Error(payload?.error ?? 'Impossible de créer l’événement')
      }

      const createdEvent = (await response.json()) as EventItem
      setEvents((currentEvents) => [...currentEvents, createdEvent].sort((left, right) =>
        new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
      ))
      setEventForm(initialEventForm)
      setAdminSuccess(`Événement créé: ${createdEvent.title}`)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Une erreur inattendue est survenue',
      )
    } finally {
      setCreating(false)
    }
  }

  const nextEvent = events[0]
  const selectedEvent = events.find((eventItem) => String(eventItem.id) === form.eventId)

  if (route === 'admin') {
    return (
      <main className="app-shell">
        <section className="hero-panel">
          <div className="hero-copy">
            <span className="eyebrow">Espace admin</span>
            <h1>Créer un événement</h1>
            <p>
              Cette page permet à l’administrateur d’ajouter un nouvel événement publié ensuite
              sur la page visiteur.
            </p>
            <div className="page-actions">
              <button type="button" className="secondary-button" onClick={() => navigateTo('/')}>
                Retour à la page visiteur
              </button>
            </div>
          </div>
        </section>

        <section className="content-grid single-column">
          <form className="panel form-panel" onSubmit={handleAdminSubmit}>
            <div className="section-heading">
              <span className="eyebrow">Admin</span>
              <h2>Publier un nouvel événement</h2>
            </div>

            <div className="form-grid">
              <label className="span-2">
                Titre
                <input
                  name="title"
                  value={eventForm.title}
                  onChange={handleEventChange}
                  placeholder="Conférence DevOps"
                  required
                />
              </label>
              <label className="span-2">
                Description
                <textarea
                  name="description"
                  value={eventForm.description}
                  onChange={handleEventChange}
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
                  value={eventForm.startsAt}
                  onChange={handleEventChange}
                  required
                />
              </label>
              <label>
                Catégorie
                <select name="category" value={eventForm.category} onChange={handleEventChange}>
                  <option>Conférence</option>
                  <option>Meetup</option>
                  <option>Atelier</option>
                  <option>Formation</option>
                  <option>Webinaire</option>
                </select>
              </label>
              <label className="span-2">
                Lieu
                <input
                  name="location"
                  value={eventForm.location}
                  onChange={handleEventChange}
                  placeholder="Paris, salle 204"
                  required
                />
              </label>
            </div>

            {error ? <p className="error-box">{error}</p> : null}
            {adminSuccess ? <p className="success-box">{adminSuccess}</p> : null}

            <button type="submit" className="primary-button" disabled={creating}>
              {creating ? 'Création...' : 'Créer l’événement'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Page visiteur</span>
          <h1>Découvre les événements publiés par l’administrateur.</h1>
          <p>
            Cette page est en lecture seule: tu peux consulter les événements et t’inscrire,
            mais pas en créer.
          </p>
          <div className="page-actions">
            <button type="button" className="secondary-button" onClick={() => navigateTo('/admin')}>
              Accès admin
            </button>
          </div>
          <div className="hero-stats">
            <article>
              <strong>{events.length}</strong>
              <span>événements à venir</span>
            </article>
            <article>
              <strong>{nextEvent ? nextEvent.title : 'Vide'}</strong>
              <span>{nextEvent ? 'Prochain événement' : 'Aucun événement chargé'}</span>
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
                <div>
                  <dt>Inscrits</dt>
                  <dd>{nextEvent.registrationsCount}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p>Aucun événement pour le moment. Reviens un peu plus tard.</p>
          )}
        </aside>
      </section>

      <section className="content-grid">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <div className="section-heading">
            <span className="eyebrow">Inscription</span>
            <h2>Réserver ta place</h2>
          </div>

          <div className="form-grid">
            <label>
              Nom complet
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Prénom Nom"
                required
              />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="toi@exemple.fr"
                required
              />
            </label>
            <label className="span-2">
              Choisir un événement
              <select name="eventId" value={form.eventId} onChange={handleChange} required>
                <option value="">Sélectionne un événement</option>
                {events.map((eventItem) => (
                  <option key={eventItem.id} value={eventItem.id}>
                    {eventItem.title} - {dateFormatter.format(new Date(eventItem.startsAt))}
                  </option>
                ))}
              </select>
            </label>
            <label className="span-2">
              Récapitulatif
              <div className="registration-summary">
                {selectedEvent ? (
                  <>
                    <strong>{selectedEvent.title}</strong>
                    <span>
                      {selectedEvent.location} - {dateFormatter.format(new Date(selectedEvent.startsAt))}
                    </span>
                  </>
                ) : (
                  <span>Sélectionne un événement pour voir le détail.</span>
                )}
              </div>
            </label>
          </div>

          {error ? <p className="error-box">{error}</p> : null}
          {success ? <p className="success-box">{success}</p> : null}

          <button type="submit" className="primary-button" disabled={saving || events.length === 0}>
            {saving ? 'Inscription...' : 'S’inscrire'}
          </button>
        </form>

        <section className="panel list-panel">
          <div className="section-heading">
            <span className="eyebrow">Événements</span>
            <h2>À venir</h2>
          </div>

          {loading ? <p className="muted">Chargement des événements...</p> : null}
          {!loading && events.length === 0 ? (
            <p className="muted">Aucun événement à venir pour l’instant.</p>
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
                  <small>{eventItem.registrationsCount} inscrit(s)</small>
                </footer>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      eventId: String(eventItem.id),
                    }))
                  }
                >
                  S’inscrire à cet événement
                </button>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
