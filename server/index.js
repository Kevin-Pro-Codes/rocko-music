import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'rocko_secret_jwt_key_default';

app.use(cors());
app.use(express.json());

// Auth middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Register
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const insert = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
    const info = insert.run(username, email, hash);
    const user = { id: Number(info.lastInsertRowid), username, email };
    const token = jwt.sign({ id: user.id, username }, JWT_SECRET);
    res.json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'User already exists' });
    }
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all playlists for user
app.get('/api/playlists', authenticate, (req, res) => {
  try {
    const playlists = db.prepare('SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(playlists);
  } catch (err) {
    console.error('Get playlists error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create playlist
app.post('/api/playlists', authenticate, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Playlist name required' });
  try {
    const insert = db.prepare('INSERT INTO playlists (user_id, name) VALUES (?, ?)');
    const info = insert.run(req.user.id, name);
    const newPlaylist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(info.lastInsertRowid);
    res.json(newPlaylist);
  } catch (err) {
    console.error('Create playlist error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete playlist
app.delete('/api/playlists/:id', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM playlists WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete playlist error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get playlist items
app.get('/api/playlists/:id/items', authenticate, (req, res) => {
  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    const items = db.prepare('SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY position ASC').all(req.params.id);
    res.json(items);
  } catch (err) {
    console.error('Get playlist items error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add item to playlist
app.post('/api/playlists/:id/items', authenticate, (req, res) => {
  const { video_id, title, thumbnail } = req.body;
  if (!video_id || !title) return res.status(400).json({ error: 'video_id and title required' });
  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    const posRow = db.prepare('SELECT COUNT(*) as count FROM playlist_items WHERE playlist_id = ?').get(req.params.id);
    const position = posRow.count;
    
    const insert = db.prepare(`
      INSERT INTO playlist_items (playlist_id, video_id, title, thumbnail, position)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = insert.run(req.params.id, video_id, title, thumbnail || null, position);
    const item = db.prepare('SELECT * FROM playlist_items WHERE id = ?').get(info.lastInsertRowid);
    res.json(item);
  } catch (err) {
    console.error('Add playlist item error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove item from playlist
app.delete('/api/playlists/:id/items/:itemId', authenticate, (req, res) => {
  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    db.prepare('DELETE FROM playlist_items WHERE id = ? AND playlist_id = ?').run(req.params.itemId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Remove playlist item error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get YouTube API credential from SQLite
app.get('/api/config/youtube-key', (req, res) => {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('youtube_api_key');
    res.json({ apiKey: row?.value || 'AIzaSyC6GUBpE0xqE_fZRHl3r4G5C8h0dGqwM8g' });
  } catch (err) {
    console.error('Get API key error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update YouTube API credential in SQLite
app.post('/api/config/youtube-key', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'apiKey required' });
  try {
    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run('youtube_api_key', apiKey.trim());
    res.json({ success: true, apiKey: apiKey.trim() });
  } catch (err) {
    console.error('Set API key error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`SQLite database active at server/rocko.db`);
});
