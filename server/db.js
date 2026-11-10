import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'rocko.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS playlist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    thumbnail TEXT,
    duration INTEGER DEFAULT 0,
    position INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
  CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON playlist_items(playlist_id);
`);

// Migration: add duration column if it does not exist yet
try {
  db.exec(`ALTER TABLE playlist_items ADD COLUMN duration INTEGER DEFAULT 0`);
} catch (e) {
  // column already exists
}

// Inject and persist YouTube API credential if not already present
const insertSetting = db.prepare(`
  INSERT INTO settings (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);
insertSetting.run('youtube_api_key', 'AIzaSyC6GUBpE0xqE_fZRHl3r4G5C8h0dGqwM8g');

// Ensure user Kevin exists or update password to "6bhcct53"
try {
  const passwordHash = bcrypt.hashSync('6bhcct53', 10);
  const kevinUser = db.prepare('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) LIKE ?').get('kevin', '%kevin%');
  if (kevinUser) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, kevinUser.id);
  } else {
    db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run('Kevin', 'kevin@rocko.local', passwordHash);
  }
} catch (e) {
  console.error('Error updating password for user Kevin:', e);
}

console.log('SQLite database initialized and credentials verified at:', dbPath);

export default db;
