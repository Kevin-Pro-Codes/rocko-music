class PlaylistService {
  constructor() {
    this.playlists = this.loadPlaylists();
    this.currentPlaylist = null;
  }

  loadPlaylists() {
    try {
      const stored = localStorage.getItem('musicPlaylists');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading playlists:', error);
      return [];
    }
  }

  savePlaylists() {
    try {
      localStorage.setItem('musicPlaylists', JSON.stringify(this.playlists));
    } catch (error) {
      console.error('Error saving playlists:', error);
    }
  }

  createPlaylist(name, description = '') {
    const playlist = {
      id: Date.now().toString(),
      name,
      description,
      songs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.playlists.push(playlist);
    this.savePlaylists();
    return playlist;
  }

  getPlaylist(id) {
    return this.playlists.find(playlist => playlist.id === id);
  }

  getAllPlaylists() {
    return this.playlists;
  }

  updatePlaylist(id, updates) {
    const playlistIndex = this.playlists.findIndex(playlist => playlist.id === id);
    if (playlistIndex !== -1) {
      this.playlists[playlistIndex] = {
        ...this.playlists[playlistIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.savePlaylists();
      return this.playlists[playlistIndex];
    }
    return null;
  }

  deletePlaylist(id) {
    const playlistIndex = this.playlists.findIndex(playlist => playlist.id === id);
    if (playlistIndex !== -1) {
      const deleted = this.playlists.splice(playlistIndex, 1)[0];
      this.savePlaylists();
      if (this.currentPlaylist?.id === id) {
        this.currentPlaylist = null;
      }
      return deleted;
    }
    return null;
  }

  addSongToPlaylist(playlistId, song) {
    const playlist = this.getPlaylist(playlistId);
    if (playlist) {
      const songWithId = {
        ...song,
        id: Date.now().toString(),
        addedAt: new Date().toISOString()
      };
      
      // Check if song already exists
      const exists = playlist.songs.some(s => s.videoId === song.videoId);
      if (!exists) {
        playlist.songs.push(songWithId);
        playlist.updatedAt = new Date().toISOString();
        this.savePlaylists();
        return songWithId;
      }
    }
    return null;
  }

  removeSongFromPlaylist(playlistId, songId) {
    const playlist = this.getPlaylist(playlistId);
    if (playlist) {
      const songIndex = playlist.songs.findIndex(song => song.id === songId);
      if (songIndex !== -1) {
        const removed = playlist.songs.splice(songIndex, 1)[0];
        playlist.updatedAt = new Date().toISOString();
        this.savePlaylists();
        return removed;
      }
    }
    return null;
  }

  reorderSongs(playlistId, fromIndex, toIndex) {
    const playlist = this.getPlaylist(playlistId);
    if (playlist) {
      const [movedSong] = playlist.songs.splice(fromIndex, 1);
      playlist.songs.splice(toIndex, 0, movedSong);
      playlist.updatedAt = new Date().toISOString();
      this.savePlaylists();
      return true;
    }
    return false;
  }

  setCurrentPlaylist(playlistId) {
    this.currentPlaylist = this.getPlaylist(playlistId);
    return this.currentPlaylist;
  }

  getCurrentPlaylist() {
    return this.currentPlaylist;
  }

  searchPlaylists(query) {
    const lowercaseQuery = query.toLowerCase();
    return this.playlists.filter(playlist => 
      playlist.name.toLowerCase().includes(lowercaseQuery) ||
      playlist.description.toLowerCase().includes(lowercaseQuery)
    );
  }

  exportPlaylist(playlistId) {
    const playlist = this.getPlaylist(playlistId);
    if (playlist) {
      return JSON.stringify(playlist, null, 2);
    }
    return null;
  }

  importPlaylist(playlistData) {
    try {
      const playlist = typeof playlistData === 'string' ? JSON.parse(playlistData) : playlistData;
      
      // Generate new ID to avoid conflicts
      const importedPlaylist = {
        ...playlist,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      this.playlists.push(importedPlaylist);
      this.savePlaylists();
      return importedPlaylist;
    } catch (error) {
      console.error('Error importing playlist:', error);
      return null;
    }
  }
}

export default new PlaylistService();
