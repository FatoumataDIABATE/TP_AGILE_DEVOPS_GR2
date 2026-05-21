import pg from 'pg'

const { Pool } = pg

const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.PGHOST ?? 'localhost',
      port: Number(process.env.PGPORT ?? 5432),
      user: process.env.PGUSER ?? 'events',
      password: process.env.PGPASSWORD ?? 'events',
      database: process.env.PGDATABASE ?? 'eventsdb',
    }

export const pool = new Pool(connectionConfig)