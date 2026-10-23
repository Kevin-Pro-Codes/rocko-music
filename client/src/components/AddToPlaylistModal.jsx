import { useState, useEffect } from 'react';
import { Plus, Check } from 'lucide-react';
import { playlists } from '../services/api';

const AddToPlaylistModal = ({ song, songs, defaultPlaylistName, isOpen, onClose, onPlaylistUpdated, user }) => {
  const [playlistsList, setPlaylistsList] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const songItems = songs && songs.length > 0 ? songs : (song ? [song] : []);

  useEffect(() => {
    if (isOpen && user) {
      loadPlaylists();
      setSelectedPlaylist('');
      if (defaultPlaylistName) {
        setNewPlaylistName(defaultPlaylistName);
        setShowCreateForm(true);
      } else {
        setNewPlaylistName('');
        setShowCreateForm(false);
      }
    }
  }, [isOpen, user, defaultPlaylistName]);

  const loadPlaylists = async () => {
    try {
      const res = await playlists.getAll();
      setPlaylistsList(res.data);
    } catch (err) {
      console.error('Error loading playlists:', err);
    }
  };

  const handleAddToPlaylist = async () => {
    if (!selectedPlaylist && !showCreateForm) return;
    if (songItems.length === 0) return;

    setIsAdding(true);
    try {
      let playlistId = selectedPlaylist;

      if (showCreateForm && newPlaylistName.trim()) {
        const res = await playlists.create(newPlaylistName.trim());
        playlistId = res.data.id;
      }

      if (playlistId) {
        if (songItems.length === 1) {
          const item = songItems[0];
          await playlists.addItem(playlistId, {
            video_id: item.videoId || item.video_id || item.id,
            title: item.title,
            thumbnail: item.thumbnail,
            duration: item.duration || 0
          });
        } else {
          try {
            await playlists.addBatchItems(playlistId, songItems);
          } catch (batchErr) {
            // Fallback for running instances where batch-items route is not yet active
            if (batchErr.response && batchErr.response.status === 404) {
              for (const item of songItems) {
                await playlists.addItem(playlistId, {
                  video_id: item.videoId || item.video_id || item.id,
                  title: item.title,
                  thumbnail: item.thumbnail,
                  duration: item.duration || 0
                });
              }
            } else {
              throw batchErr;
            }
          }
        }
        onPlaylistUpdated?.(playlistId);
        onClose();
      }
    } catch (err) {
      console.error('Error adding song(s) to playlist:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCreateNewPlaylist = () => {
    setShowCreateForm(true);
    setSelectedPlaylist('');
  };

  const handleSelectExistingPlaylist = (playlistId) => {
    setSelectedPlaylist(playlistId);
    setShowCreateForm(false);
    setNewPlaylistName('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          {songItems.length > 1 ? `Add ${songItems.length} Songs to Playlist` : 'Add to Playlist'}
        </h3>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="font-medium text-gray-800 truncate">
            {defaultPlaylistName || (songItems.length > 1 ? `${songItems.length} songs selected` : songItems[0]?.title)}
          </p>
          {songItems.length > 1 && (
            <p className="text-xs text-gray-500 mt-1">Entire album / artist collection will be saved together</p>
          )}
        </div>

        <div className="space-y-3 mb-4">
          <div className="border rounded-lg p-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="playlist"
                checked={showCreateForm}
                onChange={handleCreateNewPlaylist}
                className="mr-3"
              />
              <div className="flex-1">
                <div className="flex items-center text-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="font-medium">Create new playlist</span>
                </div>
              </div>
            </label>
            
            {showCreateForm && (
              <input
                type="text"
                placeholder="Enter playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            )}
          </div>

          {playlistsList.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Or select existing playlist:</p>
              {playlistsList.map((playlist) => (
                <label
                  key={playlist.id}
                  className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="radio"
                    name="playlist"
                    checked={selectedPlaylist === playlist.id}
                    onChange={() => handleSelectExistingPlaylist(playlist.id)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{playlist.name}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleAddToPlaylist}
            disabled={isAdding || (!selectedPlaylist && (!showCreateForm || !newPlaylistName.trim()))}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isAdding ? 'Adding...' : 'Add to Playlist'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddToPlaylistModal;
