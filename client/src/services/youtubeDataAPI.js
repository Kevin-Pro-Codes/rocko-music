import axios from 'axios';
import { config } from './api';

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
    if (!this.apiKey) {
      await this.initFromDatabase();
    }
    if (!this.apiKey) {
      console.warn('No YouTube Data API key provided. Using fallback search method.');
      return this.fallbackSearch(query, maxResults);
    }

    try {
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

      const videos = response.data.items.map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        artist: this.extractArtistFromTitle(item.snippet.title),
        thumbnail: item.snippet.thumbnails.medium.url,
        channelTitle: item.snippet.channelTitle,
        description: item.snippet.description
      }));

      return videos;
    } catch (error) {
      console.error('YouTube Data API error:', error);
      return this.fallbackSearch(query, maxResults);
    }
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
