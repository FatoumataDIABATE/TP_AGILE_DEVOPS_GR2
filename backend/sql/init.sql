CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO events (title, description, starts_at, location, category)
VALUES
  (
    'Atelier Kubernetes',
    'Prise en main des déploiements et des manifests de base.',
    '2026-05-24T09:00:00Z',
    'Lyon - salle Atlas',
    'Atelier'
  ),
  (
    'Conférence DevOps',
    'Retour d''expérience sur CI/CD, observabilité et automatisation.',
    '2026-05-28T14:00:00Z',
    'Paris - auditorium 2',
    'Conférence'
  ),
  (
    'Meetup Cloud',
    'Présentation de cas d''usage cloud et discussion avec la communauté.',
    '2026-06-02T18:30:00Z',
    'Marseille - coworking Horizon',
    'Meetup'
  )
ON CONFLICT DO NOTHING;