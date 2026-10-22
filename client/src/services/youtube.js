class YouTubeService {
  constructor() {
    this.player = null;
    this.isReady = false;
    this.onReadyCallbacks = [];
    this.onStateChangeCallbacks = [];
    this.apiLoading = false;
    this.apiLoaded = false;
  }

  loadYouTubeAPI() {
    return new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }

      if (this.apiLoading) {
        const checkInterval = setInterval(() => {
          if (window.YT && window.YT.Player) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('YouTube API failed to load'));
        }, 10000);
        return;
      }

      this.apiLoading = true;

      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (existingScript) {
        existingScript.remove();
      }

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        this.apiLoaded = true;
        this.apiLoading = false;
        if (previousCallback && typeof previousCallback === 'function') {
          previousCallback();
        }
        resolve();
      };

      setTimeout(() => {
        if (!this.apiLoaded) {
          this.apiLoading = false;
          reject(new Error('YouTube API failed to load'));
        }
      }, 10000);
    });
  }

  createPlayer(elementId, options = {}) {
    return new Promise((resolve, reject) => {
      if (this.player && typeof this.player.destroy === 'function') {
        this.player.destroy();
        this.player = null;
        this.isReady = false;
      }

      this.loadYouTubeAPI().then(() => {
        const defaultOptions = {
          height: '200',
          width: '200',
          playerVars: {
            autoplay: 0,
            controls: 0,
            rel: 0,
            showinfo: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            disablekb: 1,
            enablejsapi: 1,
            playsinline: 1
          },
          events: {
            onReady: (event) => {
              this.player = event.target;
              this.isReady = true;
              this.onReadyCallbacks.forEach(callback => callback(this.player));
              this.onReadyCallbacks = [];
              resolve(this.player);
            },
            onStateChange: this.onPlayerStateChange.bind(this),
            onError: (event) => {
              console.warn('YouTube player warning/error:', event.data);
            }
          }
        };

        const playerOptions = {
          ...defaultOptions,
          ...options,
          playerVars: {
            ...defaultOptions.playerVars,
            ...(options.playerVars || {})
          }
        };
        this.player = new window.YT.Player(elementId, playerOptions);
      }).catch(reject);
    });
  }

  onPlayerStateChange(event) {
    const states = {
      '-1': 'unstarted',
      '0': 'ended',
      '1': 'playing',
      '2': 'paused',
      '3': 'buffering',
      '5': 'cued'
    };

    const state = states[event.data];
    console.log('[YouTube State]', event.data, state);
    if (event.data === window.YT?.PlayerState?.CUED) {
      try {
        event.target.playVideo();
      } catch (e) {
        console.warn('Auto-play cued video error:', e);
      }
    }
    this.onStateChangeCallbacks?.forEach(callback => callback(state, event));
  }

  playVideo(videoId) {
    if (!this.player || !this.isReady) {
      console.error('Player not ready');
      return;
    }
    try {
      if (typeof this.player.unMute === 'function') {
        this.player.unMute();
      }
      if (videoId) {
        console.log('Loading and playing video:', videoId);
        if (typeof this.player.loadVideoById === 'function') {
          this.player.loadVideoById({
            videoId: videoId,
            suggestedQuality: 'small'
          });
        }
      } else {
        this.player.playVideo();
      }
    } catch (err) {
      console.error('Error playing video:', err);
    }
  }

  pauseVideo() {
    if (this.player && this.isReady) {
      this.player.pauseVideo();
    }
  }

  stopVideo() {
    if (this.player && this.isReady) {
      this.player.stopVideo();
    }
  }

  nextVideo() {
    if (this.player && this.isReady) {
      this.player.nextVideo();
    }
  }

  previousVideo() {
    if (this.player && this.isReady) {
      this.player.previousVideo();
    }
  }

  setVolume(volume) {
    if (this.player && this.isReady) {
      this.player.setVolume(volume);
    }
  }

  getVolume() {
    if (this.player && this.isReady) {
      return this.player.getVolume();
    }
    return 0;
  }

  getCurrentTime() {
    if (this.player && this.isReady) {
      return this.player.getCurrentTime();
    }
    return 0;
  }

  getDuration() {
    if (this.player && this.isReady) {
      return this.player.getDuration();
    }
    return 0;
  }

  getPlayerState() {
    if (this.player && this.isReady) {
      return this.player.getPlayerState();
    }
    return -1;
  }

  async searchVideos(query, maxResults = 10) {
    const { default: youtubeDataAPI } = await import('./youtubeDataAPI.js');
    return youtubeDataAPI.searchVideos(query, maxResults);
  }

  onReady(callback) {
    if (this.isReady && this.player) {
      callback(this.player);
    } else {
      this.onReadyCallbacks.push(callback);
    }
  }

  onStateChange(callback) {
    if (!this.onStateChangeCallbacks) {
      this.onStateChangeCallbacks = [];
    }
    this.onStateChangeCallbacks.push(callback);
  }

  destroy() {
    if (this.player && typeof this.player.destroy === 'function') {
      this.player.destroy();
    }
    this.player = null;
    this.isReady = false;
    this.onReadyCallbacks = [];
    this.onStateChangeCallbacks = [];
  }
}

export default new YouTubeService();
