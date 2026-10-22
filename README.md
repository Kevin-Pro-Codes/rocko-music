# 🎵 Rocko Music Player

**Rocko** is a modern, lightweight, full-stack music streaming and playlist management application powered by the YouTube IFrame & Data APIs, built with **React 19**, **Vite**, **Tailwind CSS**, and a **Node.js/Express + SQLite** backend.

---

## ✨ Features

- **🎧 Seamless YouTube Audio Playback**: Background audio playback powered by the YouTube IFrame API without video clutter.
- **🔍 YouTube Music Search**: Real-time track search with automated video categorization and thumbnail retrieval.
- **📁 Custom Playlists**: Create, manage, expand, and delete personal playlists with automatic ordering and persistent storage.
- **🔒 Local Authentication**: JWT-based login and registration with bcrypt hashed credentials.
- **💾 SQLite Persistence (`better-sqlite3`)**: High-performance WAL-mode local database storing users, playlists, playlist tracks, and system settings.
- **🎨 Sleek Minimalist UI**: Clean modern design built with the **Quicksand** typography, refined soft-gray layout palette, Lucide icons, and zero visual flickering.
- **⚡ One-Click Startup**: Includes a ready-to-use Windows launcher script (`run.bat`) to launch both client and backend servers in parallel.

---

## 🛠️ Architecture & Tech Stack

### Frontend (`/client`)
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Typography**: Google Fonts ([Quicksand](https://fonts.google.com/specimen/Quicksand))

### Backend (`/server`)
- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Framework**: [Express 5](https://expressjs.com/)
- **Database**: [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (SQLite in WAL mode)
- **Security**: [bcryptjs](https://github.com/dcodeIO/bcrypt.js) for password hashing & [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) for auth tokens
- **CORS & Environment**: `cors`, `dotenv`

---

## 📁 Project Structure

```
Rocko/
├── client/                     # Frontend Vite + React application
│   ├── public/                 # Static assets (favicons, SVG icons)
│   ├── src/
│   │   ├── assets/             # Images and design resources
│   │   ├── components/         # React UI Components
│   │   │   ├── AddToPlaylistModal.jsx
│   │   │   ├── ApiKeySetup.jsx
│   │   │   ├── AuthModal.jsx
│   │   │   ├── MusicPlayer.jsx
│   │   │   ├── PlaylistManager.jsx
│   │   │   └── SearchBar.jsx
│   │   ├── services/           # API and Player Integration
│   │   │   ├── api.js          # Backend REST Client
│   │   │   ├── youtube.js      # YouTube IFrame Player wrapper
│   │   │   └── youtubeDataAPI.js # YouTube Search Client
│   │   ├── App.jsx             # Main Application Layout
│   │   ├── index.css           # Global Tailwind & Quicksand styles
│   │   └── main.jsx            # React root mount
│   ├── index.html              # HTML entry with font preconnect
│   ├── package.json
│   └── vite.config.js
├── server/                     # Backend API server
│   ├── db.js                   # SQLite database initialization & migrations
│   ├── index.js                # Express REST routes & controllers
│   ├── schema.sql              # Database schema definitions
│   ├── rocko.db                # SQLite database file
│   └── package.json
├── run.bat                     # Windows batch launcher (starts both client & server)
├── .gitignore                  # Git exclusions for node_modules, temp db files, etc.
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Kevin-Pro-Codes/rocko-music.git
   cd rocko-music
   ```

2. **Install backend dependencies:**
   ```bash
   cd server
   npm install
   cd ..
   ```

3. **Install frontend dependencies:**
   ```bash
   cd client
   npm install
   cd ..
   ```

---

## 🏃 Running the Application

### Option A: Using the Windows Launcher Script
Double-click `run.bat` or run:
```cmd
run.bat
```
This opens two parallel terminal windows launching both the backend and frontend dev servers.

### Option B: Manual Startup

1. **Start the backend server** (Port `3001`):
   ```bash
   cd server
   npm run dev
   ```

2. **Start the frontend application** (Port `5173`):
   ```bash
   cd client
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

## 🗄️ Database & Configuration

The application stores data in a local SQLite file located at `server/rocko.db`:

- **`users`**: User accounts (username, email, password hash).
- **`playlists`**: User-created playlists.
- **`playlist_items`**: Tracks added to playlists (YouTube video ID, title, thumbnail, ordering).
- **`settings`**: Key-value system configurations, including persisted YouTube Data API credentials (`youtube_api_key`).

---

## 📜 License

This project is licensed under the MIT License.
