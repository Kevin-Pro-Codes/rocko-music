import { useState, useEffect } from 'react';
import { Music, LogIn, LogOut, User, MoreVertical, Music2, Disc, Mic } from 'lucide-react';
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

  const [searchMode, setSearchMode] = useState('songs');
  const [showModeMenu, setShowModeMenu] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 flex-shrink-0">
              <Music className="w-8 h-8 text-blue-600 flex-shrink-0" />
              {/* Oculta o título de texto quando a tela/espaço encurta, para não quebrar em várias linhas */}
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 whitespace-nowrap hidden xl:block select-none">
                Rocko Music Player
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-72 sm:w-80 md:w-96">
                <SearchBar
                  onAddToPlaylist={handleAddToPlaylist}
                  onPlayNow={handlePlayNow}
                  onAddBatchToPlaylist={handleAddBatchToPlaylist}
                  onPlayAlbum={handlePlayAlbum}
                  searchMode={searchMode}
                  onSearchModeChange={setSearchMode}
                  hideModeButtons={true}
                />
              </div>

              {/* 3 Dots Menu: Placed to the left of the user logged in area */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowModeMenu(prev => !prev)}
                  className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                    showModeMenu ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Filter mode: Song, Album, Artist"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {showModeMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowModeMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        Search By
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchMode('songs');
                          setShowModeMenu(false);
                        }}
                        className={`w-full flex items-center px-3 py-2 text-sm transition-colors ${
                          searchMode === 'songs' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Music2 className="w-4 h-4 mr-2" />
                        <span>Song</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSearchMode('albums');
                          setShowModeMenu(false);
                        }}
                        className={`w-full flex items-center px-3 py-2 text-sm transition-colors ${
                          searchMode === 'albums' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Disc className="w-4 h-4 mr-2" />
                        <span>Album</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSearchMode('artist');
                          setShowModeMenu(false);
                        }}
                        className={`w-full flex items-center px-3 py-2 text-sm transition-colors ${
                          searchMode === 'artist' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        <span>Artist</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* User Logged In Place */}
              {user ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 flex items-center whitespace-nowrap bg-gray-100 px-2.5 py-1.5 rounded-lg">
                    <User className="w-4 h-4 mr-1 text-gray-500" />
                    {user.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm whitespace-nowrap"
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
              onMergePlaylist={(sourcePlaylist, items) => {
                handleAddBatchToPlaylist(`${sourcePlaylist.name} (Copy)`, items);
              }}
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 truncate mr-3" title={currentPlaylist.name}>
                      Now Playing: {currentPlaylist.name}
                    </h3>
                    <button
                      onClick={() => handleAddBatchToPlaylist(currentPlaylist.name, currentPlaylist.items)}
                      className="flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors"
                      title="Save or merge all these songs into another playlist"
                    >
                      <span>Save as Playlist</span>
                    </button>
                  </div>
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
                        <div className="flex items-center space-x-3 flex-1 min-w-0 pr-3">
                          <div className="w-8 text-center flex-shrink-0">
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
                            <p
                              className="font-medium text-gray-800 truncate block w-full max-w-full"
                              title={song.title}
                            >
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
