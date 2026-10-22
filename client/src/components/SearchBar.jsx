import { useState, useEffect } from 'react';
import { Search, Plus, Play, AlertCircle } from 'lucide-react';
import youtubeService from '../services/youtube';
import youtubeDataAPI from '../services/youtubeDataAPI';

const SearchBar = ({ onAddToPlaylist, onPlayNow }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
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

  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await youtubeDataAPI.searchVideos(searchQuery, 25);
      setResults(searchResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleAddToPlaylist = (song) => {
    onAddToPlaylist?.(song);
  };

  const handlePlayNow = (song) => {
    onPlayNow?.(song);
    setShowResults(false);
    setQuery('');
  };

  return (
    <div className="relative">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search for music..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            onFocus={() => query && setShowResults(true)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </form>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {isSearching ? 'Searching...' : 'No results found'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((song, index) => (
                <div
                  key={`${song.videoId}-${index}`}
                  className="p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {/* Thumbnail */}
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-16 h-16 rounded object-cover flex-shrink-0"
                    />
                    
                    {/* Song Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 truncate">
                        {song.title}
                      </h4>
                      <p className="text-sm text-gray-600 truncate">
                        {song.artist}
                      </p>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        onClick={() => handlePlayNow(song)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Play now"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAddToPlaylist(song)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Add to playlist"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Close Button */}
          <div className="p-2 border-t border-gray-100">
            <button
              onClick={() => setShowResults(false)}
              className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
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
