import { useState, useEffect } from 'react';
import { Search, Plus, Play, Disc, Mic, Music2, FolderPlus } from 'lucide-react';
import youtubeService from '../services/youtube';
import youtubeDataAPI from '../services/youtubeDataAPI';

const SearchBar = ({
  onAddToPlaylist,
  onPlayNow,
  onAddBatchToPlaylist,
  onPlayAlbum,
  searchMode: externalSearchMode,
  onSearchModeChange: externalOnSearchModeChange,
  hideModeButtons = false
}) => {
  const [query, setQuery] = useState('');
  const [internalSearchMode, setInternalSearchMode] = useState('songs'); // 'songs' | 'albums' | 'artist'
  const searchMode = externalSearchMode || internalSearchMode;
  const [results, setResults] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10); // Lazy load initial batch
  const [isSearching, setIsSearching] = useState(false);
  const [loadingAlbumId, setLoadingAlbumId] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(() => {
    return Boolean(
      (typeof window !== 'undefined' ? localStorage.getItem('youtubeApiKey') : null) ||
      youtubeDataAPI.apiKey ||
      'AIzaSyC6GUBpE0xqE_fZRHl3r4G5C8h0dGqwM8g'
    );
  });

  useEffect(() => {
    const apiKey = (typeof window !== 'undefined' ? localStorage.getItem('youtubeApiKey') : null) || youtubeDataAPI.apiKey || 'AIzaSyC6GUBpE0xqE_fZRHl3r4G5C8h0dGqwM8g';
    setHasApiKey(Boolean(apiKey));
  }, []);

  // Debounced search on typing
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch(trimmed, searchMode);
    }, 350);

    return () => clearTimeout(timer);
  }, [query, searchMode]);

  const handleSearch = async (searchQuery, mode = searchMode) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setVisibleCount(10); // Reset lazy load batch for new search
    try {
      let searchResults = [];
      if (mode === 'albums') {
        searchResults = await youtubeDataAPI.searchAlbums(searchQuery, 30);
      } else if (mode === 'artist') {
        searchResults = await youtubeDataAPI.searchByArtist(searchQuery, 40);
      } else if (mode === 'all') {
        searchResults = await youtubeDataAPI.searchAll(searchQuery, 60);
      } else {
        searchResults = await youtubeDataAPI.searchVideos(searchQuery, 50);
      }
      setResults(searchResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Scroll event for lazy loading more fetched items as user scrolls down
  const handleDropdownScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 60) {
      // Near bottom: lazy-load next 10 items
      setVisibleCount(prev => (prev < results.length ? Math.min(prev + 10, results.length) : prev));
    }
  };

  const handleModeChange = (newMode) => {
    if (externalOnSearchModeChange) {
      externalOnSearchModeChange(newMode);
    } else {
      setInternalSearchMode(newMode);
    }
    if (query.trim()) {
      handleSearch(query, newMode);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(query, searchMode);
  };

  const handleAddToPlaylist = (song) => {
    onAddToPlaylist?.(song);
  };

  const handlePlayNow = (song) => {
    onPlayNow?.(song);
    setShowResults(false);
    setQuery('');
  };

  // Play full album or add entire album to playlist
  const handlePlayAlbumAction = async (album) => {
    setLoadingAlbumId(album.playlistId || album.id);
    try {
      let tracks = await youtubeDataAPI.getPlaylistTracks(album.playlistId || album.id);
      if (!tracks || tracks.length === 0) {
        // Fallback: search videos of this album title or treat album as single stream video
        const albumSongs = await youtubeDataAPI.searchVideos(`${album.title} full album`, 15);
        tracks = albumSongs.length > 0 ? albumSongs : [{
          videoId: album.videoId || album.id,
          title: album.title,
          artist: album.artist,
          thumbnail: album.thumbnail
        }];
      }

      if (tracks.length > 0) {
        onPlayAlbum?.(album.title, tracks);
        setShowResults(false);
        setQuery('');
      } else {
        alert('No playable tracks found for this album.');
      }
    } catch (err) {
      console.error('Error playing album:', err);
    } finally {
      setLoadingAlbumId(null);
    }
  };

  const handleAddAlbumToPlaylistAction = async (album) => {
    setLoadingAlbumId(album.playlistId || album.id);
    try {
      let tracks = await youtubeDataAPI.getPlaylistTracks(album.playlistId || album.id);
      if (!tracks || tracks.length === 0) {
        const albumSongs = await youtubeDataAPI.searchVideos(`${album.title} full album`, 15);
        tracks = albumSongs.length > 0 ? albumSongs : [{
          videoId: album.videoId || album.id,
          title: album.title,
          artist: album.artist,
          thumbnail: album.thumbnail
        }];
      }

      if (tracks.length > 0) {
        onAddBatchToPlaylist?.(album.title, tracks);
        setShowResults(false);
      } else {
        alert('No tracks found to add from this album.');
      }
    } catch (err) {
      console.error('Error fetching album tracks:', err);
    } finally {
      setLoadingAlbumId(null);
    }
  };

  // Discography: Playlist entire artist search results
  const handlePlaylistArtistDiscography = () => {
    if (results.length > 0) {
      onAddBatchToPlaylist?.(`${query} - Collection`, results);
      setShowResults(false);
    }
  };

  return (
    <div className="relative">
      {/* Search Mode Filter Buttons (rendered unless moved to header menu) */}
      {!hideModeButtons && (
        <div className="flex items-center space-x-1.5 mb-1.5">
          <button
            type="button"
            onClick={() => handleModeChange('songs')}
            className={`flex items-center px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${searchMode === 'songs'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <Music2 className="w-3.5 h-3.5 mr-1" />
            Songs
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('albums')}
            className={`flex items-center px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${searchMode === 'albums'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <Disc className="w-3.5 h-3.5 mr-1" />
            Albums
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('artist')}
            className={`flex items-center px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${searchMode === 'artist'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <Mic className="w-3.5 h-3.5 mr-1" />
            Artist
          </button>
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={
              searchMode === 'albums'
                ? 'Search albums to playlist full tracks...'
                : searchMode === 'artist'
                  ? 'Search artist discography / top songs...'
                  : 'Search for music tracks...'
            }
            value={query}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              if (val.trim()) {
                setIsSearching(true);
                setShowResults(true);
              } else {
                setIsSearching(false);
                setShowResults(false);
                setResults([]);
              }
            }}
            onFocus={() => query && setShowResults(true)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </form>

      {/* Search Results Dropdown */}
      {showResults && (
        <div
          onScroll={handleDropdownScroll}
          className="absolute z-10 right-0 w-[480px] sm:w-[560px] md:w-[620px] max-w-[90vw] mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-[28rem] overflow-y-auto"
        >
          {isSearching ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2.5">
              <div className="animate-spin rounded-full h-7 w-7 border-3 border-blue-600 border-t-transparent"></div>
              <span className="text-xs text-gray-500 font-medium">Searching music...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              No results found
            </div>
          ) : searchMode === 'albums' ? (
            <div className="divide-y divide-gray-100">
              {results.slice(0, visibleCount).map((album, index) => {
                const isLoadingThisAlbum = loadingAlbumId === (album.playlistId || album.id);
                return (
                  <div
                    key={`${album.playlistId || album.id}-${index}`}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={album.thumbnail}
                        alt={album.title}
                        className="w-16 h-16 rounded object-cover flex-shrink-0 border border-gray-200"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded mb-1">
                          FULL ALBUM
                        </span>
                        <h4 className="font-medium text-gray-800 text-sm leading-snug line-clamp-2" title={album.title}>
                          {album.title}
                        </h4>
                        <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">{album.artist}</p>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <button
                          type="button"
                          disabled={isLoadingThisAlbum}
                          onClick={() => handlePlayAlbumAction(album)}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          title="Play entire album now"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Play</span>
                        </button>
                        <button
                          type="button"
                          disabled={isLoadingThisAlbum}
                          onClick={() => handleAddAlbumToPlaylistAction(album)}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          title="Save all album songs to a playlist"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                          <span>Playlist All</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.slice(0, visibleCount).map((item, index) => {
                const isAlbum = Boolean(item.playlistId || item.description === 'Full Album Playlist');
                const isLoadingThisAlbum = loadingAlbumId === (item.playlistId || item.id);

                return (
                  <div
                    key={`${item.playlistId || item.videoId || item.id}-${index}`}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        loading="lazy"
                        className="w-14 h-14 rounded object-cover flex-shrink-0 border border-gray-100"
                      />
                      <div className="flex-1 min-w-0 pr-2">
                        {isAlbum && (
                          <span className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded mb-0.5">
                            FULL ALBUM
                          </span>
                        )}
                        <h4 className="font-medium text-gray-800 text-sm leading-snug line-clamp-2" title={item.title}>
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                          {item.artist}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1 flex-shrink-0">
                        {isAlbum ? (
                          <>
                            <button
                              type="button"
                              disabled={isLoadingThisAlbum}
                              onClick={() => handlePlayAlbumAction(item)}
                              className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                              title="Play entire album now"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Play</span>
                            </button>
                            <button
                              type="button"
                              disabled={isLoadingThisAlbum}
                              onClick={() => handleAddAlbumToPlaylistAction(item)}
                              className="flex items-center space-x-1 px-2.5 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                              title="Save all album songs to a playlist"
                            >
                              <FolderPlus className="w-3.5 h-3.5" />
                              <span>Playlist</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handlePlayNow(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Play now"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAddToPlaylist(item)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Add to playlist"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Close Button */}
          <div className="p-2 border-t border-gray-100">
            <button
              onClick={() => setShowResults(false)}
              className="w-full py-1.5 text-xs text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Overlay to close results when clicking outside */}
      {showResults && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
};

export default SearchBar;
