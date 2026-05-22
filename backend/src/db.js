import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import Database from 'better-sqlite3'

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))
const databasePath = process.env.SQLITE_PATH ?? path.resolve(moduleDirectory, '../data/events.db')
const schemaPath = path.resolve(moduleDirectory, '../sql/init.sql')

fs.mkdirSync(path.dirname(databasePath), { recursive: true })

const shouldSeedDatabase = !fs.existsSync(databasePath)
const db = new Database(databasePath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS administrators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE (event_id, email)
  );
`)

function hashPassword(password) {
  return createHash('sha256').update(String(password)).digest('hex')
}

const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@events.local'
const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@1234!'
const adminPasswordHash = hashPassword(adminPassword)

const insertAdmin = db.prepare(`
  INSERT OR IGNORE INTO administrators (email, password_hash)
  VALUES (?, ?)
`)

insertAdmin.run(adminEmail.toLowerCase(), adminPasswordHash)

if (shouldSeedDatabase) {
  const schema = fs.readFileSync(schemaPath, 'utf8')
  db.exec(schema)
}

export { db }