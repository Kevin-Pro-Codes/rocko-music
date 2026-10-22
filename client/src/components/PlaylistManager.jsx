import { useState, useEffect } from 'react';
import { Plus, Play, Trash2, Edit2, Save, X, Music, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { playlists } from '../services/api';

const PlaylistManager = ({ onSelectPlaylist, onSelectSong, currentPlaylistId, user }) => {
  const [playlistsList, setPlaylistsList] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [editName, setEditName] = useState('');
  const [expandedPlaylists, setExpandedPlaylists] = useState(new Set());
  const [itemsMap, setItemsMap] = useState({});

  const toggleExpand = (playlistId) => {
    setExpandedPlaylists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playlistId)) {
        newSet.delete(playlistId);
      } else {
        newSet.add(playlistId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (user) loadPlaylists();
  }, [user]);

  const loadPlaylists = async () => {
    try {
      const res = await playlists.getAll();
      setPlaylistsList(res.data);
      res.data.forEach(pl => loadItems(pl.id));
    } catch (err) {
      console.error('Error loading playlists:', err);
    }
  };

  const loadItems = async (playlistId) => {
    try {
      const res = await playlists.getItems(playlistId);
      setItemsMap(prev => ({ ...prev, [playlistId]: res.data }));
    } catch (err) {
      console.error('Error loading items:', err);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      await playlists.create(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreateForm(false);
      loadPlaylists();
    } catch (err) {
      console.error('Error creating playlist:', err);
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    try {
      await playlists.remove(playlistId);
      loadPlaylists();
    } catch (err) {
      console.error('Error deleting playlist:', err);
    }
  };

  const handleSelectPlaylist = (playlist) => {
    onSelectPlaylist?.(playlist, itemsMap[playlist.id] || []);
  };

  const handleSelectSong = (song) => {
    onSelectSong?.(song);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!user) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Playlists</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="p-2 bg-transparent text-black rounded-lg hover:bg-gray-100 transition-colors"
          title="Create Playlist"
        >
          <Plus className="w-5 h-5 text-black" />
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <input
            type="text"
            placeholder="Playlist name"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              onClick={handleCreatePlaylist}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewPlaylistName('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {playlistsList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Music className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No playlists yet</p>
            <p className="text-sm">Create your first playlist to get started</p>
          </div>
        ) : (
          playlistsList.map((playlist) => {
            const items = itemsMap[playlist.id] || [];
            return (
              <div
                key={playlist.id}
                className={`border rounded-lg p-4 transition-all cursor-pointer ${currentPlaylistId === playlist.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex-1"
                    onClick={() => handleSelectPlaylist(playlist)}
                  >
                    <h3 className="font-semibold text-gray-800 mb-1">
                      {playlist.name}
                    </h3>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center text-gray-700">
                        <Music className="w-3 h-3 mr-1" />
                        {items.length} songs
                      </span>
                      <span className="flex items-center text-gray-700">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(playlist.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(playlist.id);
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <div className="space-y-2">
                      {items.slice(0, expandedPlaylists.has(playlist.id) ? items.length : 3).map((song) => (
                        <div
                          key={song.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSong(song);
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {song.title}
                            </p>
                          </div>
                          <Play className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        </div>
                      ))}
                      {items.length > 3 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(playlist.id);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium text-center w-full py-2 mt-1 transition-colors flex items-center justify-center rounded hover:bg-blue-50"
                        >
                          {expandedPlaylists.has(playlist.id) ? (
                            <>Show less <ChevronUp className="w-4 h-4 ml-1" /></>
                          ) : (
                            <>Show {items.length - 3} more songs <ChevronDown className="w-4 h-4 ml-1" /></>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PlaylistManager;
