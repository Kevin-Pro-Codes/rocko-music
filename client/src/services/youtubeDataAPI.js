import axios from 'axios';
import { config, searchApi } from './api';

class YouTubeDataAPI {
  constructor() {
    this.apiKey = typeof window !== 'undefined' ? localStorage.getItem('youtubeApiKey') || 'AIzaSyC6GUBpE0xqE_fZRHl3r4G5C8h0dGqwM8g' : null;
    this.baseURL = 'https://www.googleapis.com/youtube/v3';
    this.initFromDatabase();
  }

  async initFromDatabase() {
    try {
      const res = await config.getYoutubeKey();
      if (res.data?.apiKey) {
        this.setApiKey(res.data.apiKey);
      }
    } catch {
      // Fallback to existing or default key if server not reached
    }
  }

  setApiKey(key) {
    this.apiKey = key;
    if (typeof window !== 'undefined' && key) {
      localStorage.setItem('youtubeApiKey', key);
    }
  }

  async searchVideos(query, maxResults = 25) {
    try {
      if (this.apiKey) {
        const response = await axios.get(`${this.baseURL}/search`, {
          params: {
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults: maxResults,
            videoCategoryId: '10', // Music category
            order: 'relevance',
            key: this.apiKey
          }
        });

        return response.data.items.map(item => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          artist: this.extractArtistFromTitle(item.snippet.title),
          thumbnail: item.snippet.thumbnails.medium.url,
          channelTitle: item.snippet.channelTitle,
          description: item.snippet.description
        }));
      }
    } catch (error) {
      console.warn('YouTube Data API failed (falling back to proxy search):', error.response?.status || error.message);
    }

    // Direct proxy search via backend
    try {
      const proxyRes = await searchApi.proxySearch(query, 'songs');
      if (proxyRes.data && proxyRes.data.length > 0) {
        return proxyRes.data;
      }
    } catch (proxyErr) {
      console.warn('Backend proxy search not reachable yet, trying public search API:', proxyErr.message);
    }

    // Direct public music scraper fallback (no quota, works without server restart)
    try {
      const publicRes = await axios.get(`https://pipedapi.kavin.rocks/search`, {
        params: { q: query, filter: 'music_songs' },
        timeout: 4000
      });
      if (publicRes.data && publicRes.data.items && publicRes.data.items.length > 0) {
        return publicRes.data.items.slice(0, maxResults).map(item => ({
          videoId: item.url ? item.url.replace('/watch?v=', '') : item.id,
          title: item.title,
          artist: item.uploaderName || this.extractArtistFromTitle(item.title),
          thumbnail: item.thumbnail || `https://img.youtube.com/vi/${item.url ? item.url.replace('/watch?v=', '') : item.id}/mqdefault.jpg`,
          channelTitle: item.uploaderName
        })).filter(s => s.videoId);
      }
    } catch (extErr) {
      // try iTunes API search as real music fallback
      try {
        const itunesRes = await axios.get(`https://itunes.apple.com/search`, {
          params: { term: query, entity: 'song', limit: maxResults },
          timeout: 4000
        });
        if (itunesRes.data && itunesRes.data.results && itunesRes.data.results.length > 0) {
          return itunesRes.data.results.map(track => ({
            videoId: null, // will search on youtubeService play if needed or title search
            searchQuery: `${track.artistName} - ${track.trackName}`,
            title: track.trackName,
            artist: track.artistName,
            thumbnail: track.artworkUrl100 || track.artworkUrl60,
            channelTitle: track.artistName
          }));
        }
      } catch {
        // continue to mock fallback
      }
    }

    return this.fallbackSearch(query, maxResults);
  }

  // Search albums / full music playlists
  async searchAlbums(query, maxResults = 15) {
    try {
      if (this.apiKey) {
        const response = await axios.get(`${this.baseURL}/search`, {
          params: {
            part: 'snippet',
            q: `${query} album full`,
            type: 'playlist',
            maxResults: maxResults,
            key: this.apiKey
          }
        });

        if (response.data.items && response.data.items.length > 0) {
          return response.data.items.map(item => ({
            id: item.id.playlistId,
            playlistId: item.id.playlistId,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
            description: item.snippet.description
          }));
        }
      }
    } catch (error) {
      console.warn('YouTube searchAlbums API quota failed, using proxy:', error.response?.status || error.message);
    }

    // Proxy search for albums
    try {
      const proxyRes = await searchApi.proxySearch(query, 'albums');
      if (proxyRes.data && proxyRes.data.length > 0) {
        return proxyRes.data;
      }
    } catch (proxyErr) {
      console.error('Proxy albums search failed:', proxyErr);
    }

    return this.fallbackAlbums(query);
  }

  // Get all tracks from a YouTube Playlist / Album
  async getPlaylistTracks(playlistId, maxResults = 50) {
    try {
      if (this.apiKey) {
        const response = await axios.get(`${this.baseURL}/playlistItems`, {
          params: {
            part: 'snippet',
            playlistId: playlistId,
            maxResults: maxResults,
            key: this.apiKey
          }
        });

        if (response.data.items && response.data.items.length > 0) {
          return response.data.items
            .filter(item => item.snippet?.resourceId?.videoId && item.snippet.title !== 'Private video' && item.snippet.title !== 'Deleted video')
            .map(item => ({
              videoId: item.snippet.resourceId.videoId,
              title: item.snippet.title,
              artist: item.snippet.videoOwnerChannelTitle || this.extractArtistFromTitle(item.snippet.title),
              thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
              channelTitle: item.snippet.channelTitle
            }));
        }
      }
    } catch (error) {
      console.warn('YouTube getPlaylistTracks API quota failed, using proxy:', error.response?.status || error.message);
    }

    // Proxy playlist tracks extractor
    try {
      if (playlistId) {
        const proxyRes = await searchApi.getPlaylistTracks(playlistId);
        if (proxyRes.data && proxyRes.data.length > 0) {
          return proxyRes.data;
        }
      }
    } catch (proxyErr) {
      console.warn('Proxy getPlaylistTracks failed:', proxyErr.message);
    }

    // Direct public piped instance fallback for playlist tracks
    try {
      if (playlistId) {
        const pipedRes = await axios.get(`https://pipedapi.kavin.rocks/playlists/${playlistId}`, { timeout: 4000 });
        if (pipedRes.data && pipedRes.data.relatedStreams && pipedRes.data.relatedStreams.length > 0) {
          return pipedRes.data.relatedStreams.map(item => ({
            videoId: item.url ? item.url.replace('/watch?v=', '') : item.id,
            title: item.title,
            artist: item.uploaderName || this.extractArtistFromTitle(item.title),
            thumbnail: item.thumbnail || `https://img.youtube.com/vi/${item.url ? item.url.replace('/watch?v=', '') : item.id}/mqdefault.jpg`,
            channelTitle: item.uploaderName
          })).filter(s => s.videoId);
        }
      }
    } catch {
      // ignore
    }

    return [];
  }

  // Search discography / top songs by artist
  async searchByArtist(artistName, maxResults = 30) {
    try {
      const proxyRes = await searchApi.proxySearch(artistName, 'artist');
      if (proxyRes.data && proxyRes.data.length > 0) {
        return proxyRes.data;
      }
    } catch {
      // fallback to searchVideos
    }
    return this.searchVideos(`${artistName} official audio`, maxResults);
  }

  fallbackAlbums(query) {
    return [
      {
        id: 'PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj',
        playlistId: 'PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj',
        title: `${query || 'Top Hits'} - Full Album Collection`,
        artist: 'Various Artists',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
        description: 'Complete album tracks collection'
      }
    ];
  }

  extractArtistFromTitle(title) {
    // Try to extract artist from title (common formats: "Artist - Song", "Artist: Song", etc.)
    const patterns = [
      /^(.+?)\s[-–—:]\s(.+)$/, // Artist - Song
      /^(.+?)\s[:]\s(.+)$/,     // Artist: Song
      /^(.+?)\s[|]\s(.+)$/,     // Artist | Song
      /^(.+?)\s[•]\s(.+)$/      // Artist • Song
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // If no pattern matches, try to get from common music video formats
    if (title.includes('(Official Video)') || title.includes('(Official Audio)')) {
      const parts = title.split('(')[0].trim();
      const dashMatch = parts.match(/^(.+?)\s[-–—]\s(.+)$/);
      if (dashMatch) {
        return dashMatch[1].trim();
      }
    }

    return 'Unknown Artist';
  }

  async getVideoDetails(videoId) {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await axios.get(`${this.baseURL}/videos`, {
        params: {
          part: 'contentDetails,snippet',
          id: videoId,
          key: this.apiKey
        }
      });

      if (response.data.items.length === 0) {
        return null;
      }

      const video = response.data.items[0];
      return {
        videoId: video.id,
        title: video.snippet.title,
        artist: this.extractArtistFromTitle(video.snippet.title),
        thumbnail: video.snippet.thumbnails.medium.url,
        channelTitle: video.snippet.channelTitle,
        description: video.snippet.description,
        duration: video.contentDetails.duration
      };
    } catch (error) {
      console.error('Error getting video details:', error);
      return null;
    }
  }

  // Fallback search method that doesn't require API key
  async fallbackSearch(query, maxResults = 10) {
    // This is a mock implementation - in production, you'd want to:
    // 1. Use a backend proxy server with your API key
    // 2. Or use a different music API
    // 3. Or implement a serverless function
    
    const mockResults = [
      {
        videoId: 'dQw4w9WgXcQ',
        title: 'Never Gonna Give You Up',
        artist: 'Rick Astley',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
        channelTitle: 'Rick Astley',
        description: 'Official music video'
      },
      {
        videoId: 'kJQP7kiw5Fk',
        title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
        artist: 'Luis Fonsi',
        thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg',
        channelTitle: 'LuisFonsiVEVO',
        description: 'Official music video'
      },
      {
        videoId: '9bZkp7q19f0',
        title: 'PSY - GANGNAM STYLE',
        artist: 'PSY',
        thumbnail: 'https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg',
        channelTitle: 'officialpsy',
        description: 'Official music video'
      },
      {
        videoId: 'fRh_vgS2dFE',
        title: 'Sia - Chandelier',
        artist: 'Sia',
        thumbnail: 'https://img.youtube.com/vi/fRh_vgS2dFE/mqdefault.jpg',
        channelTitle: 'SiaVEVO',
        description: 'Official music video'
      },
      {
        videoId: 'kOkQ4T5WO9E',
        title: 'Ed Sheeran - Shape of You',
        artist: 'Ed Sheeran',
        thumbnail: 'https://img.youtube.com/vi/kOkQ4T5WO9E/mqdefault.jpg',
        channelTitle: 'EdSheeranVEVO',
        description: 'Official music video'
      }
    ];

    // Filter results based on query (simple mock search)
    const filteredResults = mockResults.filter(result => 
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.artist.toLowerCase().includes(query.toLowerCase())
    );

    return filteredResults.length > 0 ? filteredResults : mockResults.slice(0, maxResults);
  }

  // Method to get trending music videos
  async getTrendingMusic(maxResults = 20) {
    if (!this.apiKey) {
      return this.fallbackSearch('music', maxResults);
    }

    try {
      const response = await axios.get(`${this.baseURL}/videos`, {
        params: {
          part: 'snippet,contentDetails',
          chart: 'mostPopular',
          regionCode: 'US',
          videoCategoryId: '10',
          maxResults: maxResults,
          key: this.apiKey
        }
      });

      return response.data.items.map(item => ({
        videoId: item.id,
        title: item.snippet.title,
        artist: this.extractArtistFromTitle(item.snippet.title),
        thumbnail: item.snippet.thumbnails.medium.url,
        channelTitle: item.snippet.channelTitle,
        description: item.snippet.description
      }));
    } catch (error) {
      console.error('Error getting trending music:', error);
      return this.fallbackSearch('trending music', maxResults);
    }
  }
}

export default new YouTubeDataAPI();
