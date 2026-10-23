import { useState, useEffect } from 'react';
import { Music, LogIn, LogOut, User, MoreVertical, Music2, Disc, Mic, Sparkles, PlayCircle, ShieldCheck, ListMusic, Compass, ArrowRight, Trash2, Plus } from 'lucide-react';
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
      if (token) {
        // If there is a token but no user object, try to reconstruct or keep minimal session
        return { username: 'User' };
      }
    } catch {
      // fallback
    }
    return null;
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);

  const [targetPlaylistId, setTargetPlaylistId] = useState('');

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
    setTargetPlaylistId('');
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
    setTargetPlaylistId('');
    setShowAddToPlaylistModal(true);
  };

  // Add song to a specific playlist (from playlist + button)
  const handleAddSongToSpecificPlaylist = (playlist) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    // Prompts search or preselects playlist in modal if song already playing
    if (currentSong) {
      setSelectedSongForPlaylist(currentSong);
      setSelectedBatchSongs([]);
      setDefaultPlaylistTitle('');
      setTargetPlaylistId(playlist.id);
      setShowAddToPlaylistModal(true);
    } else {
      setTargetPlaylistId(playlist.id);
      setSelectedSongForPlaylist(null);
      setSelectedBatchSongs([]);
      setDefaultPlaylistTitle('');
      setShowAddToPlaylistModal(true);
    }
  };

  // Callback when a playlist is renamed or an item is removed
  const handlePlaylistMutated = (mutatedPlaylistId, updatedItems) => {
    if (currentPlaylist && (currentPlaylist.id === mutatedPlaylistId || !mutatedPlaylistId)) {
      if (updatedItems) {
        setCurrentPlaylist(prev => ({ ...prev, items: updatedItems }));
        // If the removed song was the active song, play the next available
        if (currentSong && !updatedItems.some(item => item.id === currentSong.id)) {
          if (updatedItems.length > 0) {
            setCurrentSong(updatedItems[0]);
            setCurrentSongIndex(0);
          } else {
            setCurrentSong(null);
            setIsPlaying(false);
          }
        }
      }
    }
    setPlaylistRefreshTrigger(prev => prev + 1);
  };

  // Direct remove song from Now Playing playlist
  const handleRemoveFromNowPlaying = async (song, e) => {
    e.stopPropagation();
    if (!currentPlaylist || !currentPlaylist.id || typeof currentPlaylist.id === 'string' && currentPlaylist.id.startsWith('album-')) {
      // Temporary/album queue, remove locally
      const updated = currentPlaylist.items.filter(item => (item.id || item.videoId) !== (song.id || song.videoId));
      setCurrentPlaylist(prev => ({ ...prev, items: updated }));
      return;
    }

    try {
      const { playlists } = await import('./services/api');
      await playlists.removeItem(currentPlaylist.id, song.id);
      const res = await playlists.getItems(currentPlaylist.id);
      setCurrentPlaylist(prev => ({ ...prev, items: res.data }));
      setPlaylistRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error removing song from current playlist:', err);
    }
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
              {user && (
                <>
                  <div className="w-80 sm:w-96 md:w-[480px] lg:w-[540px]">
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
                      className={`p-2 rounded-lg transition-colors flex items-center justify-center ${showModeMenu ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
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
                              setSearchMode('all');
                              setShowModeMenu(false);
                            }}
                            className={`w-full flex items-center px-3 py-2 text-sm transition-colors ${searchMode === 'all' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            <Compass className="w-4 h-4 mr-2" />
                            <span>All</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSearchMode('songs');
                              setShowModeMenu(false);
                            }}
                            className={`w-full flex items-center px-3 py-2 text-sm transition-colors ${searchMode === 'songs' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
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
                            className={`w-full flex items-center px-3 py-2 text-sm transition-colors ${searchMode === 'albums' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
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
                            className={`w-full flex items-center px-3 py-2 text-sm transition-colors ${searchMode === 'artist' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            <Mic className="w-4 h-4 mr-2" />
                            <span>Artist</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

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
                  className="flex items-center space-x-1.5 px-3 py-2 bg-white text-black border border-black rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4 text-black" />
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1050px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-7 xl:col-span-7">
              <PlaylistManager
                key={`pm-${playlistRefreshTrigger}`}
                onSelectPlaylist={handleSelectPlaylist}
                onSelectSong={handleSelectSong}
                onMergePlaylist={(sourcePlaylist, items) => {
                  handleAddBatchToPlaylist(`${sourcePlaylist.name} (Copy)`, items);
                }}
                onAddSongToPlaylist={handleAddSongToSpecificPlaylist}
                onPlaylistMutated={handlePlaylistMutated}
                currentPlaylistId={currentPlaylist?.id}
                user={user}
              />
            </div>

            <div className="lg:col-span-5 xl:col-span-5 sticky top-6">
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
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {currentPlaylist.id && typeof currentPlaylist.id === 'number' && (
                          <button
                            onClick={() => handleAddSongToSpecificPlaylist(currentPlaylist)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors"
                            title="Add song to this playlist"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Song</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleAddBatchToPlaylist(currentPlaylist.name, currentPlaylist.items)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors"
                          title="Save or merge all these songs into another playlist"
                        >
                          <span>Save as Playlist</span>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {currentPlaylist.items.map((song, index) => (
                        <div
                          key={song.id || `${song.videoId}-${index}`}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer group transition-colors ${currentSong?.id === song.id || (currentSong?.videoId && currentSong.videoId === song.videoId)
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

                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleRemoveFromNowPlaying(song, e)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-70 group-hover:opacity-100"
                              title="Remove song from playlist"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Logged-out Home Page (No player) */
          <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
            {/* Hero Section */}
            <div className="text-center space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold tracking-wide border border-blue-100">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Unlimited Music Streaming & Cloud Playlists</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Your music, your albums, <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  curated in one place.
                </span>
              </h1>

              <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 leading-relaxed">
                Search across millions of songs, full discographies, and albums. Build custom playlists, sync your collection, and enjoy uninterrupted listening.
              </p>

            </div>

            {/* Feature Cards Grid */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Music2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Instant Search</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Search by track, complete album, or artist discography in seconds with smart auto-recommendations.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <ListMusic className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Custom Playlists</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Organize your favorites, create thematic mixtapes, and batch-save entire albums into your library.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-4">
                  <Disc className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Album Playlists</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Listen to full albums in their original sequence with smooth track switching and discrete timeline scrubbing.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <AddToPlaylistModal
        song={selectedSongForPlaylist}
        songs={selectedBatchSongs}
        defaultPlaylistName={defaultPlaylistTitle}
        initialSelectedPlaylistId={targetPlaylistId}
        isOpen={showAddToPlaylistModal}
        onClose={() => {
          setShowAddToPlaylistModal(false);
          setSelectedSongForPlaylist(null);
          setSelectedBatchSongs([]);
          setDefaultPlaylistTitle('');
          setTargetPlaylistId('');
        }}
        onPlaylistUpdated={(playlistId) => {
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
