import { useState, useEffect } from 'react';
import { Music, LogIn, LogOut, User } from 'lucide-react';
import MusicPlayer from './components/MusicPlayer';
import PlaylistManager from './components/PlaylistManager';
import SearchBar from './components/SearchBar';
import AddToPlaylistModal from './components/AddToPlaylistModal';
import AuthModal from './components/AuthModal';
import ApiKeySetup from './components/ApiKeySetup';
import './App.css';

function App() {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState(null);
  const [selectedBatchSongs, setSelectedBatchSongs] = useState([]);
  const [defaultPlaylistTitle, setDefaultPlaylistTitle] = useState('');
  const [playlistRefreshTrigger, setPlaylistRefreshTrigger] = useState(0);
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) return JSON.parse(savedUser);
      const token = localStorage.getItem('token');
      if (token) return { username: 'Kevin' };
    } catch {
      // fallback
    }
    return { username: 'Kevin' };
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const handleSongEnd = () => handleNext();

  const handleNext = () => {
    if (currentPlaylist && currentPlaylist.items && currentPlaylist.items.length > 0) {
      const nextIndex = (currentSongIndex + 1) % currentPlaylist.items.length;
      setCurrentSongIndex(nextIndex);
      setCurrentSong(currentPlaylist.items[nextIndex]);
      setIsPlaying(true);
    }
  };

  const handlePrevious = () => {
    if (currentPlaylist && currentPlaylist.items && currentPlaylist.items.length > 0) {
      const prevIndex = currentSongIndex === 0 ? currentPlaylist.items.length - 1 : currentSongIndex - 1;
      setCurrentSongIndex(prevIndex);
      setCurrentSong(currentPlaylist.items[prevIndex]);
      setIsPlaying(true);
    }
  };

  const handleSelectSong = (song) => {
    if (currentPlaylist && currentPlaylist.items) {
      const songIndex = currentPlaylist.items.findIndex(s => (s.videoId || s.video_id || s.id) === (song.videoId || song.video_id || song.id));
      if (songIndex !== -1) setCurrentSongIndex(songIndex);
    }
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const handleSelectPlaylist = (playlist, items) => {
    setCurrentPlaylist({ ...playlist, items });
    if (items && items.length > 0) {
      setCurrentSong(items[0]);
      setCurrentSongIndex(0);
      setIsPlaying(true);
    } else {
      setCurrentSong(null);
      setIsPlaying(false);
      setCurrentSongIndex(0);
    }
  };

  const handlePlayNow = (song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    setCurrentSongIndex(0);
  };

  // Play entire album directly in queue
  const handlePlayAlbum = (albumTitle, tracks) => {
    if (!tracks || tracks.length === 0) return;
    const virtualPlaylist = {
      id: 'album-' + Date.now(),
      name: albumTitle,
      items: tracks
    };
    setCurrentPlaylist(virtualPlaylist);
    setCurrentSong(tracks[0]);
    setCurrentSongIndex(0);
    setIsPlaying(true);
  };

  const handleAddToPlaylist = (song) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSelectedSongForPlaylist(song);
    setSelectedBatchSongs([]);
    setDefaultPlaylistTitle('');
    setShowAddToPlaylistModal(true);
  };

  const handleAddBatchToPlaylist = (collectionName, songs) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSelectedSongForPlaylist(null);
    setSelectedBatchSongs(songs);
    setDefaultPlaylistTitle(collectionName);
    setShowAddToPlaylistModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPlaylist(null);
    setCurrentSong(null);
    setIsPlaying(false);
  };

  const handleAuth = (userData) => {
    setUser(userData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Music className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Rocko Music Player</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-80 md:w-96">
                <SearchBar
                  onAddToPlaylist={handleAddToPlaylist}
                  onPlayNow={handlePlayNow}
                  onAddBatchToPlaylist={handleAddBatchToPlaylist}
                  onPlayAlbum={handlePlayAlbum}
                />
              </div>
              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-700 flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {user.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <PlaylistManager
              key={`pm-${playlistRefreshTrigger}`}
              onSelectPlaylist={handleSelectPlaylist}
              onSelectSong={handleSelectSong}
              currentPlaylistId={currentPlaylist?.id}
              user={user}
            />
          </div>

          <div className="lg:col-span-2">
            <div className="space-y-6">
              <MusicPlayer
                currentSong={currentSong}
                isPlaying={isPlaying}
                onPlay={handlePlay}
                onPause={handlePause}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onSongEnd={handleSongEnd}
              />

              {currentPlaylist && currentPlaylist.items && currentPlaylist.items.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Now Playing: {currentPlaylist.name}
                  </h3>
                  <div className="space-y-2">
                    {currentPlaylist.items.map((song, index) => (
                      <div
                        key={song.id || `${song.videoId}-${index}`}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${currentSong?.id === song.id || (currentSong?.videoId && currentSong.videoId === song.videoId)
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50'
                          }`}
                        onClick={() => handleSelectSong(song)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 text-center">
                            {(currentSong?.id === song.id || (currentSong?.videoId && currentSong.videoId === song.videoId)) && isPlaying ? (
                              <div className="flex items-center justify-center space-x-1">
                                <div className="w-1 h-3 bg-blue-600 animate-pulse"></div>
                                <div className="w-1 h-3 bg-blue-600 animate-pulse delay-75"></div>
                                <div className="w-1 h-3 bg-blue-600 animate-pulse delay-150"></div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">{index + 1}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">
                              {song.title}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <AddToPlaylistModal
        song={selectedSongForPlaylist}
        songs={selectedBatchSongs}
        defaultPlaylistName={defaultPlaylistTitle}
        isOpen={showAddToPlaylistModal}
        onClose={() => {
          setShowAddToPlaylistModal(false);
          setSelectedSongForPlaylist(null);
          setSelectedBatchSongs([]);
          setDefaultPlaylistTitle('');
        }}
        onPlaylistUpdated={() => {
          setPlaylistRefreshTrigger(prev => prev + 1);
        }}
        user={user}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuth={handleAuth}
      />

      <ApiKeySetup onApiKeySet={() => setShowApiKeySetup(false)} />
    </div>
  );
}

export default App;
