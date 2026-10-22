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

// Add batch items to playlist (album / artist discography)
app.post('/api/playlists/:id/batch-items', authenticate, (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array is required' });
  }

  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const posRow = db.prepare('SELECT COUNT(*) as count FROM playlist_items WHERE playlist_id = ?').get(req.params.id);
    let startPos = posRow.count;

    const insert = db.prepare(`
      INSERT INTO playlist_items (playlist_id, video_id, title, thumbnail, position)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((songs) => {
      for (const song of songs) {
        const vid = song.videoId || song.video_id;
        if (vid && song.title) {
          insert.run(req.params.id, vid, song.title, song.thumbnail || null, startPos++);
        }
      }
    });

    insertMany(items);
    const updatedItems = db.prepare('SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY position ASC').all(req.params.id);
    res.json(updatedItems);
  } catch (err) {
    console.error('Batch add playlist items error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
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

// Proxy search for YouTube music, albums, and artist tracks without quota limits
app.get('/api/search/proxy', async (req, res) => {
  const { q, type } = req.query;
  if (!q) return res.status(400).json({ error: 'Query q is required' });

  try {
    const searchQuery = type === 'albums' 
      ? `${q} full album playlist` 
      : type === 'artist' 
      ? `${q} official audio music` 
      : `${q} audio`;

    const encoded = encodeURIComponent(searchQuery);
    const searchUrl = `https://www.youtube.com/results?search_query=${encoded}&sp=EgIQAQ%253D%253D`; // filter for videos or playlists

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const html = await response.text();
    const jsonMatch = html.match(/var ytInitialData = ({.*?});<\/script>/) || html.match(/window\["ytInitialData"\] = ({.*?});<\/script>/);

    if (!jsonMatch) {
      return res.json([]);
    }

    const data = JSON.parse(jsonMatch[1]);
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

    const results = [];
    for (const item of contents) {
      if (item.videoRenderer) {
        const v = item.videoRenderer;
        const videoId = v.videoId;
        const title = v.title?.runs?.[0]?.text || '';
        const artist = v.ownerText?.runs?.[0]?.text || v.channelTitle || 'Artist';
        const thumbnail = v.thumbnail?.thumbnails?.[v.thumbnail?.thumbnails?.length - 1]?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

        if (videoId && title) {
          results.push({
            videoId,
            title,
            artist,
            thumbnail,
            channelTitle: artist
          });
        }
      } else if (item.playlistRenderer && type === 'albums') {
        const p = item.playlistRenderer;
        const playlistId = p.playlistId;
        const title = p.title?.simpleText || p.title?.runs?.[0]?.text || '';
        const artist = p.shortBylineText?.runs?.[0]?.text || 'Album';
        const thumbnail = p.thumbnails?.[0]?.thumbnails?.[0]?.url || '';

        if (playlistId && title) {
          results.push({
            id: playlistId,
            playlistId,
            title,
            artist,
            thumbnail,
            description: 'Full Album Playlist'
          });
        }
      }

      if (results.length >= 25) break;
    }

    res.json(results);
  } catch (err) {
    console.error('Proxy search error:', err);
    res.status(500).json({ error: 'Failed to proxy search: ' + err.message });
  }
});

// Proxy to extract playlist items from YouTube playlist HTML without API key quota
app.get('/api/search/playlist-tracks', async (req, res) => {
  const { playlistId } = req.query;
  if (!playlistId) return res.status(400).json({ error: 'playlistId is required' });

  try {
    const url = `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const html = await response.text();
    const jsonMatch = html.match(/var ytInitialData = ({.*?});<\/script>/) || html.match(/window\["ytInitialData"\] = ({.*?});<\/script>/);

    if (!jsonMatch) {
      return res.json([]);
    }

    const data = JSON.parse(jsonMatch[1]);
    const items = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents || [];

    const tracks = [];
    for (const item of items) {
      const v = item.playlistVideoRenderer;
      if (v && v.videoId && v.title?.runs?.[0]?.text) {
        tracks.push({
          videoId: v.videoId,
          title: v.title.runs[0].text,
          artist: v.shortBylineText?.runs?.[0]?.text || 'Artist',
          thumbnail: v.thumbnail?.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`
        });
      }
    }

    res.json(tracks);
  } catch (err) {
    console.error('Proxy playlist tracks error:', err);
    res.status(500).json({ error: 'Failed to fetch playlist tracks' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`SQLite database active at server/rocko.db`);
});
