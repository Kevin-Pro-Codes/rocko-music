import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const auth = {
  register: (data) => api.post('/register', data),
  login: (data) => api.post('/login', data),
};

export const playlists = {
  getAll: () => api.get('/playlists'),
  create: (name) => api.post('/playlists', { name }),
  update: (id, name) => api.put(`/playlists/${id}`, { name }),
  remove: (id) => api.delete(`/playlists/${id}`),
  getItems: (id) => api.get(`/playlists/${id}/items`),
  addItem: (id, item) => api.post(`/playlists/${id}/items`, item),
  addBatchItems: (id, items) => api.post(`/playlists/${id}/batch-items`, { items }),
  removeItem: (playlistId, itemId) => api.delete(`/playlists/${playlistId}/items/${itemId}`),
};

export const config = {
  getYoutubeKey: () => api.get('/config/youtube-key'),
  setYoutubeKey: (apiKey) => api.post('/config/youtube-key', { apiKey }),
};

export const searchApi = {
  proxySearch: (query, type) => api.get('/search/proxy', { params: { q: query, type } }),
  getPlaylistTracks: (playlistId) => api.get('/search/playlist-tracks', { params: { playlistId } }),
  getVideoDetails: (videoId) => api.get('/search/video-details', { params: { videoId } }),
};

export default api;
