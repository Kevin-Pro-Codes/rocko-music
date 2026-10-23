import { useState, useEffect } from 'react';
import { Plus, Play, Trash2, Edit2, Check, X, Music, Clock, ChevronDown, ChevronUp, FolderPlus } from 'lucide-react';
import { playlists } from '../services/api';

const PlaylistManager = ({ onSelectPlaylist, onSelectSong, onMergePlaylist, onAddSongToPlaylist, currentPlaylistId, user, onPlaylistMutated }) => {
  const [playlistsList, setPlaylistsList] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
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
      return res.data;
    } catch (err) {
      console.error('Error loading items:', err);
      return [];
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      await playlists.create(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreateForm(false);
      loadPlaylists();
      onPlaylistMutated?.();
    } catch (err) {
      console.error('Error creating playlist:', err);
    }
  };

  const startEditing = (playlist, e) => {
    e.stopPropagation();
    setEditingPlaylistId(playlist.id);
    setEditName(playlist.name);
  };

  const cancelEditing = (e) => {
    e?.stopPropagation();
    setEditingPlaylistId(null);
    setEditName('');
  };

  const handleSaveRename = async (playlistId, e) => {
    e?.stopPropagation();
    if (!editName.trim()) return;
    try {
      await playlists.update(playlistId, editName.trim());
      setEditingPlaylistId(null);
      await loadPlaylists();
      onPlaylistMutated?.();
    } catch (err) {
      console.error('Error renaming playlist:', err);
      alert('Failed to rename playlist');
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    try {
      await playlists.remove(playlistId);
      loadPlaylists();
      onPlaylistMutated?.();
    } catch (err) {
      console.error('Error deleting playlist:', err);
    }
  };

  const handleRemoveSongFromPlaylist = async (playlistId, itemId, e) => {
    e.stopPropagation();
    try {
      await playlists.removeItem(playlistId, itemId);
      const updatedItems = await loadItems(playlistId);
      onPlaylistMutated?.(playlistId, updatedItems);
    } catch (err) {
      console.error('Error removing song from playlist:', err);
    }
  };

  const handleSelectPlaylist = (playlist) => {
    onSelectPlaylist?.(playlist, itemsMap[playlist.id] || []);
  };

  const handleSelectSong = (song, playlist) => {
    onSelectSong?.(song, playlist, itemsMap[playlist?.id] || []);
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreatePlaylist();
              if (e.key === 'Escape') setShowCreateForm(false);
            }}
            className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              onClick={handleCreatePlaylist}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewPlaylistName('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
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
            const isEditingThis = editingPlaylistId === playlist.id;

            return (
              <div
                key={playlist.id}
                className={`border rounded-lg p-4 transition-all ${
                  currentPlaylistId === playlist.id
                    ? 'border-blue-500 bg-blue-50/40'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => !isEditingThis && handleSelectPlaylist(playlist)}
                  >
                    {isEditingThis ? (
                      <div className="flex items-center space-x-2 mr-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(playlist.id, e);
                            if (e.key === 'Escape') cancelEditing(e);
                          }}
                          className="px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                          autoFocus
                        />
                        <button
                          onClick={(e) => handleSaveRename(playlist.id, e)}
                          className="p-1 text-green-600 hover:bg-green-100 rounded"
                          title="Save Name"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1 text-gray-500 hover:bg-gray-200 rounded"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center group">
                        <h3 className="font-semibold text-gray-800 text-base truncate" title={playlist.name}>
                          {playlist.name}
                        </h3>
                        <button
                          onClick={(e) => startEditing(playlist, e)}
                          className="ml-2 p-1 text-gray-400 hover:text-blue-600 rounded transition-colors opacity-70 hover:opacity-100"
                          title="Edit playlist name"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center space-x-4 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center text-gray-700">
                        <Music className="w-3 h-3 mr-1 text-gray-400" />
                        {items.length} {items.length === 1 ? 'song' : 'songs'}
                      </span>
                      <span className="flex items-center text-gray-500">
                        <Clock className="w-3 h-3 mr-1 text-gray-400" />
                        {formatDate(playlist.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                    {items.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMergePlaylist?.(playlist, items);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        title="Copy / merge entire playlist"
                      >
                        <FolderPlus className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(playlist.id);
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="border-t border-gray-100 pt-2.5 mt-2.5">
                    <div className="space-y-1.5">
                      {items.slice(0, expandedPlaylists.has(playlist.id) ? items.length : 3).map((song) => (
                        <div
                          key={song.id}
                          className="flex items-center justify-between p-2 hover:bg-white rounded-md cursor-pointer group transition-colors border border-transparent hover:border-gray-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSong(song, playlist);
                          }}
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <p
                              className="text-sm font-medium text-gray-800 truncate"
                              title={song.title}
                            >
                              {song.title}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3 flex-shrink-0">
                            <button
                              type="button"
                              className="p-1 hover:bg-blue-50 text-blue-600 rounded transition-colors"
                              title="Play song"
                            >
                              <Play className="w-4 h-4 opacity-80 group-hover:opacity-100" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleRemoveSongFromPlaylist(playlist.id, song.id, e)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Remove song from playlist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {items.length > 3 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(playlist.id);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium text-center w-full py-1.5 mt-1 transition-colors flex items-center justify-center rounded hover:bg-blue-50"
                        >
                          {expandedPlaylists.has(playlist.id) ? (
                            <>Show less <ChevronUp className="w-3.5 h-3.5 ml-1" /></>
                          ) : (
                            <>Show {items.length - 3} more songs <ChevronDown className="w-3.5 h-3.5 ml-1" /></>
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
