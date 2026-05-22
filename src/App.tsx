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

type RegistrationItem = {
  id: number
  eventId: number
  fullName: string
  email: string
  createdAt: string
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

function toDatetimeLocalValue(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000

  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function sortEvents(eventsList: EventItem[]) {
  return [...eventsList].sort(
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  )
}

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
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [selectedRegistrationsEventId, setSelectedRegistrationsEventId] = useState<number | null>(
    null,
  )
  const [selectedRegistrations, setSelectedRegistrations] = useState<RegistrationItem[]>([])
  const [loadingRegistrationsEventId, setLoadingRegistrationsEventId] = useState<number | null>(
    null,
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null)

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

  useEffect(() => {
    let active = true

    async function fetchEvents() {
      try {
        const response = await fetch(`${apiBase}/api/events`)

        if (!response.ok) {
          throw new Error('Impossible de charger les événements')
        }

        const data = (await response.json()) as EventItem[]

        if (!active) {
          return
        }

        setEvents(sortEvents(data))
        setError(null)
      } catch (caughtError) {
        if (!active) {
          return
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Une erreur inattendue est survenue',
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void fetchEvents()

    return () => {
      active = false
    }
  }, [])

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

  function startEditingEvent(eventItem: EventItem) {
    setEditingEventId(eventItem.id)
    setEventForm({
      title: eventItem.title,
      description: eventItem.description,
      startsAt: toDatetimeLocalValue(eventItem.startsAt),
      location: eventItem.location,
      category: eventItem.category,
    })
    setAdminSuccess(null)
    setError(null)
  }

  function cancelEditingEvent() {
    setEditingEventId(null)
    setEventForm(initialEventForm)
    setAdminSuccess(null)
    setError(null)
  }

  async function handleShowRegistrations(eventItem: EventItem) {
    try {
      setLoadingRegistrationsEventId(eventItem.id)
      setError(null)
      setAdminSuccess(null)

      const response = await fetch(`${apiBase}/api/events/${eventItem.id}/registrations`)

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null

        throw new Error(payload?.error ?? 'Impossible de lire les inscrits')
      }

      const payload = (await response.json()) as {
        event: EventItem
        registrations: RegistrationItem[]
      }

      setSelectedRegistrationsEventId(payload.event.id)
      setSelectedRegistrations(payload.registrations)
      setAdminSuccess(
        payload.registrations.length > 0
          ? `${payload.registrations.length} inscrit(s) pour ${payload.event.title}`
          : `Aucun inscrit pour ${payload.event.title}`,
      )
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Une erreur inattendue est survenue',
      )
    } finally {
      setLoadingRegistrationsEventId(null)
    }
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

      const isEditing = editingEventId !== null
      const endpoint = isEditing
        ? `${apiBase}/api/events/${editingEventId}`
        : `${apiBase}/api/events`

      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
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
      setEvents((currentEvents) =>
        sortEvents(
          isEditing
            ? currentEvents.map((currentEvent) =>
                currentEvent.id === createdEvent.id ? createdEvent : currentEvent,
              )
            : [...currentEvents, createdEvent],
        ),
      )
      setEventForm(initialEventForm)
      setEditingEventId(null)
      setAdminSuccess(
        isEditing
          ? `Événement mis à jour: ${createdEvent.title}`
          : `Événement créé: ${createdEvent.title}`,
      )
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

  async function handleDeleteEvent(eventItem: EventItem) {
    const confirmed = window.confirm(
      `Supprimer l’événement « ${eventItem.title} » ? Cette action est irréversible.`,
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingEventId(eventItem.id)
      setError(null)
      setAdminSuccess(null)

      const response = await fetch(`${apiBase}/api/events/${eventItem.id}`, {
        method: 'DELETE',
      })

      if (!response.ok && response.status !== 204) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null

        throw new Error(payload?.error ?? 'Impossible de supprimer l’événement')
      }

      setEvents((currentEvents) => currentEvents.filter((currentEvent) => currentEvent.id !== eventItem.id))

      if (selectedRegistrationsEventId === eventItem.id) {
        setSelectedRegistrationsEventId(null)
        setSelectedRegistrations([])
      }

      if (editingEventId === eventItem.id) {
        cancelEditingEvent()
      }

      setAdminSuccess(`Événement supprimé: ${eventItem.title}`)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Une erreur inattendue est survenue',
      )
    } finally {
      setDeletingEventId(null)
    }
  }

  const nextEvent = events[0]
  const selectedEvent = events.find((eventItem) => String(eventItem.id) === form.eventId)
  const selectedAdminEvent = events.find((eventItem) => eventItem.id === selectedRegistrationsEventId)

  const displayedEvents = events.filter((eventItem) => {
    const q = searchQuery.trim().toLowerCase()

    if (q) {
      const hay = `${eventItem.title} ${eventItem.description} ${eventItem.location} ${eventItem.category}`.toLowerCase()
      if (!hay.includes(q)) {
        return false
      }
    }

    if (filterDate) {
      try {
        const target = new Date(filterDate).toISOString().slice(0, 10)
        const ev = new Date(eventItem.startsAt).toISOString().slice(0, 10)
        if (ev !== target) {
          return false
        }
      } catch {
        // ignore invalid date filter
      }
    }

    return true
  })

  if (route === 'admin') {
    return (
      <main className="app-shell">
        <section className="hero-panel">
          <div className="hero-copy">
            <span className="eyebrow">Espace admin</span>
            <h1>Créer, modifier ou supprimer un événement</h1>
            <p>
              Cette page permet à l’administrateur d’ajouter un nouvel événement, de mettre à
              jour un événement existant ou de le supprimer.
            </p>
            <div className="page-actions">
              <button type="button" className="secondary-button" onClick={() => navigateTo('/')}>
                Retour à la page visiteur
              </button>
            </div>
          </div>
        </section>

        <section className="content-grid">
          <form className="panel form-panel" onSubmit={handleAdminSubmit}>
            <div className="section-heading">
              <span className="eyebrow">Admin</span>
              <h2>{editingEventId ? 'Modifier l’événement' : 'Publier un nouvel événement'}</h2>
              {editingEventId ? (
                <p className="muted">Tu modifies l’événement sélectionné dans la liste.</p>
              ) : null}
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

            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={creating}>
                {creating
                  ? editingEventId
                    ? 'Mise à jour...'
                    : 'Création...'
                  : editingEventId
                    ? 'Mettre à jour l’événement'
                    : 'Créer l’événement'}
              </button>
              {editingEventId ? (
                <button type="button" className="secondary-button" onClick={cancelEditingEvent}>
                  Annuler la modification
                </button>
              ) : null}
            </div>
          </form>

          <section className="panel list-panel">
            <div className="section-heading">
              <span className="eyebrow">Gestion</span>
              <h2>Événements existants</h2>
            </div>

            {loading ? <p className="muted">Chargement des événements...</p> : null}
            {!loading && events.length === 0 ? (
              <p className="muted">Aucun événement n’est encore publié.</p>
            ) : null}
            {!loading && events.length > 0 ? (
              <>
                <div className="search-controls">
                  <input
                    placeholder="Rechercher par mot-clé (titre, description, lieu, catégorie)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    aria-label="Filtrer par date"
                  />
                  <button type="button" className="secondary-button" onClick={() => { setSearchQuery(''); setFilterDate('') }}>
                    Réinitialiser
                  </button>
                </div>

                {displayedEvents.length === 0 ? (
                  <p className="muted">Aucun événement ne correspond aux filtres.</p>
                ) : null}

                <div className="event-list">
                  {displayedEvents.map((eventItem) => (
                <article
                  key={eventItem.id}
                  className={`event-card${editingEventId === eventItem.id ? ' event-card--active' : ''}`}
                >
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
                  <div className="event-card__actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => startEditingEvent(eventItem)}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleShowRegistrations(eventItem)}
                      disabled={loadingRegistrationsEventId === eventItem.id}
                    >
                      {loadingRegistrationsEventId === eventItem.id ? 'Chargement...' : 'Voir inscrits'}
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={deletingEventId === eventItem.id}
                      onClick={() => handleDeleteEvent(eventItem)}
                    >
                      {deletingEventId === eventItem.id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                </article>
              ))}
            </div>

                {selectedAdminEvent ? (
                  <section className="registrations-panel">
                    <div className="section-heading">
                      <span className="eyebrow">Inscriptions</span>
                      <h3>{selectedAdminEvent.title}</h3>
                      <p className="muted">
                        {selectedRegistrations.length > 0
                          ? `${selectedRegistrations.length} personne(s) inscrite(s)`
                          : 'Aucune inscription pour cet événement.'}
                      </p>
                    </div>

                    {selectedRegistrations.length > 0 ? (
                      <ul className="registration-list">
                        {selectedRegistrations.map((registration) => (
                          <li key={registration.id}>
                            <strong>{registration.fullName}</strong>
                            <span>{registration.email}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ) : null}
              </>
            ) : null}
          </section>
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
                {displayedEvents.map((eventItem) => (
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

            <div className="search-controls">
              <input
                placeholder="Rechercher par mot-clé (titre, description, lieu, catégorie)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                aria-label="Filtrer par date"
              />
              <button type="button" className="secondary-button" onClick={() => { setSearchQuery(''); setFilterDate('') }}>
                Réinitialiser
              </button>
            </div>

          {loading ? <p className="muted">Chargement des événements...</p> : null}
          {!loading && events.length === 0 ? (
            <p className="muted">Aucun événement à venir pour l’instant.</p>
          ) : null}

          <div className="event-list">
            {displayedEvents.map((eventItem) => (
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
